# Verification Plan

## T1: Provider-Agnostic Foundation

### Test Scenarios
- Interface module imports zero SDK / env / logger primitives — grep test.
- All 5 error subclasses extend `ExtractorError` with unique `code` literals; `switch` over codes is exhaustive at the type level.
- A throwaway compile-check confirms `class StubExtractor implements RequisitosExtractor` satisfies the interface using only domain types.
- `ADR-009.md` and `ADR-010.md` exist with Status: Accepted.

### Gate Criteria
`npm run typecheck` passes. Unit tests for the error hierarchy pass. The compile-check stub demonstrates the interface is implementable using only domain types. Both ADRs are present with the required sections.

---

## T2: Anthropic Config + Cache-Aware Prompt

### Test Scenarios
- `config.ts` exports the 5 named constants and contains `// REVIEW BY 2026-10-26` and `// SDK_MAJOR=<n>` comments.
- Grep for `'claude-'` literal under `lib/extraction/anthropic/` returns matches ONLY in `config.ts`.
- `buildCategoryRequest` produces a `MessageCreateParams` with `cache_control: { type: 'ephemeral' }` on both system blocks.
- The empresa system block contains the `profile_updated_at` ISO string verbatim.
- `buildCategoryRequest` with `validationErrorFromPriorAttempt` set produces a final user-message paragraph including that error text.
- `assembleEmpresaBlock` is deterministic for fixed input.

### Gate Criteria
Unit tests pass. Grep assertions pass. `npm run typecheck` passes.

---

## T3: Output Validation + Citation Verification

### Test Scenarios
- `parseAndValidatePayload` accepts valid JSON and JSON wrapped in markdown fences.
- Malformed JSON throws `ExtractorSchemaValidationError` with the parse error in `validationErrors`.
- Schema-invalid JSON throws `ExtractorSchemaValidationError` with Zod issues in `validationErrors`.
- `verifyCitation` returns `{ verified: true }` for an NFD-normalized substring quote.
- `verifyCitation` returns `{ verified: false }` for a paraphrased / non-substring quote — **no throw**.
- `verifyCitation` returns `{ verified: false }` for a quote longer than 200 chars.
- `assembleRequisitos` marks `citation_verified: false` when the cited segment isn't in `segments`.
- All exports are pure (no SDK calls, no logger calls).

### Gate Criteria
Unit tests pass with full coverage of happy path, paraphrase mismatch, missing segment, and over-length quote. Grep for `@anthropic-ai/sdk` in `validation.ts` returns zero matches.

---

## T4: AnthropicRequisitosExtractor

### Test Scenarios
- Constructor without `{ client, logger }` fails to compile (TypeScript-level).
- Synchronous input validation (empty segments, missing empresa fields) throws `ExtractorInputInvalidError` with **zero SDK calls** issued (verified via stub client).
- Up to 4 calls issued concurrently — one per categoría present in segments.
- `general` and `is_synthetic` segments are skipped; `contract_violation` log emitted per skipped segment.
- Cost-ceiling breach: cumulative cost crossing $0.05 calls `controller.abort()`, emits `cost_ceiling_breach` log, throws `ExtractorCostCeilingExceededError` with `breachedAmount` correct.
- Zod failure on first attempt → exactly 1 retry with regenerated prompt; second failure throws `ExtractorSchemaValidationError`.
- Anthropic SDK errors wrap correctly: 5xx / network / rate-limit → `ExtractorApiError`; abort/timeout → `ExtractorTimeoutError`.
- On success: `cost_telemetry` log emitted with cache-read ratio and per-categoría cost.
- `costUsd` aggregation matches the sum of individual `computeCallCost` results to 6 decimal places.

### Gate Criteria
Unit tests pass with stub Anthropic client. The cost-ceiling test specifically validates the streaming-reduction abort path (not just post-hoc detection). `npm run typecheck` passes.

---

## T5: Mock + Public Barrels

### Test Scenarios
- `MockRequisitosExtractor` satisfies `RequisitosExtractor` at the type level (compile-check fixture).
- Canned-output lookup hits via `${pliego.file_hash}:${empresa.id}` key.
- Default-output fallback returns the deterministic empty `ExtractorOutput` with `implementation_id: 'mock'`.
- `throwOn` constructor option causes `extract()` to reject with the configured error.
- Grep for `@anthropic-ai/sdk` under `lib/extraction/mock/` returns zero matches.
- Top-level `lib/extraction/index.ts` re-exports interface + both implementations; consumer import-check fixture confirms.
- `lib/extraction/anthropic/index.ts` re-exports the public Anthropic surface and config constants but NOT internal helpers (validation, prompt internals, cost).

