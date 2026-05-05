# TDD Contract: pdf-ingestion

This is the Markdown TDD guide for `nybo-run`. The Executor Agent reads each behavior, writes a failing test (Red), implements (Green), then refactors. Framework is **vitest**.

The contract spans the inner pipeline (`lib/ingestion/`) and the worker (`src/services/ingestion-worker/`). T8 is the idempotent-writeback contract — its assertions are spelled out verbatim per REQ-019.

---

## Task T1: Types and Error Hierarchy

### Behavior: PdfIngestionError subclasses are discriminable (REQ-010, RN-006)

**Given** the seven error subclasses imported from `lib/ingestion/errors`
**When** an instance of each is created
**Then** each `instanceof PdfIngestionError` returns `true` AND each has a unique `code` literal: `NO_TEXT_LAYER`, `ENCRYPTED`, `EMPTY`, `MALFORMED`, `OCR_FAILED`, `TABLE_PARSE_FAILED`, `STORAGE_FETCH_FAILED`

**Test file:** `lib/ingestion/__tests__/errors.test.ts`
**Framework:** vitest

---

### Behavior: IngestionResult / Page / TableJson types match domain-model-mvp shape (REQ-024, RN-008)

**Given** the `IngestionResult` and `Page` types re-exported from `@/types`
**When** a value is constructed with `schema_version: '1.0'` and a `pages: Page[]` array whose entries have `page_number: int >= 1`, `text: string`, `tables: TableJson[]`, `extraction_method: 'text_layer'|'ocr'|'table_parser'|'empty'`, `confidence: number|null`, `flags: PageFlag[]`
**Then** TypeScript accepts it AND the type-test asserts page_number is 1-indexed (positive integer)

**Test file:** `src/types/__tests__/ingestion-result.test-d.ts`
**Framework:** vitest (`expectTypeOf`)

---

## Task T2: Storage Fetch

### Behavior: Storage fetch by id resolves to per-tenant prefix (REQ-018)

**Given** a `pliego_upload_id` whose `pliego_uploads` row has `uploaded_by_company_id = C` and `file_sha256 = H`
**When** `fetchPliegoBuffer(id)` is called against a stub storage client
**Then** the client receives a `download` call with key `companies/C/pliegos/H.pdf` and the returned buffer hashes back to `H`

**Test file:** `src/services/ingestion-worker/__tests__/fetch.test.ts`
**Framework:** vitest

---

### Behavior: Storage fetch failure raises StorageFetchFailedError (REQ-018)

**Given** a stub storage client that returns a 404
**When** `fetchPliegoBuffer(id)` is awaited
**Then** it rejects with `StorageFetchFailedError` whose `code === 'STORAGE_FETCH_FAILED'` and `cause` is the original storage error

**Test file:** `src/services/ingestion-worker/__tests__/fetch.test.ts`
**Framework:** vitest

---

## Task T3: PDF Text Extractor

### Behavior: Per-page text preserved (REQ-014, RN-014)

**Given** a 3-page PDF buffer where each page has distinct content
**When** `extractText(buffer)` resolves
**Then** the result is an array of length 3 with `page_number` `[1, 2, 3]` and corresponding `text`

**Test file:** `lib/ingestion/__tests__/extract-text.test.ts`
**Framework:** vitest

---

### Behavior: Encrypted PDF maps to EncryptedPdfError (REQ-007, RN-006)

**Given** a password-protected PDF buffer
**When** `extractText(buffer)` is awaited
**Then** it rejects with `EncryptedPdfError` whose `code === 'ENCRYPTED'` and `cause` is the original pdf-parse error

**Test file:** `lib/ingestion/__tests__/extract-text.test.ts`
**Framework:** vitest

---

### Behavior: Sub-threshold text on a page → triggers OCR (does not throw) (REQ-008, REQ-015, RN-009)

**Given** a PDF where page 2's text-layer yields < `OCR_TRIGGER_THRESHOLD` (50 chars)
**When** the page is processed by the inner pipeline (with a stub OCR runner)
**Then** the pipeline invokes the OCR runner for page 2 (asserted via spy) — no error thrown — and the resulting Page has `extraction_method = 'ocr'`

