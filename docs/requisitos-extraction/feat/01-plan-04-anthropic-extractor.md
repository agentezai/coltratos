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
     - `ingestionResult.pages.length > 0`.
     - `empresa` carries all fields required by the prompt (NIT, nombre, financial qualification fields). Use a Zod schema `ExtractInputValidationSchema` defined inline (or in a sibling file) — distinct from `EmpresaSchema` because it asserts a stricter "extraction-ready" subset.
     - On failure: throw `ExtractorInputInvalidError` with the issue array. **No SDK call has been made.**

  2. **Prepare page payload**: use `ingestionResult.pages` directly. Pages with `extraction_method === 'empty'` or `flags.includes('no_text_extracted')` are NOT filtered out — they are passed to `buildCategoryRequest` as-is, which renders them as `[PÁGINA VACÍA]` markers (REQ-006, RN-017). No segment grouping, no `is_synthetic` / `general` filter step.

  3. **Set up `AbortController`**. Pass `signal: controller.signal` to every SDK call.

  4. **Issue calls in parallel** (REQ-006):
     - For each of up to 4 categorías, kick off a `runCategoria(categoria, pages)` async function.
     - `runCategoria` calls `client.messages.create(buildCategoryRequest({ categoria, pages, empresa: input.empresa }), { signal })`.
     - On Anthropic SDK errors: wrap into `ExtractorApiError` (network/rate-limit/5xx) or `ExtractorTimeoutError` (timeout) and rethrow.
     - On success: parse text content, run `parseAndValidatePayload(rawText)`. On `ExtractorSchemaValidationError`: re-issue ONE retry with `validationErrorFromPriorAttempt` set (REQ-009, RN-013). Second failure: do NOT rethrow — instead return `{ failed: true, categoria, reason: errorMessage }` from `runCategoria` (see step 6 below).
     - On successful parse: run `assembleRequisitos(payload, ingestionResult.pages)` (T3) to attach citation verification (uses `pagina_fuente` + NFKC normalized `quote_fuente`). Then **apply structural habilitante post-validation** — for each emitted requisito, test its `section_heading` (emitted by the LLM in the same call, REQ-019) against `HABILITANTE_HEADING_PATTERNS`. Match → `is_habilitante: true`, `is_habilitante_source: 'structural'`. No match → use LLM's `is_habilitante` value, `is_habilitante_source: 'llm'`. **Set `categoria`** on every requisito to the call's `RequisitoCategoria`.
     - Compute `costUsd` for this call via `computeCallCost(response.usage, PRICES_PER_MTOK)`.
     - Return `{ failed: false, requisitos, costUsd, usage }` for the categoría.

  5. **Cost ceiling reduction** (REQ-012, RN-004):
     - Use `Promise.allSettled` (NOT `Promise.all`) so one categoría's failure doesn't drop sibling cost reductions.
     - As **each settled call resolves**, add its cost to a running cumulative. If `cumulative > COST_CEILING_USD` at any reduction step:
       - Call `controller.abort()` to cancel any still-pending calls.
       - Call `logger.error('cost_ceiling_breach', { breachedAmount: cumulative, ceiling: COST_CEILING_USD, analisisId: input.analisisId })`.
       - Throw `ExtractorCostCeilingExceededError` with `breachedAmount: cumulative`.
     - **Implementation note**: a simple `Promise.all` followed by `.reduce` checks the ceiling ONLY after all calls return — too late to abort. Use a streaming-reduction pattern that inspects each settled promise as it resolves (e.g., a `for await` over a queue, or instrumented per-call resolvers that `Promise.race` against an abort sentinel).

  6. **Aggregate the output**:
     - Collect settled results. Separate successes from second-Zod-failures.
     - If any settled result is a non-Zod rejection (SDK error, timeout, etc.): rethrow it.
     - **Partial result handling** (REQ-009, RN-021): if one or more categories failed on second Zod retry but at least one succeeded:
       - Set `failed_categories` to the list of failed `RequisitoCategoria` values.
       - Set `warning` to a human-readable string: e.g. `"Extraction failed for categories: juridico (schema validation error). Results are partial."`.
       - `requisitos` contains only the successful categories' results.
     - If **all** categories failed on second Zod retry: throw `ExtractorSchemaValidationError`.
     - `costUsd` = the running cumulative (include costs from failed categories' first attempt + retry).
     - `modelMetadata = { implementation_id: IMPLEMENTATION_ID, model_name: EXTRACTION_MODEL, prompt_version: PROMPT_VERSION }`.
     - Emit `logger.info('cost_telemetry', { costUsd, input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens, cacheHitRatio, perCategoria, analisisId })` — all token fields as **distinct numeric values** (REQ-011).
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
- [ ] Synchronous input validation checks `ingestionResult.pages.length > 0` (not `segments.length`), runs before any `client.messages.create` call.
- [ ] Exactly 4 calls issued concurrently (one per `RequisitoCategoria`); all pages passed to each call. No `general` / `is_synthetic` filter (those Segment fields no longer exist on the input type).
- [ ] LLM-emitted `section_heading` per requisito is applied post-validation against `HABILITANTE_HEADING_PATTERNS` (from `@/types`) to determine `is_habilitante_source`. No pre-call structural classification step.
- [ ] Every emitted `Requisito` carries `categoria: RequisitoCategoria` (narrow), `is_habilitante: boolean`, `is_habilitante_source: 'structural' | 'llm'` (NEVER `'manual'` in v1). `categoria === 'general'` never appears in output (TC-022).
- [ ] Cost-ceiling breach calls `controller.abort()` AND throws `ExtractorCostCeilingExceededError` AND emits `cost_ceiling_breach` log.
- [ ] Zod failure on first attempt triggers exactly one retry; second failure for one category → partial result with `warning` + `failed_categories` (TC-025); second failure for ALL categories → `ExtractorSchemaValidationError` (TC-026).
- [ ] Anthropic SDK errors wrap into `ExtractorApiError` / `ExtractorTimeoutError` correctly.
- [ ] `cost_telemetry` log emitted on success with `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens` as distinct fields (TC-027).
- [ ] Grep for `process.env` under `lib/extraction/anthropic/extractor.ts` returns zero matches.
- [ ] Unit tests cover all behaviors above using a stub `Anthropic` client.
- [ ] `npm run typecheck` passes.
