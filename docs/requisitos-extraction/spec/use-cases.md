# requisitos-extraction — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Orchestrator | The future `analisis-orchestration` service that owns persistence, idempotency cache, and `Analisis.estado` transitions. The only direct caller of `extract()`. |
| `RequisitosExtractor` (interface) | Provider-agnostic boundary defining the extraction capability. |
| `AnthropicRequisitosExtractor` | The v1 concrete implementation. Issues Claude calls, owns prompt-cache structure, computes per-call cost. |
| `MockRequisitosExtractor` | Test-only implementation returning canned outputs. Substitutes for the Anthropic one in orchestrator integration tests. |
| Anthropic API | External LLM service. Receives prompts with `cache_control` blocks, returns JSON conforming to the Requisito extraction schema, and reports usage data used for cost computation. |
| ExtractorLogger | Injected logger interface (defined in `@/types`). Receives cost telemetry, contract violations, and ceiling-breach events. |
| Expert Reviewer | A human (founder for v1; external procurement consultant from v1.1+) who manually scores the validation corpus. |

---

## User Stories

### US-01 — Extract structured requisitos from a pliego + empresa profile

**As an** orchestrator
**I want** to call `extract({ pliego, segments, empresa, analisisId })` and receive `{ requisitos, costUsd, modelMetadata }`
**So that** I can persist the requisitos, record the cost on the análisis, and progress the state machine from `extracting → analyzing → completed`

### US-02 — Reject malformed inputs before any API call

**As an** orchestrator
**I want** `extract()` to fail fast with `ExtractorInputInvalidError` when the empresa profile is incomplete or the segments array is empty
**So that** I don't burn cost on requests that cannot possibly produce useful output

### US-03 — Keep unit cost predictable and bounded

**As a** product owner
**I want** the average per-análisis cost to land in $0.02–0.04 USD with a hard ceiling at $0.05 USD
**So that** the SaaS pricing model stays at least 2 orders of magnitude cheaper than the manual alternative ($50–150 USD), and runaway prompts page early instead of accumulating loss

### US-04 — Validate semantic quality against expert judgment

**As an** engineer adding or changing the extraction prompt
**I want** an acceptance test that runs the AnthropicRequisitosExtractor over a 3-fixture golden corpus and asserts ≥85% requisito-level agreement with expert manual scoring
**So that** prompt iteration cannot silently regress quality, and shipping requires explicit golden-output review

### US-05 — Swap the implementation without touching consumers

**As an** engineer
**I want** the orchestrator to depend on the `RequisitosExtractor` interface and use `MockRequisitosExtractor` in integration tests
**So that** (a) tests run with no Anthropic API key, deterministically and free, and (b) v2 can ship `OpenAIRequisitosExtractor` or a comparative dual-extractor mode without a single change to upstream code

---

## Use Case Scenarios

### UC-01 — Extract requisitos for an análisis (US-01)

**Preconditions:**
- A `Pliego` row exists with a known `file_hash`.
- An `Empresa` profile exists with all required fields (including `profile_updated_at`).
- `pdf-ingestion` has produced a `Segment[]` for the pliego, persisted as `segmento` rows.
- The orchestrator has filtered segments to exclude `is_synthetic === true` and `categoria === 'general'` (per [pdf-ingestion RN-012](../../pdf-ingestion/spec/spec.md)). Any `general` segment that leaks through is skipped + logged by the extractor; if it appears in an LLM payload, the Zod `.refine()` rejects it as `ExtractorSchemaValidationError` (RN-015).
- The orchestrator has checked its idempotency cache on `(pliego.file_hash, empresa.id, implementation_id)` and confirmed no cached result exists.
- The orchestrator has transitioned `Analisis.estado` from `pending` → `extracting`.

#### Main Scenario