**Test file:** `lib/ingestion/__tests__/ocr-fallback.test.ts`
**Framework:** vitest

---

### Behavior: Malformed bytes → MalformedPdfError (REQ-009, REQ-010)

**Given** `Buffer.from('not a pdf')`
**When** `extractText(buffer)` is awaited
**Then** it rejects with `MalformedPdfError` (NOT a raw pdf-parse exception)

**Test file:** `lib/ingestion/__tests__/extract-text.test.ts`
**Framework:** vitest

---

## Task T4: OCR Fallback (Tesseract, Spanish)

### Behavior: OCR runs on sub-threshold page with Spanish lang pack (REQ-008, REQ-015, RN-015)

**Given** an image-only page rasterized to a PNG buffer
**When** `runOcr(buffer)` is called
**Then** the underlying Tesseract invocation receives `lang: 'spa'` (asserted via spy on the Tesseract wrapper); the result is `{ text: string, confidence: number (0..1) }`

**Test file:** `lib/ingestion/__tests__/ocr.test.ts`
**Framework:** vitest

---

### Behavior: OCR low-confidence flag (RN-015)

**Given** a Tesseract result with confidence `0.3`
**When** the inner pipeline assembles the Page
**Then** the Page has `confidence = 0.3` AND `flags` includes `'ocr_low_confidence'` AND the page is NOT failed (still surfaces as a complete page)

**Test file:** `lib/ingestion/__tests__/ocr.test.ts`
**Framework:** vitest

---

### Behavior: OCR failure raises OcrFailedError (REQ-015)

**Given** a Tesseract invocation that throws or times out
**When** `runOcr(buffer)` is awaited
**Then** it rejects with `OcrFailedError` whose `code === 'OCR_FAILED'`; the worker (T8) maps this to `ingestion_failure_reason = 'ocr_timeout'`

**Test file:** `lib/ingestion/__tests__/ocr.test.ts`
**Framework:** vitest

---

## Task T5: Table Extractor (pdfplumber via subprocess)

### Behavior: 2-column table parsed into row arrays (REQ-016)

**Given** a synthetic single-page PDF with a 2-column table of 3 rows
**When** `extractTables(buffer, page_number=1)` resolves
**Then** the result is `[{ rows: [[col1, col2], [col1, col2], [col1, col2]] }]` (one TableJson, three rows of width 2)

**Test file:** `lib/ingestion/__tests__/tables.test.ts`
**Framework:** vitest

---

### Behavior: 3-column table parsed correctly (REQ-016)

**Given** a synthetic single-page PDF with a 3-column financial-indicators table
**When** `extractTables(buffer, 1)` resolves
**Then** the resulting TableJson rows all have width 3

**Test file:** `lib/ingestion/__tests__/tables.test.ts`
**Framework:** vitest

---

### Behavior: Table parse failure flags page, does not fail ingestion (REQ-016)

**Given** a stub pdfplumber subprocess that returns a non-zero exit for one page
**When** the inner pipeline assembles that page
**Then** the Page has `flags` including `'table_parse_failed'`, `tables: []`, and the rest of ingestion proceeds normally

**Test file:** `lib/ingestion/__tests__/tables.test.ts`
**Framework:** vitest

---

## Task T6: Page Assembler

### Behavior: Page contiguity invariant (REQ-014, RN-014)

**Given** a 5-page input where page 4 yields no text and OCR also yields nothing
**When** the assembler builds the `IngestionResult`
**Then** `pages` has length 5, `page_number` is `[1, 2, 3, 4, 5]`, and the page-4 row has `text: ''`, `extraction_method: 'empty'`, `flags: ['no_text_extracted']`. **Page 4 is NOT silently dropped.**

**Test file:** `lib/ingestion/__tests__/assemble.test.ts`
**Framework:** vitest

---

### Behavior: Empty-page flag surfaces (REQ-017, RN-014)

**Given** a 1-page input that yields zero text from both text-layer and OCR
**When** assembled
**Then** the Page has `text === ''`, `extraction_method === 'empty'`, `flags` includes `'no_text_extracted'`, `confidence === null`

