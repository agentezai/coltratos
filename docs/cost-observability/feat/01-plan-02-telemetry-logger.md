# T2: TelemetryLogger Module

## Scope

- `src/lib/telemetry/pricing.ts` — `PRICING` constant and cost computation functions
- `src/lib/telemetry/logger.ts` — `TelemetryLogger` with fire-and-forget helpers
- `src/lib/telemetry/index.ts` — barrel export
- `src/__tests__/telemetry/pricing.test.ts` — unit tests for cost computation
- `src/__tests__/telemetry/logger.test.ts` — unit tests for fire-and-forget behavior

## Changes

### Pricing constant (`pricing.ts`)

- Define `PRICING` object (TypeScript `const`) with:
  ```
  // Last updated: 2026-05-05
  CLAUDE_SONNET_INPUT_PER_M: number     // USD per million input tokens
  CLAUDE_SONNET_CACHE_READ_PER_M: number // USD per million cached tokens read
  CLAUDE_SONNET_OUTPUT_PER_M: number    // USD per million output tokens
  TEXT_EMBEDDING_3_SMALL_PER_K: number  // USD per 1k input tokens
  ```
- Export `computeAnalysisCost({ inputTokens, cachedTokens, outputTokens }: AnalysisCostInput): number`:
  - `uncachedTokens = inputTokens - cachedTokens`
  - `cost = (uncachedTokens * INPUT_PRICE + cachedTokens * CACHE_READ_PRICE + outputTokens * OUTPUT_PRICE) / 1_000_000`
  - Returns value rounded to 6 decimal places
- Export `computeEmbeddingCost({ inputTokens }: EmbeddingCostInput): number`:
  - `cost = (inputTokens * EMBEDDING_PRICE) / 1_000`
  - Returns value rounded to 6 decimal places
- Both functions are pure — no side effects, no async.

### TelemetryLogger helpers (`logger.ts`)

- Import Supabase server client (service-role) from `src/lib/supabase/server.ts`.
- Export `logAnalysisEvent(payload: LogAnalysisEventPayload): void`:
  - Payload fields: `analysis_id`, `event_type`, `stage`, `started_at`, `completed_at`, `input_tokens`, `output_tokens`, `cached_tokens`, `model`, `metadata?`
  - Computes `uncached_tokens = input_tokens - cached_tokens` and `cost_usd = computeAnalysisCost(...)`.
  - Calls `supabase.from('analysis_events').insert({...})` without `await` — fire-and-forget.
  - Wraps in `.catch((err) => console.error('[telemetry] logAnalysisEvent failed', { analysis_id, err }))`.
- Export `logEmbeddingEvent(payload: LogEmbeddingEventPayload): void`:
  - Payload fields: `company_id` (optional), `use_case`, `input_tokens`, `model`
  - Computes `cost_usd = computeEmbeddingCost(...)`.
  - Fire-and-forget insert into `embedding_events` with identical error-swallow pattern.
- Export `logSearchEvent(payload: LogSearchEventPayload): void`:
  - Payload fields: `company_id`, `query_text`, `filters`, `result_count`, `clicked_ids`
  - Truncates `query_text` to 500 chars before insert (per NFR-02).
  - Fire-and-forget insert into `search_events` with error-swallow pattern.
- All three helpers return `void` — callers do not and cannot await telemetry writes.

### Unit tests

- `pricing.test.ts`: parameterized table testing `computeAnalysisCost` and `computeEmbeddingCost` with known inputs and expected outputs. Verifies rounding to 6 decimal places.
- `logger.test.ts`: mocks Supabase client. Verifies:
  - `logAnalysisEvent` does not throw when insert rejects.
  - `logEmbeddingEvent` does not throw when insert rejects.
  - `logSearchEvent` truncates `query_text` beyond 500 chars.
  - `logAnalysisEvent` correctly computes `cost_usd` and inserts it.

### Design Rationale (Single Responsibility + Open/Closed)

Pricing computation is isolated in `pricing.ts` (pure function, no I/O) so it can be tested
without mocking Supabase. `logger.ts` depends on pricing via import — updating pricing is a
one-file change. New event types can be added without modifying existing helpers.

## Dependencies

Requires T1 — TypeScript types (`AnalysisEventInsert`, etc.) must exist before the logger can use them.

## Done When

- [ ] `PRICING` constant exists with a `// Last updated:` comment and covers all four price points
- [ ] `computeAnalysisCost` and `computeEmbeddingCost` pass all unit tests
- [ ] `logAnalysisEvent`, `logEmbeddingEvent`, `logSearchEvent` are exported from `src/lib/telemetry/`
- [ ] All three helpers swallow insert errors (test: mock rejection, assert no throw)
- [ ] `logSearchEvent` truncates `query_text` at 500 chars (unit test)
- [ ] TypeScript compiles without errors
- [ ] `npm run test` passes for `src/__tests__/telemetry/`
