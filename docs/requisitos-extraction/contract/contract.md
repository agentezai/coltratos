# TDD Contract: requisitos-extraction

Markdown TDD guide for nybo-run. The Executor Agent reads this file and writes failing tests
before implementing each task (Red phase), then implements (Green), then refactors (Refactor).

Framework throughout: **vitest** (per CORE.md / project conventions).

---

## Task T1: Provider-Agnostic Foundation

### Behavior: Interface module imports zero non-domain primitives (REQ-001, REQ-002, RN-001, NFR-05)

**Given** the file `lib/extraction/types.ts`
**When** scanned for imports and identifier references
**Then** zero matches for `@anthropic-ai/sdk`, `@supabase/`, `process.env`, `node:`, or any logger module

**Test file:** `lib/extraction/__tests__/types.purity.test.ts`
**Framework:** vitest

---

### Behavior: Error hierarchy has unique discriminating codes (REQ-004, RN-005)

**Given** the 5 error subclasses imported from `lib/extraction/types`
**When** instantiated and inspected
**Then** each carries the expected `code` literal; a `switch (err.code) { ... }` over all 5 cases compiles without `default` and is exhaustive

**Test file:** `lib/extraction/__tests__/errors.test.ts`
**Framework:** vitest

---

### Behavior: Stub class can implement RequisitosExtractor with only domain types (REQ-001, RN-001)

**Given** a stub class `class StubExtractor implements RequisitosExtractor { async extract(input) { ... } }`
**When** typechecked
**Then** zero TypeScript errors are emitted; the stub's imports include only `@/types`

**Test file:** `lib/extraction/__tests__/interface-implementability.test-d.ts` (vitest type-test)
**Framework:** vitest (type-only)

---

### Behavior: ModelMetadata is imported, not redeclared (REQ-003) — TC-023

**Given** the file `lib/extraction/types.ts`
**When** scanned for `interface ModelMetadata` or `type ModelMetadata = `
**Then** zero declarations are found

**Given** the same file
**When** scanned for `import .* ModelMetadata .* from '@/types'`
**Then** exactly one matching import is found

**Test file:** `lib/extraction/__tests__/types.purity.test.ts`
**Framework:** vitest

---

## Task T2: Anthropic Config + Cache-Aware Prompt

### Behavior: Both system blocks carry cache_control (REQ-007, RN-008)

**Given** an `ExtractorInput` with non-empty segments and a complete `Empresa`
**When** `buildCategoryRequest({ categoria: 'juridico', segments, empresa })` runs
**Then** the returned payload's `system` is an array of two blocks where both have `cache_control: { type: 'ephemeral' }`

**Test file:** `lib/extraction/anthropic/__tests__/prompt.test.ts`
**Framework:** vitest

---

### Behavior: Empresa block embeds profile_updated_at (REQ-007, RN-008, RN-009)

**Given** an `Empresa` with `profile_updated_at: '2026-04-25T10:00:00Z'`
**When** `assembleEmpresaBlock(empresa)` runs
**Then** the returned string contains `'2026-04-25T10:00:00Z'`

**Test file:** `lib/extraction/anthropic/__tests__/prompt.test.ts`
**Framework:** vitest

---

### Behavior: Validation-error injection adds the error to the user message (REQ-009, RN-013)

**Given** a `buildCategoryRequest({ ..., validationErrorFromPriorAttempt: 'expected array, got object' })`
**When** the payload is inspected
**Then** the `messages[0].content` (last user message) includes the literal `'expected array, got object'` and an instruction to re-emit conforming output

**Test file:** `lib/extraction/anthropic/__tests__/prompt.test.ts`
**Framework:** vitest

---

### Behavior: Model strings live only in config.ts (REQ-008, RN-011)

**Given** all source files under `lib/extraction/anthropic/`
**When** grepped for the regex `/['"]claude-/`
**Then** matches appear ONLY in `config.ts`

**Test file:** `lib/extraction/anthropic/__tests__/config.purity.test.ts`
**Framework:** vitest

