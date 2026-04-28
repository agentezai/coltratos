# Progress Tracker

**Status:** Not Started

**Current Task:** T1 — provider-agnostic foundation. T0 is shipped via domain-model rev 4 + rev 5.

---

## Task Checklist

### T0: Domain-model schema additions (SHIPPED in domain-model rev 4 + rev 5)
- [x] **rev 4 (12 items):** 3 citation columns on `requisito`, 3 telemetry columns on `analisis`, `profile_updated_at` on `empresa`, Zod extensions, `ExtractorLogger` and `RequisitoExtractionPayload(Schema)` exports from `@/types`. `ModelMetadata` canonicalized in `src/types/db.ts`.
- [x] **rev 5 (7 additional items used by this spec):** `requisito.categoria` (narrow `RequisitoCategoria`) with `ColumnType<R, R, never>` immutability shape; `requisito.is_habilitante`; `requisito.is_habilitante_source` with CHECK on `'structural'|'llm'|'manual'`; `RequisitoSchema` + `RequisitoExtractionPayloadSchema` extended (incl. `categoria === 'general'` `.refine()` rejection); `RequisitoCategoria` and `IsHabilitanteSource` enum exports; `HABILITANTE_HEADING_PATTERNS` (regex array) + `HABILITANTE_PATTERNS_VERSION = 'v1.0.0'` constants exported from `@/types`.

### T1: Provider-Agnostic Foundation (Interface + Errors + ADRs)
- [ ] Implement Task 1: `lib/extraction/types.ts` (interface + 5 error subclasses; **imports `ModelMetadata` from `@/types`, never redeclares**); `.nybo/foundation/adrs/ADR-009.md` and `ADR-010.md`.
- [ ] Verify Task 1: typecheck + error-hierarchy tests + interface-implementability compile-check + ADR presence + TC-023 (no local `ModelMetadata` declaration).

### T2: Anthropic Config + Cache-Aware Prompt
- [ ] Implement Task 2: `lib/extraction/anthropic/config.ts` (model, prompt_version, prices, REVIEW BY) and `prompt.ts` (cache-aware message assembly with cache_control on system blocks + empresa block embedding `profile_updated_at`).
- [ ] Verify Task 2: unit tests for prompt assembly + cache_control placement + grep that `'claude-'` only appears in `config.ts`.

### T3: Output Validation + Citation Verification
- [ ] Implement Task 3: `lib/extraction/anthropic/validation.ts` (`parseAndValidatePayload`, `verifyCitation`, `assembleRequisitos`) — all pure.
- [ ] Verify Task 3: unit tests for valid/malformed/schema-invalid JSON, NFD substring match, paraphrase mismatch (no throw), over-length quote, missing segment.

### T4: AnthropicRequisitosExtractor (rev 2: + tiered classifier + categoria narrowing)
- [ ] Implement Task 4: `lib/extraction/anthropic/extractor.ts` and `cost.ts`. DI constructor, sync input validation, **per-segment structural habilitancia pre-classification using `HABILITANTE_HEADING_PATTERNS` (REQ-019, RN-016)**, parallel-per-categoría calls with AbortController, **categoria-narrowing on every emitted Requisito (REQ-006, RN-015)**, streaming cost reduction with ceiling enforcement, 1× Zod retry, contract-violation + cost telemetry logging. Every emitted `Requisito` carries `categoria` (narrow), `is_habilitante`, `is_habilitante_source` (`'structural'` or `'llm'`; never `'manual'` in v1).
- [ ] Verify Task 4: unit tests covering all behaviors above using a stub Anthropic client. Critical cases: cost-ceiling breach correctly aborts in-flight calls; structural-tier match bypasses LLM habilitancia classification (TC-020); `categoria === 'general'` payload rejected via Zod `.refine()` (TC-021); zero emitted requisitos carry `categoria === 'general'` (TC-022).

### T5: Mock + Public Barrels
- [ ] Implement Task 5: `lib/extraction/mock/extractor.ts`, `lib/extraction/mock/index.ts`, `lib/extraction/anthropic/index.ts`, `lib/extraction/index.ts`.
- [ ] Verify Task 5: unit tests for mock substitution + canned-output behavior; provider-isolation grep over `lib/extraction/mock/` returns zero `@anthropic-ai/sdk` matches.

### T6: Corpus + Acceptance + Provider-Isolation Grep (rev 2: + ≥80% structural gate)
- [ ] Implement Task 6: 3 golden fixtures with **`is_habilitante` + `is_habilitante_source` annotations** per requisito (REQ-014); `corpus.yaml`; real-Anthropic acceptance test (`tests/acceptance/requisitos-extraction.real.test.ts`); mock orchestrator test (`tests/acceptance/requisitos-extraction.mock.test.ts`); provider-isolation grep (`tests/ci/extraction-provider-isolation.test.ts`).
- [ ] Verify Task 6: corpus acceptance test passes with ≥85% average agreement; cache-hit ratio ≥0.85 after warmup; mock test passes without API key; isolation grep passes with zero forbidden matches; **TC-019: ≥80% of habilitante-true requisitos (corpus-wide) carry `is_habilitante_source === 'structural'`** (REQ-020); zero emitted requisitos have `categoria === 'general'` (TC-022).

---

## Completion Summary

_To be filled in when all tasks ship: average corpus agreement, average cached cost-per-call, average cache-hit ratio, p95 latency from the benchmark, and a note on whether the REVIEW BY date in `config.ts` was reached during execution._