1. Orchestrator constructs `ExtractorInput = { pliego, segments, empresa, analisisId }`.
2. Orchestrator calls `extractor.extract(input)` where `extractor: RequisitosExtractor`.
3. `AnthropicRequisitosExtractor` validates input synchronously (segments non-empty, empresa fields present).
4. Implementation groups segments by `categoria`, producing up to 4 categoría-buckets.
4a. **Pre-classify habilitancia (structural tier — RN-016).** For each segmento (across all 4 buckets), check whether `segmento.heading_normalized` matches any pattern in `HABILITANTE_HEADING_PATTERNS` (imported from `@/types`). Build a per-segment `Map<SegmentoId, structuralHabilitante: boolean>`. The prompt for each categoría is parameterized: when a segmento has a structural match, the LLM is instructed to OMIT `is_habilitante`/`is_habilitante_source` for requisitos extracted from it (the extractor merges them post-validation as `'structural'`); when no structural match exists, the LLM emits both fields with source `'llm'`.
5. Implementation issues up to 4 Claude calls **concurrently** via `Promise.all`, each with `cache_control` blocks on (a) the system prompt + Requisito JSON schema and (b) the empresa profile block embedding `profile_updated_at`.
6. As each call resolves, the implementation:
   a. Parses the model's JSON output via `RequisitoExtractionPayloadSchema` (which carries the `categoria === 'general'` `.refine()` rejection per RN-015).
   b. Verifies each requisito's `citation_quote` is an NFD-normalized substring of the cited segment's `contenido`; sets `citation_verified` accordingly.
   c. **Merges habilitancia classification** (RN-016): for requisitos whose source segmento was structurally matched in step 4a, sets `is_habilitante: true, is_habilitante_source: 'structural'`; otherwise passes through the LLM's emitted boolean and sets `is_habilitante_source: 'llm'`.
   d. **Sets `categoria` to the narrow `RequisitoCategoria`** matching this call's bucket — never `'general'` (RN-015).
   e. Computes per-call `costUsd` from the SDK's `usage` data and the prices in `config.ts`.
   f. Reduces into the running cumulative `costUsd`, checking against the $0.05 hard ceiling.
7. After all calls resolve, implementation returns `ExtractorOutput = { requisitos, costUsd, modelMetadata }`. Every emitted `Requisito` carries `categoria` (narrow), `is_habilitante`, `is_habilitante_source` (`'structural'` or `'llm'` only in v1).
8. Orchestrator persists the requisitos to `requisito` (with `categoria`, `is_habilitante`, `is_habilitante_source`, `citation_segment_id`, `citation_quote`, `citation_verified`), records `cost_usd`, `model_metadata`, `prompt_version` on `analisis`, and transitions `Analisis.estado: extracting → analyzing` (or `completed` once [semaforo-aggregation](../../semaforo-aggregation/spec/spec.md) also runs — out of scope here). **Note**: `requisito.categoria` is set at INSERT and is never UPDATEd (per [domain-model RN-016](../../domain-model/spec/spec.md)); recategorization is implemented as orchestrator-level cache invalidation + re-extraction.

#### Alternative Scenarios

**5a. One categoría has zero segments**
The implementation skips that categoría — only 3 (or fewer) calls are issued. The output combines requisitos from the categorías that did receive calls.

**6a. Zod validation fails on first call for a categoría**
Implementation regenerates the prompt for that categoría embedding the Zod error message and retries **once**. If the second call's output also fails Zod validation, the entire `extract()` rejects with `ExtractorSchemaValidationError`.

**6b. Citation quote does not match**
The requisito is returned with `citation_verified: false`. No error. The orchestrator may surface unverified citations in the UI for manual review (out of this scope).

#### Error Scenarios

**3e. Empresa profile incomplete or segments empty**
Implementation rejects with `ExtractorInputInvalidError` synchronously, before any Anthropic API call.

**5e. Anthropic API returns 5xx / network failure / rate-limit**
Implementation wraps into `ExtractorApiError` (retryable). The orchestrator's retry policy (out of this scope) decides whether to retry.

**6e. Cumulative cost exceeds $0.05 USD**
Implementation aborts in-flight calls via `AbortController`, emits a `cost_ceiling_breach` log, and rejects with `ExtractorCostCeilingExceededError` carrying `breachedAmount`.

**Postconditions:**
- On success: `requisitos` are returned in memory; the orchestrator persists them. `Analisis.estado` is on its way to `analyzing` / `completed`.
- On hard failure: orchestrator transitions `Analisis.estado: extracting → failed` with `error_message` populated from the typed error.

---

### UC-02 — Reject malformed inputs before any API call (US-02)

**Preconditions:** Orchestrator has called `extract(input)`.

#### Main Scenario

1. Implementation runs synchronous input validation:
   a. `segments.length > 0`.
   b. Empresa carries all fields required for the prompt (NIT, nombre, financial qualification fields, etc.).
2. If any check fails, implementation rejects with `ExtractorInputInvalidError` carrying a human-readable `message` and a structured `validationErrors` field.
3. Zero Anthropic SDK calls are issued.

#### Error Scenarios

**1e. All required validation passes**
Proceed to UC-01 main scenario step 4.

**Postconditions:** When the error fires, no cost is incurred and the orchestrator can present a clear validation message to the user without waiting on network I/O.

---

### UC-03 — Cap unit cost via prompt caching + ceiling (US-03)

