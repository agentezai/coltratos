# T4: AnthropicRequisitosExtractor (Orchestration)

## Scope

- `lib/extraction/anthropic/extractor.ts` — NEW. The `AnthropicRequisitosExtractor` class implementing `RequisitosExtractor`. Wires T2 (config + prompt) and T3 (validation + citation), runs Promise.all per categoría, reduces cost, enforces ceiling via `AbortController`, retries Zod failures once, logs contract violations.
- `lib/extraction/anthropic/cost.ts` — NEW. Pure cost computation from SDK usage data + per-mtok prices.

## Changes

### `cost.ts`

- Export `computeCallCost(usage, prices): number`:
  - Inputs: `usage: { input_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number; output_tokens: number }` and `prices: PRICES_PER_MTOK`.
  - Returns `costUsd = (input × pricePerMtok.input + cacheCreation × prices.cacheCreation + cacheRead × prices.cacheRead + output × prices.output) / 1_000_000`.
  - Round to 6 decimal places to match the `analisis.cost_usd NUMERIC(10,6)` column scale (T0 item 4).
- Pure; no SDK imports.

### `extractor.ts`

Export `class AnthropicRequisitosExtractor implements RequisitosExtractor`:

- **Constructor** (REQ-005, RN-006): `constructor(deps: { client: Anthropic; logger: ExtractorLogger })` — store both as `private readonly`. **No** `process.env` reads, no global SDK instantiation.

- **`async extract(input: ExtractorInput): Promise<ExtractorOutput>`**:

  1. **Synchronous input validation** (REQ-002, RN-005):
     - `segments.length > 0`.
     - `empresa` carries all fields required by the prompt (NIT, nombre, financial qualification fields). Use a Zod schema `ExtractInputValidationSchema` defined inline (or in a sibling file) — distinct from `EmpresaSchema` because it asserts a stricter "extraction-ready" subset.
     - On failure: throw `ExtractorInputInvalidError` with the issue array. **No SDK call has been made.**

  2. **Group segments by `categoria`** into a `Map<SegmentoCategoria, Segment[]>`. Skip segments where `categoria === 'general'` OR `is_synthetic === true` (REQ-006, RN-007). For each skipped segment, call `logger.warn('contract_violation', { reason: 'general_or_synthetic_segment_reached_extractor', segmentId: s.id, categoria: s.categoria, isSynthetic: s.is_synthetic })`. Per RN-007 this is a logged contract violation but extraction continues.

  2a. **Pre-classify habilitancia per segmento (structural tier — REQ-019, RN-016).** For each segment surviving step 2, compute `structuralHabilitante: boolean`:
      ```typescript
      import { HABILITANTE_HEADING_PATTERNS } from '@/types'
      const heading = segmento.heading_normalized   // already NFD-normalized lowercase per pdf-ingestion
      const structuralHabilitante = heading != null
        && HABILITANTE_HEADING_PATTERNS.some(p => p.test(heading))
      ```
      Build a `Map<SegmentoId, { structuralHabilitante: boolean }>` keyed by source segment. Pass this map into `runCategoria` so the post-validation step (step 4) can merge structural classification onto every emitted requisito. **Important**: when `structuralHabilitante === true`, the prompt for that segmento's category instructs the LLM to **omit** `is_habilitante` and `is_habilitante_source` in the payload (the extractor populates them from the structural map post-validation); when `structuralHabilitante === false`, the prompt asks the LLM to classify and emit both fields with `is_habilitante_source: 'llm'`.

  3. **Set up `AbortController`**. Pass `signal: controller.signal` to every SDK call.

  4. **Issue calls in parallel** (REQ-006):
     - For each of up to 4 categorías present, kick off a `runCategoria(categoria, segments)` async function.
     - `runCategoria` calls `client.messages.create(buildCategoryRequest({ categoria, segments, empresa: input.empresa }), { signal })`.
     - On Anthropic SDK errors: wrap into `ExtractorApiError` (network/rate-limit/5xx) or `ExtractorTimeoutError` (timeout) and rethrow.
     - On success: parse text content, run `parseAndValidatePayload(rawText)`. On `ExtractorSchemaValidationError`: re-issue ONE retry with `validationErrorFromPriorAttempt` set (REQ-009, RN-013). Second failure rethrows `ExtractorSchemaValidationError`.
     - On successful parse: run `assembleRequisitos(payload, segments, structuralMap)` (T3) to (a) attach citation verification, (b) **merge structural habilitancia** — for each emitted requisito whose source segmento has `structuralHabilitante === true`, override the LLM's payload to set `is_habilitante: true` and `is_habilitante_source: 'structural'`; otherwise pass through the LLM's `is_habilitante` and set `is_habilitante_source: 'llm'`. (c) **Set `categoria`** on every requisito to the narrow `RequisitoCategoria` value matching the call's categoría (the LLM payload's `categoria` is validated against `RequisitoExtractionPayloadSchema`'s `.refine()` rejecting `'general'`; the assembled `Requisito` carries the narrow type).
     - Compute `costUsd` for this call via `computeCallCost(response.usage, PRICES_PER_MTOK)`. Sum cache-creation + cache-read tokens for the cache-hit ratio telemetry.
     - Return `{ requisitos, costUsd, usage }` for the categoría.

  5. **Cost ceiling reduction** (REQ-012, RN-004):
     - Use `Promise.allSettled` (NOT `Promise.all`) so one categoría's failure doesn't drop sibling cost reductions.
     - As **each settled call resolves**, add its cost to a running cumulative. If `cumulative > COST_CEILING_USD` at any reduction step:
       - Call `controller.abort()` to cancel any still-pending calls.
       - Call `logger.error('cost_ceiling_breach', { breachedAmount: cumulative, ceiling: COST_CEILING_USD, analisisId: input.analisisId })`.
       - Throw `ExtractorCostCeilingExceededError` with `breachedAmount: cumulative`.
     - **Implementation note**: a simple `Promise.all` followed by `.reduce` checks the ceiling ONLY after all calls return — too late to abort. Use a streaming-reduction pattern that inspects each settled promise as it resolves (e.g., a `for await` over a queue, or instrumented per-call resolvers that `Promise.race` against an abort sentinel).

  6. **Aggregate the output**:
     - If any settled result is a rejection (other than the abort-induced rejection): rethrow it.
     - Concatenate `requisitos[]` across categorías.
     - `costUsd` = the running cumulative.
     - `modelMetadata = { implementation_id: IMPLEMENTATION_ID, model_name: EXTRACTION_MODEL, prompt_version: PROMPT_VERSION }`.
     - Emit `logger.info('cost_telemetry', { costUsd, cacheReadRatio, perCategoria, analisisId })` — payload includes per-categoría cost, cache-read ratio, total tokens.
     - Return `ExtractorOutput`.

