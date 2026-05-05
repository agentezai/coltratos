# T6: Page Assembler

## Scope

- `lib/ingestion/assemble.ts` — new file: `assemble(textPages, ocrFn, tablesFn)` produces an `IngestionResult`
- `lib/ingestion/__tests__/assemble.test.ts` — new file: unit tests for page contiguity, empty-page flagging, OCR fallback decision, determinism

## Changes

### Public function

```typescript
export async function assemble(
  textPages: { page_number: number; text: string }[],
  ocrFn: (pageBuffer: Buffer) => Promise<{ text: string; confidence: number }>,
  tablesFn: (page_number: number) => Promise<TableJson[]>,
  rasterize: (page_number: number) => Promise<Buffer>
): Promise<IngestionResult>
```

The dependencies are passed as functions, not as direct module imports. This keeps `assemble.ts` testable without spinning up Tesseract or pdfplumber, and keeps the file under NFR-03.

### Per-page assembly logic

For each page from `textPages`:

1. Start with the text-layer extraction.
2. **OCR fallback decision (REQ-008, RN-009):** if `text.length < OCR_TRIGGER_THRESHOLD` (default 50 chars), invoke `ocrFn` on a rasterized page buffer obtained from `rasterize(page_number)`. Set `extraction_method = 'ocr'`, replace `text` with OCR output, populate `confidence`. Append `'ocr_low_confidence'` flag if confidence < `OCR_LOW_CONFIDENCE_THRESHOLD = 0.5`.
3. **Table extraction:** invoke `tablesFn(page_number)`. On success, `tables` is the returned array. On per-page failure, `tables = []` and `flags` includes `'table_parse_failed'`.
4. **Empty-page flag (REQ-017, RN-014):** if after text + OCR the page still has `text === ''`, set `extraction_method = 'empty'`, `confidence = null`, `flags` includes `'no_text_extracted'`. The page is **not** dropped — it surfaces with the flag.
5. Otherwise, `extraction_method = 'text_layer'` (or `'table_parser'` if the page is dominated by a table — but for MVP we keep it simple: `'text_layer'` whenever text-layer extraction succeeded).

### Page contiguity invariant (RN-014)

The assembler asserts page contiguity at exit: `pages.length === textPages.length`, `pages[i].page_number === i + 1`. A failed assertion is a programmer error and throws `MalformedPdfError` (cause = the offending state). We'd rather fail closed than emit invariant-violating data downstream.

### IngestionResult shape

```typescript
{
  schema_version: '1.0',
  pages: Page[]  // contiguous, 1-indexed
}
```

`schema_version` is hardcoded `'1.0'` for the v1 ship. Schema changes require a spec edit.

### Determinism (REQ-011, RN-007)

No randomness, no `Date.now()`, no environment lookups. Same input always produces deeply-equal output. Tests assert `expect(a).toEqual(b)` across two invocations.

### Design Rationale (Single Responsibility)

T6 is the only place that knows about *page-level assembly* — the OCR fallback decision, the table-extraction call, the empty-page flag policy, and the contiguity invariant. T3/T4/T5 are pure extractors that don't know about each other. T6 stitches them.

## Dependencies

Requires T3 (text), T4 (`ocrFn`), T5 (`tablesFn`). Indirectly requires T1.

## Done When

- [ ] `assemble` exported from `lib/ingestion/assemble.ts`.
- [ ] Page-contiguity invariant asserted at exit; tests cover the empty-page case (page 4 of a 5-page input has no text → row surfaces with flag, page count remains 5).
- [ ] OCR fallback decision tests: sub-threshold page invokes `ocrFn`; above-threshold page does not.
- [ ] Empty-page flag test: 0-text + 0-OCR-text page surfaces with `extraction_method='empty'` + `'no_text_extracted'`.
- [ ] Determinism test: identical input across two invocations produces deeply-equal output.
- [ ] No imports from `@supabase/*`, `node:fs`, `node:net`, `node:http`, or any logger (per NFR-03).
- [ ] File stays under 350 lines.
