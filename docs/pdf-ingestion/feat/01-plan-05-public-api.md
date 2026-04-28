# T5: Public API Entry Point

## Scope

- `lib/ingestion/index.ts` - new file: `parsePliegoPdf(buffer): Promise<Segment[]>` + barrel re-exports
- `lib/ingestion/__tests__/index.test.ts` - new file: smoke tests + determinism test
- `lib/ingestion/__tests__/purity.test.ts` - new file: scoped purity scan (NFR-03)

## Changes

### Public function

- Composition of T2 → T4: `extractText(buffer)` then `buildSegments(pages)`.
- Pre-condition guard: if `buffer.length === 0`, throw `EmptyPdfError` immediately without calling pdf-parse.
- No try/catch around the pipeline: typed errors from T2 propagate to the caller as-is.

### Barrel re-exports

`index.ts` re-exports:
- `parsePliegoPdf` (the main function)
- `PdfIngestionError`, `NoTextLayerError`, `EncryptedPdfError`, `EmptyPdfError`, `MalformedPdfError` — so consumers can `instanceof`-check without reaching into `errors.ts`.
- `MIN_TEXT_THRESHOLD` (read-only).

`Segment` and `SegmentoCategoria` are NOT re-exported here — they live in `@/types`. Single canonical import path for domain types (RN-008).

### Purity test (NFR-03)

A test in `lib/ingestion/__tests__/purity.test.ts` scans the file tree under `lib/ingestion/`:

- **In-scope:** `lib/ingestion/**/*.ts` and `**/*.tsx`
- **Excluded from scan:** any file under a `__tests__/` directory within `lib/ingestion/`, and any file matching `*.test.*` within `lib/ingestion/`
- **Out of scope entirely:** anything under `tests/**` (top-level tests dir)

Forbidden imports (converged with [requisitos-extraction REQ-017](../../../requisitos-extraction/spec/spec.md) and [semaforo-aggregation REQ-013](../../../semaforo-aggregation/spec/spec.md) for cross-spec parity):
- `@supabase/*`
- `@anthropic-ai/sdk` — defensive; pdf-ingestion has no LLM use case today, but this prevents future contributors from experimenting with LLM-based segmentation inside `lib/ingestion/`
- `node:fs`, `node:fs/promises`
- `node:net`, `node:http`, `node:https`
- Enumerated logger modules: `'pino'`, `'winston'`, `'bunyan'`, `'@logtape/'`, plus an "in-house logger module" placeholder list maintained in the test file. Switched from the regex `/log(ger)?/i` to enumeration to align with the other two `lib/` specs and avoid false-matches on identifiers like `logarithm`/`epilog`. New shared loggers added by extending the list, not by tweaking a regex.
- `process\.env\.[A-Z_]+` — any direct environment-variable read

Test fails CI if any in-scope file matches a forbidden pattern. The exclusions are explicit because T6's corpus harness legitimately needs `node:fs` to read fixture PDFs from disk.

### Design Rationale (Open/Closed)

`index.ts` is intentionally thin: composition only. Algorithm changes happen in T2/T3/T4; this file should rarely change. The barrel pattern means future spec versions can swap implementations (e.g., adding OCR) without forcing every caller to update import paths.

## Dependencies

Requires T4. Indirectly requires T1, T2, T3.

## Done When

- [ ] `parsePliegoPdf` exported from `lib/ingestion/index.ts` with the documented signature.
- [ ] All 4 error subclasses re-exported from the barrel.
- [ ] Empty-buffer guard throws `EmptyPdfError` without invoking pdf-parse (verified via spy).
- [ ] Determinism test: invoking the function twice on the same fixture buffer returns deeply-equal results.
- [ ] Purity scan test passes with the exact scoping rule above (in-scope `lib/ingestion/**` excluding `__tests__/` and `*.test.*`; `tests/**` out of scope).
- [ ] Purity scan test contains a self-test: a temporary fixture file with a forbidden import causes the test to fail (then is removed). This proves the scan actually scans.
- [ ] `npm run typecheck` passes; no `any` in the public surface.
- [ ] File `lib/ingestion/index.ts` stays under 150 lines.