**Test file:** `lib/ingestion/__tests__/assemble.test.ts`
**Framework:** vitest

---

### Behavior: Determinism on identical input (REQ-011, RN-007)

**Given** the same fixture buffer
**When** the inner pipeline runs twice
**Then** both `IngestionResult` outputs are deeply equal (`expect(a).toEqual(b)`)

**Test file:** `lib/ingestion/__tests__/assemble.test.ts`
**Framework:** vitest

---

## Task T7: Error State Mapping

### Behavior: Encrypted error maps to controlled vocabulary (REQ-007, REQ-010)

**Given** the inner pipeline raises `EncryptedPdfError`
**When** the worker handles the error
**Then** `markFailed(id, 'encrypted_pdf', cause)` is called with the original error as cause

**Test file:** `src/services/ingestion-worker/__tests__/error-mapping.test.ts`
**Framework:** vitest

---

### Behavior: Malformed/empty errors map to `pdf_unreadable` (REQ-009, REQ-010)

**Given** the inner pipeline raises `MalformedPdfError` or `EmptyPdfError`
**When** the worker handles the error
**Then** `markFailed(id, 'pdf_unreadable', cause)` is called

**Test file:** `src/services/ingestion-worker/__tests__/error-mapping.test.ts`
**Framework:** vitest

---

### Behavior: OCR-failed maps to `ocr_timeout` (REQ-015, REQ-010)

**Given** the inner pipeline raises `OcrFailedError`
**When** the worker handles the error
**Then** `markFailed(id, 'ocr_timeout', cause)` is called

**Test file:** `src/services/ingestion-worker/__tests__/error-mapping.test.ts`
**Framework:** vitest

---

## Task T8: Queue Worker — Idempotent Writeback (REQ-019)

### Behavior: Status writes are upserts keyed on `pliego_upload_id` (REQ-019 (a))

**Given** a `pliego_upload_id` with two consecutive worker invocations
**When** both invocations call `markRunning(id)` then `markCompleted(id)`
**Then** the underlying SQL is upsert-shaped (or repeated UPDATE shape) — no duplicate-key violation, no duplicate row insertion; the final `pliego_uploads` row is unique on `pliego_upload_id`

**Test file:** `src/services/ingestion-worker/__tests__/idempotency.test.ts`
**Framework:** vitest

---

### Behavior: Page-row writes use upsert on (pliego_upload_id, page_number) (REQ-019 (b))

**Given** a successful first ingestion that wrote 12 page rows
**When** a re-delivery causes a second `writePages(id, pages)` call with the same 12 pages
**Then** `pdf_pages` still contains exactly 12 rows for that `pliego_upload_id` (no duplicates); the SQL uses `INSERT ... ON CONFLICT (pliego_upload_id, page_number) DO UPDATE`

**Test file:** `src/services/ingestion-worker/__tests__/idempotency.test.ts`
**Framework:** vitest

---

### Behavior: Worker checks status at entry and short-circuits on `completed` (REQ-019 (c))

**Given** a `pliego_upload_id` whose `ingestion_status` is already `'completed'`
**When** `processPliegoUpload(id)` is invoked
**Then** the worker returns early without calling the inner pipeline (asserted via spy on `extractText`); no new rows are written

**Test file:** `src/services/ingestion-worker/__tests__/idempotency.test.ts`
**Framework:** vitest

---

### Behavior: Worker treats `running` + recent as deferred to in-flight worker (REQ-019 (c))

**Given** a `pliego_upload_id` whose `ingestion_status = 'running'` AND `ingestion_started_at` is < 10 minutes ago
**When** `processPliegoUpload(id)` is invoked
**Then** the worker returns early without reprocessing (asserted via spy)

**Test file:** `src/services/ingestion-worker/__tests__/idempotency.test.ts`
**Framework:** vitest

---

### Behavior: Worker treats `running` + stale as crashed and reprocesses (REQ-019 (c))

**Given** a `pliego_upload_id` whose `ingestion_status = 'running'` AND `ingestion_started_at` is > 10 minutes ago
**When** `processPliegoUpload(id)` is invoked
**Then** the worker treats this as a crashed prior run and re-enters processing (asserted via the inner-pipeline spy being called)