**Preconditions:**
- An empresa has run at least one análisis previously, so the prompt cache for `(prompt_version, empresa_id)` is warm OR the empresa profile has not been edited recently.
- The Anthropic API's ephemeral cache (5-minute TTL) is still warm at call time.

#### Main Scenario

1. Implementation issues each categoría's call with `cache_control: { type: 'ephemeral' }` on the system prompt + JSON schema and on the empresa profile block.
2. Anthropic returns usage data showing `cache_read_input_tokens > 0` for the warm prefix; only the categoría-specific segments are charged at full input rate.
3. Implementation computes the per-call cost using the discounted cache-read rate for the cached portion.
4. The cumulative `costUsd` lands in the $0.02–0.04 USD target band.

#### Alternative Scenarios

**1a. Cache cold (first call after `prompt_version` bump or empresa profile edit)**
Anthropic returns `cache_creation_input_tokens > 0` (full price for cache write). The first call costs ≤$0.06 USD; subsequent calls in the same análisis (parallel siblings) benefit immediately.

**4a. Cumulative cost approaches but does not exceed $0.05**
Calls complete normally. A `cost_telemetry` log records the final cost and cache-hit ratio for monitoring.

#### Error Scenarios

**4e. Cumulative cost exceeds $0.05 USD at any reduction step**
Implementation calls `AbortController.abort()` on remaining calls, emits a `cost_ceiling_breach` log entry, and rejects with `ExtractorCostCeilingExceededError`.

**Postconditions:** Cost-ceiling breaches page operations immediately; routine calls produce a cost-telemetry signal that the orchestrator can persist into a `analisis_telemetry` row.

---

### UC-04 — Validate against a 3-pliego golden corpus (US-04)

**Preconditions:**
- 3 fixture pliegos exist under `tests/fixtures/golden/extraction/` with paired empresa profiles and expert-scored expected `Requisito[]`.
- `corpus.yaml` manifest lists each fixture's paths and metadata.
- CI has access to a real Anthropic API key (acceptance test is CI-only).

#### Main Scenario

1. Acceptance test loads each fixture: `pliego`, `segments`, `empresa`, `expectedRequisitos`.
2. Test instantiates `AnthropicRequisitosExtractor` with the real client and a test logger.
3. For each fixture: call `extract()`, collect `actualRequisitos`.
4. Compare actual vs expected at the requisito level: a match requires (a) same `categoria`, (b) semantically equivalent `descripcion` (judged by string-similarity threshold or sub-string overlap, defined in T6), (c) identical `cumple` verdict.
5. Compute average agreement across all 3 fixtures.
6. Assert average agreement ≥ 0.85.
7. Emit per-fixture agreement, per-fixture cost, and total cost in the test output.

#### Alternative Scenarios

**4a. Agreement falls below 85% on one fixture but average stays ≥85%**
Test passes but logs a warning. The fixture-specific drop is surfaced in CI output for human review.

#### Error Scenarios

**6e. Average agreement < 85%**
Test fails CI. The PR cannot merge until either the prompt is fixed or the spec is revised (per RN-014).

**Postconditions:** Quality gate for any change to the prompt, model, or extraction logic.

---

### UC-05 — Swap the implementation without touching consumers (US-05)

**Preconditions:** A `MockRequisitosExtractor` is implemented at `lib/extraction/mock/extractor.ts` and exported.

#### Main Scenario

1. Orchestrator integration test instantiates `MockRequisitosExtractor` with canned `(input → output)` mappings.
2. Test passes the mock to the orchestrator under test as a `RequisitosExtractor`.
3. Orchestrator runs its full path: input validation, idempotency check, calling `extract()`, persisting outputs.
4. Test asserts on persisted side effects (requisito rows, analisis state transitions, cost recording).
5. Zero Anthropic SDK calls are issued; zero cost is incurred.

#### Alternative Scenarios

**1a. Future v2: a second `RequisitosExtractor` ships (OpenAI, Gemini, etc.)**
The orchestrator code does not change. Composition root swaps the bound implementation. The interface module (`lib/extraction/types.ts`) does not change. The acceptance test (UC-04) is parameterized to run against the new implementation.

#### Error Scenarios

**1e. The interface accidentally leaks an Anthropic-specific concept**
TypeScript compilation of `MockRequisitosExtractor` fails (it cannot satisfy a leaked-Anthropic-shape interface) — caught at PR review time, not at runtime.

**Postconditions:** The interface is structurally protected against provider leakage. The provider-isolation grep (TC-017) is the second layer; type-level enforcement via the mock is the first.

---

## UX/UI References

No UI surface in this spec. See the UX/UI section in [spec.md](./spec.md#uxui) for the orchestrator-side telemetry hand-off.
