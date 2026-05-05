# T3: Analysis Pipeline Wiring

## Scope

- `src/services/requisitos-extraction/extractor.ts` (or equivalent) — add `logAnalysisEvent` calls
- `src/services/semaforo-aggregation/aggregator.ts` (or equivalent) — add latency event
- No new files — modifications to existing pipeline services

## Changes

### Wire into requisitos-extraction

Identify the call site(s) where the Anthropic Sonnet API is invoked (extraction, repair retry,
OCR fallback if applicable). For each call site:

1. Record `started_at = new Date()` before the API call.
2. Destructure `usage.input_tokens`, `usage.output_tokens`, `usage.cache_read_input_tokens` (or equivalent) from the Anthropic response.
3. After the call completes (whether successful or a repair retry), call:
   ```ts
   logAnalysisEvent({
     analysis_id,
     event_type: 'extraction',   // or 'repair_retry' | 'ocr_fallback'
     stage: 'extraction',
     started_at,
     completed_at: new Date(),
     input_tokens: usage.input_tokens,
     output_tokens: usage.output_tokens,
     cached_tokens: usage.cache_read_input_tokens ?? 0,
     model: response.model,
   });
   ```
4. Do not await the call; the function returns `void`.
5. Pipeline flow continues unchanged — the telemetry call is additive.

**Repair retry:** the second Anthropic call on schema-validation failure also calls `logAnalysisEvent` with `event_type: 'repair_retry'`.

**OCR fallback:** if the ingestion service is called for OCR and returns token-like cost data, call `logAnalysisEvent` with `event_type: 'ocr_fallback'` and best-available cost fields.

### Wire into semaforo-aggregation

At the entry point of `runSemaforoMatching(...)`:

1. Record `started_at = new Date()`.
2. After matching completes, call:
   ```ts
   logAnalysisEvent({
     analysis_id,
     event_type: 'matching',
     stage: 'matching',
     started_at,
     completed_at: new Date(),
     input_tokens: 0,
     output_tokens: 0,
     cached_tokens: 0,
     model: 'deterministic',
   });
   ```
3. The `cost_usd` computed from zero tokens is `0` — this is correct (matching has no LLM cost).

### Design Rationale (Open/Closed)

No changes to function signatures or return types of existing pipeline services. Telemetry is
instrumented as an additive side effect, not mixed into the return path.

## Dependencies

Requires T2 — `logAnalysisEvent` must be exported from `src/lib/telemetry/` before wiring.

## Done When

- [ ] `logAnalysisEvent` is called after every Anthropic Sonnet API call in requisitos-extraction (extraction + repair retry)
- [ ] `logAnalysisEvent` is called with `event_type: 'ocr_fallback'` if OCR is invoked (or a TODO comment if OCR path is not yet active)
- [ ] `logAnalysisEvent` is called after `runSemaforoMatching` with `event_type: 'matching'`
- [ ] No existing test in `requisitos-extraction` or `semaforo-aggregation` fails after wiring
- [ ] `npm run test` passes for affected service tests (mock the telemetry module)
- [ ] TypeScript compiles without errors
