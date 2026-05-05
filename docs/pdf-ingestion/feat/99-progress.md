# Progress Tracker

**Status:** Not Started (re-planned)

**Re-planned 2026-05-04 from rev 3 to rev 4. All prior checkboxes were unchecked at re-plan time; no work lost.**

**Current Task:** None — awaiting T8 implementation kick-off after rev 4 approval.

---

## Task Checklist

### T0 (PREREQUISITE — SATISFIED EXTERNALLY): domain-model-mvp rev 1
- [x] Confirm `domain-model-mvp` rev 1 has shipped: `pliego_uploads` ingestion columns (`ingestion_status`, `ingestion_started_at`, `ingestion_completed_at`, `ingestion_failure_reason`); `pdf_pages` table with composite PK `(pliego_upload_id, page_number)`; ADR-013 recorded
- [x] Confirm RLS policy on `pdf_pages` via join chain `pdf_pages.pliego_upload_id → pliego_uploads.uploaded_by_company_id`
- [x] Confirm CHECK constraints on `ingestion_status` and `ingestion_failure_reason` controlled vocabularies

### T1: Types and Error Hierarchy
- [ ] Implement Task 1: Author `lib/ingestion/errors.ts` (PdfIngestionError + 7 subclasses including `OcrFailedError`, `TableParseFailedError`, `StorageFetchFailedError`); `IngestionResult`/`Page`/`TableJson` types; `IngestionStatusRepository` port interface in `lib/ingestion/ports/`; ADRs 004/005-stub/007/008/009/010/011/012
- [ ] Verify Task 1: instanceof checks for all 7 subclasses, structural type assertion, all eight ADR files present (ADR-005 marked Superseded), typecheck passes

### T2: Storage Fetch
- [ ] Implement Task 2: `fetchPliegoBuffer(id)` resolves `pliego_upload_id` → `companies/<company_id>/pliegos/<sha256>.pdf` and downloads via Supabase Storage service-role client
- [ ] Verify Task 2: happy-path fetch + 404 → `StorageFetchFailedError`; SHA-256 round-trip assertion

### T3: PDF Text Extractor
- [ ] Implement Task 3: `extractText(buffer)` returns per-page text array (1-indexed); maps pdf-parse failures onto `EncryptedPdfError`/`MalformedPdfError`/`EmptyPdfError`
- [ ] Verify Task 3: 3-page happy path + 4 failure-mode unit tests; per-page preservation; no forbidden imports

### T4: OCR Fallback
- [ ] Implement Task 4: `runOcr(pageBuffer)` invokes Tesseract with `lang: 'spa'`; returns `{text, confidence}` 0..1 normalized; appends `'ocr_low_confidence'` flag below 0.5
- [ ] Verify Task 4: spy asserts Spanish lang pack; low-confidence flag test; OCR failure raises `OcrFailedError`

### T5: Table Extractor
- [ ] Implement Task 5: `extractTables(buffer, page_number)` invokes pdfplumber via subprocess; returns `TableJson[]`; per-page failure sets `'table_parse_failed'` flag, does not throw
- [ ] Verify Task 5: 2-col + 3-col fixtures parse correctly; subprocess failure → flag, not throw

### T6: Page Assembler
- [ ] Implement Task 6: assemble `IngestionResult` from extractor outputs; enforce page contiguity; emit empty pages with `extraction_method='empty'` + `'no_text_extracted'` flag
- [ ] Verify Task 6: page-contiguity invariant; empty-page flag surface; determinism on identical input

### T7: Error State Mapping
- [ ] Implement Task 7: map inner-pipeline error `code` → controlled `ingestion_failure_reason` vocabulary
- [ ] Verify Task 7: each error code maps to the expected reason; `markFailed` called with the original cause

### T8: Queue Worker (idempotent writeback)
- [ ] Implement Task 8: `processPliegoUpload(id)` entrypoint; status check at entry per REQ-019(c); upsert-shaped status writes; upsert page-row writes on `(pliego_upload_id, page_number)`; concurrency control via pgmq visibility timeout OR Postgres advisory lock
- [ ] Verify Task 8: T8 idempotency contract — re-delivery does not duplicate rows; `completed` short-circuits; `running` recent defers; `running` stale (>10min) reprocesses; concurrency primitive in place

### T9: Validation Corpus (N=20)
- [ ] Implement Task 9: 20 real Colombian pliegos under `tests/fixtures/pliegos/`; `corpus.yaml` manifest with `source_entity`, `modalidad`, `year`, `tipo`, `manual_labels`, `date_added`; per-pliego golden sketches under `tests/golden/pages/`; `tests/fixtures/pliegos/README.md` provenance notes; manual table-quality review on 5 sampled pliegos in `tests/fixtures/pliegos/table-review.md`
- [ ] Verify Task 9: manifest schema validates 20 entries; golden sketches resolve to existing files; manual review document present

### T10: Acceptance — <5% page-failure rate
- [ ] Implement Task 10: acceptance test reads `corpus.yaml`, runs each fixture, aggregates flagged-page count, asserts page-failure rate < 0.05; verifies encrypted/malformed fixture failure-reason mapping
- [ ] Verify Task 10: page-failure rate gate green; encrypted/malformed gates green

### T11: Performance Benchmark — 200-page p95 <2 min
- [ ] Implement Task 11: vitest bench filtered to ≤200-page pliegos, ≥10 iterations per fixture; assert p95 < 120000ms
- [ ] Verify Task 11: p95 gate green; memory ceiling probe < 1GB RSS delta

---

## Completion Summary

_Updated when all tasks are done._
