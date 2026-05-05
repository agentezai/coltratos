# pdf-ingestion — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Upload orchestrator | The `pliego-upload` spec — owns the upload form, persists the `pliego_uploads` row, and enqueues a pgmq message containing `pliego_upload_id`. |
| Queue consumer | The pgmq consumer process running in the off-Vercel worker container. Pulls messages and invokes `processPliegoUpload(pliego_upload_id)`. |
| pdf-ingestion worker | The worker under spec. Side-effectful at entrypoint; the inner pipeline (`lib/ingestion/`) is pure. |
| Test runner | CI process executing the corpus acceptance test, the idempotency test, and the vitest benchmark. |

---

## User Stories

### US-01 — Page-aware ingestion of an uploaded pliego

**As an** Upload orchestrator
**I want** an uploaded pliego to be processed end-to-end (storage fetch → text + OCR + tables → per-page writeback) by a queue-fed worker
**So that** downstream `requisitos-extraction` can consume the per-page text and tables without ever touching the PDF directly

### US-02 — Typed, recoverable failure surface

**As an** Upload orchestrator
**I want** unparseable PDFs to surface as `pliego_uploads.ingestion_status = 'failed'` with a controlled `ingestion_failure_reason`
**So that** the user-facing UI can render a localized actionable message without the upload flow being blocked on the worker

### US-04 — Verifiable correctness on real pliegos

**As a** Maintainer
**I want** CI to validate ingestion against a 20-pliego labeled corpus and a 200-page benchmark
**So that** algorithm changes can't silently regress page-failure rate above 5% or p95 above 2 minutes

---

## Use Case Scenarios

### UC-01 — Ingest a clean SECOP-II pliego (page-aware output) (US-01)

**Preconditions:** A `pliego_uploads` row exists with `ingestion_status = 'pending'`, `file_sha256` matches a Supabase Storage object at `companies/<company_id>/pliegos/<sha256>.pdf`, and a pgmq message containing `pliego_upload_id` has been enqueued.

#### Main Scenario

1. Queue consumer dequeues the message and invokes `processPliegoUpload(pliego_upload_id)`.
2. Worker checks `pliego_uploads.ingestion_status` (per REQ-019 (c)) — `pending`, so processing proceeds.
3. Worker transitions status to `running` (`markRunning`), sets `ingestion_started_at = now()`.
4. Worker fetches the PDF from Supabase Storage at the per-tenant prefix.
5. Worker invokes the inner pipeline (`lib/ingestion/`): per-page text extraction → OCR fallback for sub-threshold pages → library-based table extraction → assembled `IngestionResult { schema_version, pages: Page[] }`.
6. Worker writes one row per page into `pdf_pages` via `writePages` (idempotent upsert on `(pliego_upload_id, page_number)`).
7. Worker transitions status to `completed` (`markCompleted`), sets `ingestion_completed_at = now()`.
8. Worker acks the queue message.

#### Alternative Scenarios

**5a. One page is image-only (sub-threshold text-layer extraction)**
The inner pipeline runs Tesseract for that page; `extraction_method = 'ocr'`, `confidence` populated. See UC-05.

**5b. One page contains a 3-column table**
The inner pipeline runs pdfplumber via subprocess; `tables` JSONB row arrays populated for that page. See UC-06.

**5c. One page yields no extractable content (text-layer empty AND OCR yields nothing)**
The page surfaces with `text = ''`, `extraction_method = 'empty'`, `flags = ['no_text_extracted']` — never silently dropped. See UC-07.

#### Error Scenarios

**4e. Storage object missing or inaccessible**
Worker raises `StorageFetchFailedError`; transitions status to `failed` with `ingestion_failure_reason = 'unknown'`. Inner pipeline never runs.

**5e. PDF malformed / encrypted / empty**
See UC-02.

**Postconditions:** `pliego_uploads.ingestion_status = 'completed'`. `pdf_pages` contains one row per PDF page, contiguous from 1, none silently dropped.

---

### UC-02 — Surface unparseable PDFs as typed errors (US-02)

**Preconditions:** A `pliego_uploads` row points at a file in storage that is one of: encrypted (password-protected), malformed (not a valid PDF), or zero-page.

#### Main Scenario

1. Queue consumer invokes `processPliegoUpload(pliego_upload_id)`.
2. Worker fetches the PDF and runs the inner pipeline.
3. The inner pipeline rejects with one of:
   - `EncryptedPdfError` (`code: 'ENCRYPTED'`) → worker maps to `ingestion_failure_reason = 'encrypted_pdf'`.
   - `MalformedPdfError` (`code: 'MALFORMED'`) → worker maps to `ingestion_failure_reason = 'pdf_unreadable'`.
   - `EmptyPdfError` (`code: 'EMPTY'`) → worker maps to `ingestion_failure_reason = 'pdf_unreadable'`.
4. Worker transitions status to `failed`, sets `ingestion_failure_reason` from the controlled vocabulary, sets `ingestion_completed_at = now()`.
5. Worker acks the queue message — these errors are not retryable. The user-facing UI reads the failure reason and renders a localized message.

#### Error Scenarios