---

## Task T3: Output Validation + Citation Verification

### Behavior: Markdown-fenced JSON is parsed (REQ-009)

**Given** the model output `'\`\`\`json\n{"requisitos": []}\n\`\`\`'`
**When** `parseAndValidatePayload(output)` runs
**Then** it returns a typed `RequisitoExtractionPayload` without throwing

**Test file:** `lib/extraction/anthropic/__tests__/validation.test.ts`
**Framework:** vitest

---

### Behavior: Schema-invalid JSON throws ExtractorSchemaValidationError (REQ-009, RN-013)

**Given** the model output `'{"requisitos": "not-an-array"}'`
**When** `parseAndValidatePayload(output)` runs
**Then** it throws `ExtractorSchemaValidationError` whose `code === 'EXTRACTOR_SCHEMA_VALIDATION'` and `validationErrors` contains the Zod issue array

**Test file:** `lib/extraction/anthropic/__tests__/validation.test.ts`
**Framework:** vitest

---

### Behavior: NFKC-normalized substring → citation verified (REQ-010, RN-018)

**Given** a page with text `'CAPACIDAD JURÍDICA. El proponente debe acreditar...'`, `pagina_fuente: 1`, and `quote_fuente: 'Capacidad  Juridica'` (extra space, composed form)
**When** `verifyCitation({ quote: 'Capacidad  Juridica', pagina: 1, pages })` runs
**Then** `{ unverified: false }` — NFKC + whitespace-collapse + case-fold resolves the variant

**Test file:** `lib/extraction/anthropic/__tests__/validation.test.ts`
**Framework:** vitest

---

### Behavior: Paraphrased quote → unverified, no throw (REQ-010, RN-018)

**Given** page text `'El proponente debe presentar el certificado de existencia.'` and `quote_fuente: 'must present an existence certificate'`
**When** `verifyCitation` runs
**Then** `{ unverified: true }`; no error thrown

**Test file:** `lib/extraction/anthropic/__tests__/validation.test.ts`
**Framework:** vitest

---

### Behavior: pagina_fuente out of range → citation_unverified: true (REQ-010, RN-018) — TC-024

**Given** `pagina_fuente: 999` and `pages` with length 10
**When** `verifyCitation({ quote, pagina: 999, pages })` runs
**Then** `{ unverified: true }`; no error thrown

**Test file:** `lib/extraction/anthropic/__tests__/validation.test.ts`
**Framework:** vitest

---

### Behavior: assembleRequisitos uses pagina_fuente + pages (REQ-010, RN-018)

**Given** a payload with `pagina_fuente: 2` and `pages` array with 3 pages where page 2 contains the quote
**When** `assembleRequisitos(payload, pages)` runs
**Then** the returned requisito has `citation_unverified: false`; no reference to `citation_segment_id` is made

**Test file:** `lib/extraction/anthropic/__tests__/validation.test.ts`
**Framework:** vitest

---

## Task T4: AnthropicRequisitosExtractor

### Behavior: Constructor requires injected client + logger (REQ-005, RN-006)

**Given** the `AnthropicRequisitosExtractor` class
**When** code attempts `new AnthropicRequisitosExtractor()` (no args)
**Then** TypeScript compilation fails

**Test file:** `lib/extraction/anthropic/__tests__/extractor-constructor.test-d.ts` (type-test)
**Framework:** vitest (type-only)

---

### Behavior: Empty pages rejected synchronously (REQ-002, RN-005)

**Given** a stub `Anthropic` client that records calls and an `ExtractorInput` with `ingestionResult: { pages: [], schema_version: '1' }`
**When** `extract(input)` runs
**Then** it rejects with `ExtractorInputInvalidError` (`code: 'EXTRACTOR_INPUT_INVALID'`); zero `client.messages.create` calls were recorded

**Test file:** `lib/extraction/anthropic/__tests__/extractor.test.ts`
**Framework:** vitest

---