### Design Rationale (Single Responsibility, Liskov)

`extractor.ts` is the **only** file under `lib/extraction/anthropic/` that owns coordination concerns: parallelism, retry, abort, cost reduction, logging. Pure helpers (T2 prompt assembly, T3 validation, the new T4 cost computation) are composable and individually testable. The constructor signature mirrors what a future `OpenAIRequisitosExtractor` would accept (`{ client, logger }`), satisfying Liskov substitutability at the composition root.

The streaming cost reduction is the subtle bit and the most likely place for a wrong default at execute time — the spec calls it out so the Executor doesn't fall into "Promise.all then check" which would miss the abort window.

## Dependencies

Requires **T2** (config + prompt assembly) and **T3** (validation + citation).

## Done When

- [ ] `lib/extraction/anthropic/extractor.ts` exists with the `AnthropicRequisitosExtractor` class.
- [ ] `lib/extraction/anthropic/cost.ts` exists with `computeCallCost` (pure).
- [ ] Constructor rejects calls without injected `{ client, logger }` (TypeScript-level enforcement; verified by a `tsc --noEmit` test fixture).
- [ ] Synchronous input validation runs before any `client.messages.create` call (verified via stub client recording call count).
- [ ] Up to 4 calls issued concurrently (one per categoría); `general` / `is_synthetic` segments skipped + `contract_violation` logged.
- [ ] Per-segment structural classification computed before any SDK call; `HABILITANTE_HEADING_PATTERNS` imported from `@/types` (TC-020). For segments with `structuralHabilitante === true`, the prompt instructs the LLM to omit `is_habilitante` / `is_habilitante_source`; for others, the LLM emits both with source `'llm'`.
- [ ] Every emitted `Requisito` carries `categoria: RequisitoCategoria` (narrow), `is_habilitante: boolean`, `is_habilitante_source: 'structural' | 'llm'` (NEVER `'manual'` in v1). `categoria === 'general'` never appears in output (TC-022).
- [ ] Cost-ceiling breach calls `controller.abort()` AND throws `ExtractorCostCeilingExceededError` AND emits `cost_ceiling_breach` log.
- [ ] Zod failure on first attempt triggers exactly one retry; second failure throws `ExtractorSchemaValidationError`.
- [ ] Anthropic SDK errors wrap into `ExtractorApiError` / `ExtractorTimeoutError` correctly.
- [ ] `cost_telemetry` log emitted on success with cache-read ratio.
- [ ] Grep for `process.env` under `lib/extraction/anthropic/extractor.ts` returns zero matches.
- [ ] Unit tests cover all behaviors above using a stub `Anthropic` client.
- [ ] `npm run typecheck` passes.