### Gate Criteria
Unit tests pass. Type-checks pass. Mock subtests prove the interface is provider-agnostic by being implementable with zero SDK references.

---

## T6: Corpus + Acceptance + Provider-Isolation Grep

### Test Scenarios
- `corpus.yaml` is well-formed and every referenced path resolves on disk.
- Real-Anthropic acceptance test (CI-only): runs over 3 fixtures; average agreement ≥0.85; per-fixture agreement and cost logged.
- Mock orchestrator test: validates `MockRequisitosExtractor` substitution end-to-end without an API key.
- Provider-isolation grep: zero forbidden matches under `lib/extraction/types.ts`, `lib/extraction/mock/**`, `lib/extraction/index.ts`. `@anthropic-ai/sdk` matches allowed only under `lib/extraction/anthropic/**`.
- Cache-hit ratio ≥0.85 after warmup, captured from `cost_telemetry` events.
- **TC-019 (≥80% structural):** acceptance test aggregates `is_habilitante_source` across all habilitante-true requisitos; the structural fraction is ≥0.80. With `HABILITANTE_HEADING_PATTERNS` patched to `[]`, the test fails (proves the gate exercises the pattern list).
- **TC-022 (categoria narrowness):** zero emitted requisitos carry `categoria === 'general'`.
- **TC-023 (ModelMetadata import):** `lib/extraction/types.ts` imports `ModelMetadata` from `@/types`; zero local declarations.

### Gate Criteria
All acceptance + isolation tests pass in CI. The real-Anthropic test runs only with `ANTHROPIC_API_KEY` set; absence skips, never fails. The grep test runs in every CI run regardless of credentials. The ≥80%-structural gate (TC-019) and categoria-narrowness gate (TC-022) run as part of the real-Anthropic test (skipped along with it when no key is present); the ModelMetadata-import gate (TC-023) is part of the unit purity test and runs every CI.

---

## End-to-End Verification

**Final acceptance — the integrated extraction stage:**

1. T0 schema additions are applied via `domain-model` migration; new columns visible in Supabase.
2. Build a small E2E test (or a manual reproduction script) that:
   a. Loads a fixture pliego from `tests/fixtures/golden/extraction/fixture-01-clean-pliego/`.
   b. Calls `parsePliegoPdf` to produce `Segment[]` (re-using pdf-ingestion).
   c. Filters out `is_synthetic === true` and `categoria === 'general'`.
   d. Constructs an `ExtractorInput` with the fixture's `empresa.json` and a fresh `analisisId`.
   e. Calls `new AnthropicRequisitosExtractor({ client, logger }).extract(input)`.
   f. Inspects the returned `ExtractorOutput`.
3. Output contains `requisitos: Requisito[]` with at least 1 requisito per categoría present in the input segments.
4. `costUsd` lands in `[0.01, 0.05]` (warm cache) — ceiling not breached.
5. `modelMetadata = { implementation_id: 'anthropic', model_name: <pinned model>, prompt_version: 'v1.0.0' }`.
6. ≥80% of returned requisitos have `citation_verified: true`. Unverified ones still have a `citation_segment_id` and `citation_quote`.
7. Repeat the call with the same input — cumulative cache-hit ratio ≥0.85 on the second call (Anthropic's ephemeral cache TTL is 5 minutes; second call within that window benefits).
8. Re-run with a deliberately-malformed empresa profile (missing NIT) — fails with `ExtractorInputInvalidError` BEFORE any SDK call (verified by network panel or by counting `client.messages.create` invocations on a wrapped client).
9. Run the provider-isolation grep test — zero violations.
10. Spot-check the corpus acceptance test result for a representative fixture: per-requisito agreement, cost, cache-hit ratio.

**Gate Criteria:** All steps complete. The corpus acceptance test passes with average agreement ≥0.85 and average cached cost ≤$0.04. Provider-isolation grep passes. `npm run typecheck` and `npm run test` pass.