### Behavior: Up to 4 concurrent calls, one per categoría (REQ-006, RN-017)

**Given** a stub client recording call arguments + start times, and an `IngestionResult` with pages
**When** `extract(input)` runs
**Then** exactly 4 calls were recorded, all initiated within the same microtask tick (concurrent), each carrying all pages from `IngestionResult`

**Test file:** `lib/extraction/anthropic/__tests__/extractor.test.ts`
**Framework:** vitest

---

### Behavior: Empty pages appear as [PÁGINA VACÍA] markers, not absent (REQ-006, RN-017)

**Given** an `IngestionResult` where page 3 has `extraction_method: 'empty'`
**When** `extract(input)` runs
**Then** the recorded prompt for each category call contains `[PÁGINA VACÍA]` at position 3; the total page count in the prompt matches `ingestionResult.pages.length`

**Test file:** `lib/extraction/anthropic/__tests__/extractor.test.ts`
**Framework:** vitest

---

### Behavior: Cost-ceiling breach aborts and throws (REQ-012, RN-004)

**Given** a stub client returning usage data implying $0.03 per call across 2 categorías (cumulative $0.06 > $0.05 ceiling)
**When** `extract(input)` runs
**Then** the call rejects with `ExtractorCostCeilingExceededError` whose `breachedAmount === 0.06`; `controller.abort()` was called on the AbortController; the captured logger received a `cost_ceiling_breach` event

**Test file:** `lib/extraction/anthropic/__tests__/extractor.test.ts`
**Framework:** vitest

---

### Behavior: Zod failure retries once; one-category second failure → partial result (REQ-009, RN-021) — TC-025

**Given** a stub client returning malformed JSON twice for `juridico` and valid JSON for the other 3 categories
**When** `extract(input)` runs
**Then** the call resolves (does NOT reject); `output.warning` is a non-empty string; `output.failed_categories` equals `['juridico']`; `output.requisitos` contains only financiero, tecnico, and experiencia results; exactly 2 calls were attempted for `juridico`

### Behavior: All-category second Zod failure throws (REQ-009) — TC-026

**Given** a stub client returning malformed JSON twice for ALL four categories
**When** `extract(input)` runs
**Then** the call rejects with `ExtractorSchemaValidationError` (`code: 'EXTRACTOR_SCHEMA_VALIDATION'`); no partial result is returned

**Test file:** `lib/extraction/anthropic/__tests__/extractor.test.ts`
**Framework:** vitest

---

### Behavior: Cost telemetry log emitted on success with distinct token fields (REQ-011, NFR-03) — TC-027

**Given** a stub client returning usage with `cache_read_input_tokens: 5000` and `cache_creation_input_tokens: 3000`
**When** `extract(input)` resolves successfully
**Then** the captured logger received a `cost_telemetry` event containing `cache_read_input_tokens: 5000` and `cache_creation_input_tokens: 3000` as distinct numeric fields, alongside `input_tokens`, `output_tokens`, `cacheHitRatio`, `costUsd`, `perCategoria`, and `analisisId`

**Test file:** `lib/extraction/anthropic/__tests__/extractor.test.ts`
**Framework:** vitest

---

### Behavior: computeCallCost is correct to 6 decimals (REQ-011)

**Given** `usage = { input_tokens: 1000, cache_creation_input_tokens: 5000, cache_read_input_tokens: 10000, output_tokens: 500 }` and known prices
**When** `computeCallCost(usage, prices)` runs
**Then** the result equals the hand-computed sum to 6 decimal places

**Test file:** `lib/extraction/anthropic/__tests__/cost.test.ts`
**Framework:** vitest

---

## Task T5: Mock + Public Barrels

### Behavior: Mock satisfies the interface using only domain types (REQ-013, RN-002)

**Given** `class MockRequisitosExtractor implements RequisitosExtractor`
**When** typechecked
**Then** zero TypeScript errors; grep for `@anthropic-ai/sdk` in the file returns zero matches