**3e. `pdf-parse` throws an unexpected error not in the discriminated set**
Inner pipeline wraps it in `MalformedPdfError` with the original error attached as `cause`. Worker maps to `ingestion_failure_reason = 'pdf_unreadable'`. Raw pdf-parse exceptions never leak.

**Postconditions:** No partial state in `pdf_pages`. The status row carries enough information for the UI to render an actionable message.

---

### UC-04 — Validate against a labeled corpus (N=20 + page-failure-rate metric) (US-04)

**Preconditions:** 20 real Colombian pliego PDFs in `tests/fixtures/pliegos/` with a `corpus.yaml` manifest; per-pliego golden sketches under `tests/golden/pages/`.

#### Main Scenario

1. CI runs `npm run test`.
2. The acceptance test iterates each fixture, invokes `processPliegoUpload` against a test repository (in-memory or local Supabase), and compares produced `pdf_pages` rows against the golden sketches.
3. The test computes the **aggregate page-failure rate** = (count of pages flagged with any of `'no_text_extracted' | 'ocr_low_confidence' | 'table_parse_failed'`) / (total pages across corpus).
4. The test asserts page-failure rate < 0.05 (REQ-021); CI fails otherwise.
5. The vitest benchmark runs each fixture ≤200 pages ≥10 times and asserts p95 < 120000ms (REQ-022).
6. A separate documented manual review pass (REQ-023) scores extracted-table fidelity on 5 sampled pliegos; result captured in `tests/fixtures/pliegos/table-review.md`.

#### Error Scenarios

**4e. Page-failure rate exceeds 5% after a code change**
CI fails. Maintainer either fixes the algorithm or, if the corpus is wrong, follows `/nybo-plan edit pdf-ingestion` to revise (which requires human approval).

**Postconditions:** Algorithm quality is gated by CI; regressions cannot land silently.

---

### UC-05 — Scanned pliego falls through to OCR successfully (US-01)

**Preconditions:** A pliego PDF where one or more pages are image-only scans (text-layer extraction yields fewer than `OCR_TRIGGER_THRESHOLD = 50` chars).

#### Main Scenario

1. Worker runs the inner pipeline.
2. For the affected page, text-layer extraction yields sub-threshold text.
3. The inner pipeline rasterizes the page and runs Tesseract with the Spanish lang pack (`spa`).
4. OCR returns text + confidence; pipeline writes `extraction_method = 'ocr'`, `text = <ocr-text>`, `confidence = <0..1 normalized>`.
5. If `confidence < OCR_LOW_CONFIDENCE_THRESHOLD = 0.5`, append the `'ocr_low_confidence'` flag (page is not failed — flagged for downstream review).
6. Worker writeback proceeds normally.

#### Error Scenarios

**3e. Tesseract exceeds timeout or process fails**
Inner pipeline raises `OcrFailedError`; worker maps to `ingestion_failure_reason = 'ocr_timeout'` and fails the whole ingestion (status = `failed`). This is a coarse failure — partial-page recovery is not in MVP scope.

**Postconditions:** OCR'd pages are indistinguishable to downstream consumers from text-layer pages except for `extraction_method` and `confidence`.

---

### UC-06 — Multi-column tables parsed into structured rows (US-01)

**Preconditions:** A pliego PDF with at least one 2-column or 3-column table (e.g. financial-indicators table, equipo-clave table).

#### Main Scenario

1. Worker runs the inner pipeline.
2. For each page, the pipeline invokes pdfplumber via subprocess (per ADR-008).
3. pdfplumber returns structured row arrays per detected table.
4. The pipeline serializes each table as `{ rows: string[][] }` and appends to the page's `tables` array.
5. Writeback persists `tables` as JSONB on `pdf_pages.tables`.

#### Error Scenarios

**3e. pdfplumber subprocess fails for a single page**
Inner pipeline catches the per-page failure, sets `'table_parse_failed'` flag on that page, and proceeds. The whole ingestion does not fail on a per-page table issue (REQ-016).

**Postconditions:** Table data is queryable per-page from `pdf_pages.tables`. Manual table-quality review (REQ-023) verifies row/column fidelity on 5 sampled pliegos.

---

### UC-07 — Unreadable page surfaces flag without dropping (US-02)

**Preconditions:** A pliego PDF where one page yields zero text from text-layer extraction AND OCR also yields nothing (e.g. blank page, fully-redacted page, irrecoverable scan).

#### Main Scenario

1. Worker runs the inner pipeline.
2. For the affected page, text-layer yields 0 chars; OCR also yields 0 chars (or sub-confidence-threshold OCR with no characters).
3. The pipeline emits the page with `text = ''`, `extraction_method = 'empty'`, `flags = ['no_text_extracted']`, `confidence = null`.
4. Page contiguity is preserved — the page is NOT skipped in the array.
5. Writeback persists the row in `pdf_pages` per REQ-017 / `domain-model-mvp` RN-017.

#### Error Scenarios

None unique to this use case — partial unreadability is a flag, not an error.

**Postconditions:** Downstream consumers see all pages and can branch on `flags` to decide whether to surface a warning to the user. The whole ingestion succeeds (`ingestion_status = 'completed'`).

---

## UX/UI References

No UI in this feature. See [spec.md § UX/UI](./spec.md#uxui).
