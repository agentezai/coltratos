# T2: PDF Text Extractor (pdf-parse wrapper)

## Scope

- `lib/ingestion/extract-text.ts` - new file: `extractText(buffer): Promise<PageText[]>` plus internal `PageText` type
- `lib/ingestion/__tests__/extract-text.test.ts` - new file: unit tests against synthetic PDF buffers and fixture-derived buffers

## Changes

### Public function

- Signature: `extractText(buffer: Buffer): Promise<{ page: number; text: string }[]>` where `page` is 1-indexed.
- Calls `pdf-parse` once per buffer with the `pagerender` option (or post-processes page-level metadata) so per-page text is preserved — `pdf-parse`'s default flat string concatenation discards page boundaries and is unusable for `pageRange`.
- Returns the array in document order. Empty pages contribute `{ page: N, text: '' }` rather than being skipped — preserves page numbering.

### Failure-mode mapping

- `pdf-parse` rejects with an encryption error → throw `EncryptedPdfError(cause)`.
- `pdf-parse` rejects with malformed-PDF errors → throw `MalformedPdfError(cause)`.
- `pdf-parse` resolves but `numpages === 0` or all pages have empty text → throw `EmptyPdfError`.
- Total extracted text length below `MIN_TEXT_THRESHOLD` (200 chars, exported constant) → throw `NoTextLayerError`.
- Any unexpected exception → wrap in `MalformedPdfError(cause)`. Never let raw pdf-parse errors propagate.

### Internal helpers

- `MIN_TEXT_THRESHOLD = 200` — exported constant (RN-009).
- `normalizeWhitespace(text: string)` — collapses runs of whitespace before length checks; private.

### Design Rationale (Single Responsibility)

This file does exactly one thing: turn a `Buffer` into per-page text or a typed error. T3 and T4 consume `PageText[]`, never `Buffer` directly. That clean seam means swapping pdf-parse for pdfjs-dist later is one file's worth of work.

## Dependencies

Requires T1 — uses `PdfIngestionError` subclasses.

## Done When

- [ ] `extractText` exported from `lib/ingestion/extract-text.ts`.
- [ ] All four failure modes throw the correct `PdfIngestionError` subclass with the original error attached as `cause`.
- [ ] Per-page text is preserved (test: a 3-page PDF returns an array of length 3 with non-empty `text` on each page).
- [ ] Empty pages return `text: ''` rather than being filtered out.
- [ ] No imports from `@supabase/*`, `node:fs`, `node:net`, `node:http`, or any logger.
- [ ] Unit tests pass: encrypted, scan-only (synthetic), malformed, empty, happy path.
- [ ] File stays under 250 lines.