**Test file:** `lib/extraction/mock/__tests__/mock.purity.test.ts`
**Framework:** vitest

---

### Behavior: Canned output lookup via composite key (REQ-013)

**Given** a `MockRequisitosExtractor` with `cannedOutputs.set('hash-A:emp-1', cannedA)` and an input with `pliego.file_hash === 'hash-A'` and `empresa.id === 'emp-1'`
**When** `extract(input)` runs
**Then** it returns `cannedA` verbatim

**Test file:** `lib/extraction/mock/__tests__/extractor.test.ts`
**Framework:** vitest

---

### Behavior: throwOn rejects with the configured error (REQ-013)

**Given** a `MockRequisitosExtractor` constructed with `throwOn: new ExtractorTimeoutError(...)`
**When** `extract(input)` runs
**Then** it rejects with the `ExtractorTimeoutError` instance

**Test file:** `lib/extraction/mock/__tests__/extractor.test.ts`
**Framework:** vitest

---

### Behavior: Top-level barrel exports interface + both implementations (REQ-013)

**Given** the import statement `import { RequisitosExtractor, AnthropicRequisitosExtractor, MockRequisitosExtractor } from '@/lib/extraction'`
**When** typechecked
**Then** all three named exports resolve

**Test file:** `lib/extraction/__tests__/barrel.test-d.ts` (type-test)
**Framework:** vitest (type-only)

---

## Task T6: Corpus + Acceptance + Provider-Isolation Grep

### Behavior: corpus.yaml is well-formed (REQ-014, TC-018)

**Given** `tests/fixtures/golden/extraction/corpus.yaml`
**When** parsed
**Then** every fixture entry has `pliego_path`, `empresa_profile_path`, `expected_requisitos_path`, `date_scored` (valid ISO date), `expert_reviewer`; every referenced path exists on disk

**Test file:** `tests/acceptance/requisitos-extraction.real.test.ts` (or a sibling manifest test)
**Framework:** vitest

---

### Behavior: Real-Anthropic acceptance test ≥85% agreement (REQ-015, NFR-04, RN-014)

**Given** the 3 golden fixtures and a real `Anthropic` client (CI-only with `ANTHROPIC_API_KEY`)
**When** the acceptance test runs `AnthropicRequisitosExtractor.extract()` per fixture
**Then** average requisito-level agreement across all 3 fixtures is ≥0.85; per-fixture agreement, cost, and cache-hit ratio logged

**Test file:** `tests/acceptance/requisitos-extraction.real.test.ts`
**Framework:** vitest (`test.skipIf(!process.env.ANTHROPIC_API_KEY)`)

---

### Behavior: Mock orchestrator integration test runs without API key (REQ-016, RN-002)

**Given** a `MockRequisitosExtractor` with canned outputs
**When** the orchestrator integration path runs
**Then** the test passes with zero `@anthropic-ai/sdk` references in this file and no `ANTHROPIC_API_KEY` required

**Test file:** `tests/acceptance/requisitos-extraction.mock.test.ts`
**Framework:** vitest

---

### Behavior: Provider-isolation grep enforces purity (REQ-017, NFR-05)

**Given** the recursively-scanned file tree under `lib/extraction/**` (excluding `__tests__/`, `*.test.*`, `tests/**`)
**When** the grep test runs
**Then** zero forbidden matches for `process.env.*`, `@supabase/`, `node:fs`/`net`/`http`, common loggers; `@anthropic-ai/sdk` matches allowed only under `lib/extraction/anthropic/**`; matches under `lib/extraction/types.ts`, `lib/extraction/mock/**`, `lib/extraction/index.ts` fail the test

**Test file:** `tests/ci/extraction-provider-isolation.test.ts`
**Framework:** vitest

---

## Task T4 (additions for rev 2): Tiered Habilitancia Classification + Categoria Narrowing

### Behavior: Structural-tier post-validation via section_heading (REQ-019, RN-016) — TC-020

