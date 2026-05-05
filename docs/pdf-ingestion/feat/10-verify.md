# Verification Plan

## T1: Types and Error Hierarchy

### Test Scenarios
- `instanceof PdfIngestionError` is true for `NoTextLayerError`, `EncryptedPdfError`, `EmptyPdfError`, `MalformedPdfError`, `OcrFailedError`, `TableParseFailedError`, `StorageFetchFailedError` (7 subclasses).
- Each subclass exposes the correct `code` literal.
- `IngestionResult` is structurally `{ schema_version: string; pages: Page[] }`; `Page` has `page_number`, `text`, `tables`, `extraction_method`, `confidence`, `flags`.
- ADR files (004, 005-stub-superseded, 007, 008, 009, 010, 011, 012) exist with the correct status frontmatter — ADR-005 status `superseded` and references ADR-010.

### Gate Criteria
`npm run typecheck` passes. Error-hierarchy unit test passes. All eight ADR files present with correct statuses.

---

## T2: Storage Fetch

### Test Scenarios
- Happy path: stub Supabase Storage client returns buffer; `fetchPliegoBuffer(id)` resolves with the buffer; SHA-256 round-trip asserted.
- 404: stub returns not-found; `fetchPliegoBuffer(id)` rejects with `StorageFetchFailedError`; `cause` is set.
- Storage key format: spy asserts `companies/<company_id>/pliegos/<sha256>.pdf`.

### Gate Criteria
All three scenarios pass; SHA-256 round-trip assertion passes.

---

## T3: PDF Text Extractor

### Test Scenarios
- 3-page PDF returns 3 entries with `page_number` `[1, 2, 3]`.
- Encrypted, malformed, empty failure modes throw the correct subclass with `cause` set.
- Empty pages preserved (`text: ''`).

### Gate Criteria
All four failure modes throw the correct subclass. Per-page preservation asserted. No forbidden imports.

---

## T4: OCR Fallback

### Test Scenarios
- Tesseract spy receives `lang: 'spa'`.
- OCR success returns `{text, confidence}` in `[0, 1]`.
- Low-confidence (<0.5) flags page with `'ocr_low_confidence'` (assembler-side, but OCR layer returns confidence faithfully).
- OCR failure raises `OcrFailedError`.

### Gate Criteria
Spanish lang pack assertion green; failure mode green.

---

## T5: Table Extractor

### Test Scenarios
- 2-column synthetic fixture → TableJson with row width 2.
- 3-column synthetic fixture → TableJson with row width 3.
- Per-page subprocess failure → caught and surfaced as `'table_parse_failed'` flag (asserted via T6 integration).
- No `node:fs` import in `lib/ingestion/tables.ts`.

### Gate Criteria
All four scenarios pass; NFR-03 grep clean.

---

## T6: Page Assembler

### Test Scenarios
- Page-contiguity invariant: 5-page input where page 4 is empty surfaces all 5 pages with page 4 having `extraction_method='empty'` + `'no_text_extracted'`.
- OCR fallback decision: sub-threshold page invokes OCR (spy); above-threshold page does not.
- Empty-page flag: 0-text page surfaces with `text: ''`, `extraction_method: 'empty'`, `'no_text_extracted'` flag.
- Determinism: identical input produces deeply-equal output across two invocations.

### Gate Criteria
All four scenarios pass.

---

## T7: Error State Mapping

### Test Scenarios
- Each of the 7 error subclasses → expected `ingestion_failure_reason`.
- Unknown error type → `'unknown'`.
- Adding a new error subclass without updating mapping causes typecheck failure (exhaustiveness check).

### Gate Criteria
Mapping is complete and exhaustive.

---

## T8: Queue Worker (Idempotency)

### Test Scenarios
- **(a)** Status writes are upserts: re-call `markRunning` on running row → no error, single row.
- **(b)** Page writes upsert: re-write same 12 pages → still 12 rows, no duplicates.
- **(c1)** `completed` short-circuits: spy on inner pipeline never called.
- **(c2)** `running` recent → returns early.
- **(c3)** `running` stale (>10 min) → reprocesses.
- **(d)** Concurrency control: pgmq visibility timeout configured ≥30 min OR advisory-lock SQL present.

### Gate Criteria
All 6 idempotency assertions pass.

---

## T9: Validation Corpus (N=20)

### Test Scenarios
- Manifest contains 20 entries; all 6 keys present per entry; `tipo` ∈ `{pliego_condiciones, pliego_definitivo}`.
- Golden sketch files resolve.
- Manual table-quality review documented in `tests/fixtures/pliegos/table-review.md` for 5 sampled pliegos.

### Gate Criteria
Manifest schema valid; golden files exist; manual review document present.

---

## T10: Acceptance — <5% Page Failure Rate

### Test Scenarios
- **Page-failure rate:** `(flagged pages) / (total pages) < 0.05` over the 20-pliego corpus.
- **Encrypted fixture:** `ingestion_failure_reason = 'encrypted_pdf'`.
- **Malformed fixture:** `ingestion_failure_reason = 'pdf_unreadable'`.
- **Scan-only fixture:** OCR fallback triggers; pages have `extraction_method = 'ocr'`.
- **Manifest schema:** validates over 20 entries.

### Gate Criteria
All gates green on CI.

---

## T11: Performance Benchmark

### Test Scenarios
- **Performance:** vitest bench p95 < 120000ms across pliegos ≤200 pages.
- **Memory probe:** RSS delta < 1GB per fixture (soft target, logged).

### Gate Criteria
p95 gate green on CI.

---

## Cross-Cutting: Scoped Purity Scan

### Test Scenarios
- Scans `lib/ingestion/**`, excludes `__tests__/` and `*.test.*`; treats `tests/**` as out-of-scope.
- **`src/services/ingestion-worker/` is OUT of scope by design (per ADR-010, ADR-011).**
- Forbidden imports: `@supabase/*`, `@anthropic-ai/sdk`, `node:fs`, `node:fs/promises`, `node:net`, `node:http`, `node:https`, enumerated logger modules, `process.env.[A-Z_]+`.
- Self-test: temporary forbidden-import file is detected; cleanup makes scan green again.

### Gate Criteria
Zero matches in scope. Self-test demonstrates working detection.

---

## End-to-End Verification

**Final acceptance test:**

1. Confirm `domain-model-mvp` rev 1 is shipped — `pliego_uploads` ingestion columns, `pdf_pages` table, RLS, CHECK constraints. (T0 satisfied externally.)
2. Run `npm run test` after a clean install — T1–T8 unit/integration tests pass; T10 acceptance test runs against all 20 corpus pliegos.
3. Page-failure rate < 5%; manifest schema valid; encrypted/malformed/scan-only fixtures map to correct failure reasons.
4. Run `npm run test:bench` — p95 < 120000ms.
5. Manually inspect one `pdf_pages` result and confirm: page contiguity (1..N), `extraction_method` correctness, OCR'd page has `confidence` populated, table-bearing pages have non-empty `tables`.
6. `npm run typecheck` — zero errors.
7. Grep `lib/ingestion/` for `supabase`, `node:fs`, `logger` (excluding test files); zero matches. (`src/services/ingestion-worker/` is exempt by design.)
8. Manual table-quality review on 5 sampled pliegos passes (REQ-023).

**Gate Criteria:** All eight steps pass. Page-failure rate < 5%, p95 < 120000ms, zero typecheck errors, zero in-scope purity violations, manual table review documented. Spec is shippable.