**Test file:** `src/services/ingestion-worker/__tests__/idempotency.test.ts`
**Framework:** vitest

---

### Behavior: Concurrency control via visibility timeout OR advisory lock (REQ-019 (d))

**Given** the worker implementation
**When** the source is inspected for concurrency primitives
**Then** EITHER the queue consumer relies on pgmq visibility timeout (documented), OR the worker acquires a Postgres advisory lock keyed on a hash of `pliego_upload_id` before processing — at least one of the two is in place

**Test file:** `src/services/ingestion-worker/__tests__/concurrency.test.ts`
**Framework:** vitest

---

## Task T9: Validation Corpus (N=20)

### Behavior: corpus.yaml manifest schema (REQ-020)

**Given** `tests/fixtures/pliegos/corpus.yaml`
**When** the acceptance test loads and validates it
**Then** the manifest contains 20 entries; every entry has `source_entity`, `modalidad`, `year`, `tipo`, `manual_labels`, `date_added`; every `tipo` is in the `pliego_tipo` enum vocabulary

**Test file:** `tests/acceptance/pdf-ingestion.test.ts`
**Framework:** vitest

---

## Task T10: Acceptance — Page Failure Rate <5%

### Behavior: Aggregate page-failure rate <0.05 (REQ-021, RN-010, NFR-02)

**Given** the 20-pliego corpus
**When** the acceptance test runs each pliego through `processPliegoUpload` (against an in-memory test repository) and aggregates flagged pages
**Then** (sum of pages flagged with any of `'no_text_extracted' | 'ocr_low_confidence' | 'table_parse_failed'`) / (total pages) < 0.05

**Test file:** `tests/acceptance/pdf-ingestion.test.ts`
**Framework:** vitest

---

### Behavior: Encrypted and corrupted fixtures throw the right errors (REQ-007, REQ-009)

**Given** `tests/fixtures/pliegos/encrypted.pdf` and `tests/fixtures/pliegos/malformed.pdf`
**When** each is processed
**Then** the encrypted one results in `ingestion_failure_reason = 'encrypted_pdf'`; the malformed one results in `'pdf_unreadable'`

**Test file:** `tests/acceptance/pdf-ingestion.test.ts`
**Framework:** vitest

---

## Task T11: Performance Benchmark — 200-page p95 <2 min

### Behavior: 200-page p95 < 120000ms (REQ-022, NFR-01, RN-010)

**Given** the corpus filtered to pliegos ≤200 pages
**When** the vitest benchmark runs each fixture ≥10 times
**Then** the global p95 of `processPliegoUpload` durations is < 120000ms

**Test file:** `tests/bench/pdf-ingestion.bench.ts`
**Framework:** vitest bench

---

## Cross-Cutting: Scoped Purity Scan

### Behavior: Scoped purity scan covers only `lib/ingestion/**` (NFR-03, RN-001)

**Given** the file tree under `lib/ingestion/`, with the scan rule: include `lib/ingestion/**`, exclude `__tests__/` and `*.test.*` within that path; treat `tests/**` as out-of-scope; **`src/services/ingestion-worker/` is OUT of scope by design (per ADR-010, ADR-011)**
**When** the test scans for forbidden imports — `@supabase/*`, `@anthropic-ai/sdk`, `node:fs`, `node:fs/promises`, `node:net`, `node:http`, `node:https`, enumerated logger modules (`pino`, `winston`, `bunyan`, `@logtape/`, plus an "in-house logger module" placeholder list), or `process.env.[A-Z_]+` direct reads
**Then** zero matches in scope

**Test file:** `lib/ingestion/__tests__/purity.test.ts`
**Framework:** vitest

---

### Behavior: Purity scan self-test (NFR-03)

**Given** a temporary file `lib/ingestion/__purity_self_test__.ts` containing `import 'node:fs'`
**When** the purity scan runs
**Then** the scan reports a violation. After cleanup (file removed), a re-run reports zero violations

**Test file:** `lib/ingestion/__tests__/purity.test.ts`
**Framework:** vitest (with afterEach cleanup)