**Given** a stub Anthropic client and an `IngestionResult`; the stub returns a requisito with `section_heading: 'capacidad juridica'` (matches `HABILITANTE_HEADING_PATTERNS[1]`)
**When** `extract()` runs
**Then** that requisito has `is_habilitante: true` and `is_habilitante_source: 'structural'`. The classification happens post-validation against the LLM-emitted `section_heading` field — no pre-call structural check, no additional LLM call.

**Given** the same client and a requisito whose `section_heading: 'condiciones tecnicas adicionales'` matches no pattern
**When** `extract()` runs
**Then** the requisito carries `is_habilitante` per the LLM payload and `is_habilitante_source: 'llm'`

**Test file:** `lib/extraction/anthropic/__tests__/extractor.tiered.test.ts`
**Framework:** vitest

---

### Behavior: Categoria=general payload triggers Zod rejection (REQ-009, REQ-021, RN-015) — TC-021

**Given** a stub Anthropic client returning a JSON payload with `categoria: 'general'` (otherwise valid) on the first call
**When** `extract()` runs
**Then** the first call's payload is rejected by `RequisitoExtractionPayloadSchema.refine()`; the regeneration prompt embeds the Zod error message; if the retry also returns `categoria: 'general'`, the call rejects with `ExtractorSchemaValidationError`

**Test file:** `lib/extraction/anthropic/__tests__/extractor.narrowing.test.ts`
**Framework:** vitest

---

### Behavior: Emitted Requisito.categoria is narrow (REQ-006, RN-015) — TC-022

**Given** a successful `extract()` call against a corpus fixture
**When** the returned `requisitos` array is inspected
**Then** every `Requisito.categoria` is one of `'juridico'`/`'financiero'`/`'tecnico'`/`'experiencia'`; zero requisitos carry `'general'`

**Test file:** `lib/extraction/anthropic/__tests__/extractor.tiered.test.ts`
**Framework:** vitest

---

## Task T6 (additions for rev 2): ≥80% Structural Acceptance Test

### Behavior: ≥80% of habilitante classifications are structural (REQ-020, RN-014, RN-016) — TC-019

**Given** the 3-fixture golden corpus and `AnthropicRequisitosExtractor` wired to a real Anthropic API key (CI-only)
**When** the acceptance test runs and aggregates `is_habilitante_source` across all habilitante-true requisitos in all fixtures
**Then** `count(source === 'structural') / count(is_habilitante === true) >= 0.80`. If `count(is_habilitante === true) === 0`, the assertion is skipped with a `console.warn` (corpus has zero habilitantes — visibly anomalous).

**Given** the same corpus
**When** `HABILITANTE_HEADING_PATTERNS` is patched to `[]` in a test-only branch
**Then** the acceptance test fails (zero structural classifications) — confirming the gate exercises the pattern list, not just the LLM

**Test file:** `tests/acceptance/requisitos-extraction.real.test.ts`
**Framework:** vitest (CI-only)

### Behavior: Clean fixture runs produce no warning (REQ-009, RN-021)

**Given** the 3-fixture golden corpus with well-formed pliegos
**When** the acceptance test runs
**Then** `output.warning === undefined` for every fixture run; any fixture producing `warning !== undefined` is logged as a quality signal (but does not fail CI on its own)

**Test file:** `tests/acceptance/requisitos-extraction.real.test.ts`
**Framework:** vitest (CI-only)

---

## Task T7: extraction-eval-harness Verified Gate

### Behavior: Verified step requires passing harness run (RN-019)

**Given** the `nybo-verify` agent is run against `requisitos-extraction`
**When** `eval-results/index.md` does NOT contain a passing entry for the current git hash
**Then** the Verified step blocks with a message indicating the harness gate is not satisfied

**Given** `eval-results/index.md` contains an entry for the current git hash with `aggregate_recall >= 0.85` and all per-tipo recalls `>= 0.80`
**When** `nybo-verify` runs
**Then** the Verified gate passes

**Test file:** (checked by nybo-verify, not a vitest file)
**Framework:** nybo-verify gate check
