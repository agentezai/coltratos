# T3: PDF Text Extractor (pdf-parse wrapper)

## Scope

- `lib/ingestion/extract-text.ts` — new file: `extractText(buffer): Promise<PageText[]>` plus internal `PageText` type
- `lib/ingestion/__tests__/extract-text.test.ts` — new file: unit tests against synthetic PDF buffers and fixture-derived buffers

## Changes

### Public function

- Signature: `extractText(buffer: Buffer): Promise<{ page_number: number; text: string }[]>` where `page_number` is 1-indexed.
- Calls `pdf-parse` once per buffer with the `pagerender` option (or post-processes page-level metadata) so per-page text is preserved — `pdf-parse`'s default flat string concatenation discards page boundaries and is unusable for the page-aware output schema.
- Returns the array in document order. Empty pages contribute `{ page_number: N, text: '' }` rather than being skipped — preserves page numbering. The OCR fallback (T4) and assembler (T6) decide what to do with empty pages.

### Failure-mode mapping

- `pdf-parse` rejects with an encryption error → throw `EncryptedPdfError(cause)`.
- `pdf-parse` rejects with malformed-PDF errors → throw `MalformedPdfError(cause)`.
- `pdf-parse` resolves but `numpages === 0` → throw `EmptyPdfError`.
- Any unexpected exception → wrap in `MalformedPdfError(cause)`. Never let raw pdf-parse errors propagate.

Note: this layer does NOT decide on `NoTextLayerError` per page — the OCR-fallback decision lives in T4. T3 emits empty `text: ''` for sub-threshold pages and lets T4/T6 decide.

### Design Rationale (Single Responsibility)

T3 does exactly one thing: turn a `Buffer` into per-page text or a typed extraction error. T4 and T5 (OCR + tables) are independent extractors that consume the same buffer; T6 stitches them together. That clean seam means swapping pdf-parse for pdfjs-dist later is one file's worth of work.

## Dependencies

Requires T1 — uses `PdfIngestionError` subclasses.

## Done When

- [ ] `extractText` exported from `lib/ingestion/extract-text.ts`.
- [ ] Encrypted, malformed, empty failure modes throw the correct `PdfIngestionError` subclass with the original error attached as `cause`.
- [ ] Per-page text is preserved (test: a 3-page PDF returns an array of length 3).
- [ ] Empty pages return `text: ''` rather than being filtered out.
- [ ] No imports from `@supabase/*`, `node:fs`, `node:net`, `node:http`, or any logger (per NFR-03).
- [ ] Unit tests pass: encrypted, malformed, empty, happy path.
- [ ] File stays under 250 lines.
