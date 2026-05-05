# T10: Acceptance Test — <5% Page Failure Rate

## Scope

- `tests/acceptance/pdf-ingestion.test.ts` — corpus-driven acceptance test
- Test repository (`InMemoryIngestionStatusRepository` or `LocalSupabaseIngestionStatusRepository`) — used to capture writes from the worker without a real Supabase project

## Changes

### Acceptance test (REQ-021, REQ-013, NFR-02)

`tests/acceptance/pdf-ingestion.test.ts` reads `corpus.yaml`, iterates each fixture, calls `processPliegoUpload(id)` against an in-memory repository, and asserts:

1. **Manifest schema (REQ-020 / TC-013):** every entry has `source_entity`, `modalidad`, `year`, `tipo`, `manual_labels`, `date_added`; `tipo` is a valid `pliego_tipo` enum value; `manual_labels` resolves to an existing golden JSON file; `date_added` parses as ISO-8601; manifest contains 20 entries.
2. **Per-fixture ingestion success:** worker invocation against the in-memory repository transitions status to `completed` and writes the expected page count.
3. **Page-failure rate gate (REQ-021):** aggregate `(pages flagged with any of 'no_text_extracted' | 'ocr_low_confidence' | 'table_parse_failed') / (total pages across corpus) < 0.05`.
4. **Encrypted/malformed fixtures (TC-002, TC-003):** `encrypted.pdf` results in `ingestion_failure_reason = 'encrypted_pdf'`; `malformed.pdf` results in `'pdf_unreadable'`.
5. **Scan-only fixture (TC-004):** `scan-only.pdf` triggers OCR fallback; resulting pages have `extraction_method = 'ocr'`.

### In-memory repository

```typescript
class InMemoryIngestionStatusRepository implements IngestionStatusRepository {
  private statuses = new Map<string, ...>()
  private pages = new Map<string, Page[]>()
  // ... idempotent upsert behavior matching the Supabase impl
}
```

Tests inject this stub via dependency injection on `processPliegoUpload`. (If the worker's port wiring uses a module-level singleton, T8 must accept an optional `repo` argument for testability.)

### Test fixtures (T9 dependency)

Reads from `tests/fixtures/pliegos/` and `tests/golden/pages/` produced in T9.

### CI wiring

- `npm run test` runs the acceptance test by default.
- The test runs on CI; failures fail the build.

### Design Rationale (Verification, not implementation)

This task ships zero production code. It binds the spec's correctness gates to CI.

## Dependencies

Requires T9 (corpus fixtures). Indirectly requires T8 (worker entrypoint) and all upstream tasks.

## Done When

- [ ] `tests/acceptance/pdf-ingestion.test.ts` exists and passes locally.
- [ ] Page-failure rate gate green over 20-pliego corpus.
- [ ] Manifest schema validation green.
- [ ] Encrypted/malformed/scan-only fixture scenarios green.
- [ ] CI integrates `npm run test` and gates on green.
- [ ] Test file stays under 300 lines.
