# T4: OCR Fallback (Tesseract, Spanish lang pack)

## Scope

- `lib/ingestion/ocr.ts` — new file: `runOcr(pageBuffer)` invokes Tesseract via the chosen Node binding; returns text + confidence
- `lib/ingestion/__tests__/ocr.test.ts` — new file: unit tests with stubbed Tesseract wrapper

## Changes

### Public function

`runOcr(pageBuffer: Buffer): Promise<{ text: string; confidence: number }>` — confidence is normalized to `0..1` (Tesseract returns 0–100).

### OCR trigger logic (lives in T6 page assembler, called from T6)

The trigger condition is `text-layer extracted text length < OCR_TRIGGER_THRESHOLD` (default 50 chars). T4 itself does not decide *whether* to OCR — it just OCRs whatever buffer it's handed. The decision lives in T6. This keeps T4 focused on the OCR mechanics.

### Tesseract configuration

- `lang: 'spa'` — Spanish lang pack required (asserted via spy in tests).
- Timeout: configurable, default 30 seconds per page. Exceeding the timeout raises `OcrFailedError`.
- The Tesseract binary is system-installed on the worker host (per ADR-009 — Railway primary).

### Confidence flag

- If `confidence < OCR_LOW_CONFIDENCE_THRESHOLD` (default 0.5), the assembler (T6) appends the `'ocr_low_confidence'` flag to the page's `flags` array. The page is **not** failed — it surfaces with the flag for downstream review.

### Failure-mode mapping

- Tesseract subprocess fails / times out → throw `OcrFailedError(cause)`.
- The worker (T8) maps `OcrFailedError` to `ingestion_failure_reason = 'ocr_timeout'` and fails the whole ingestion.

### Design Rationale

T4 isolates the OCR mechanics so the rest of the pipeline never reaches into Tesseract directly. Swapping Tesseract for a cloud OCR API later is one file's worth of work.

## Dependencies

Requires T1 (uses `OcrFailedError`) and T3 (T3 produces the text-layer length used by T6 to decide whether to invoke T4).

## Done When

- [ ] `runOcr(buffer)` exported from `lib/ingestion/ocr.ts`.
- [ ] Spy assertion: Tesseract invocation receives `lang: 'spa'`.
- [ ] OCR success returns `{text, confidence}` with confidence in `[0, 1]`.
- [ ] OCR failure / timeout raises `OcrFailedError` with `cause` set.
- [ ] No imports from `@supabase/*`, `node:fs`, `node:net`, `node:http`, or any logger (per NFR-03).
- [ ] File stays under 250 lines.
