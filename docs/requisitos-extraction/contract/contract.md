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

### Behavior: Verbatim NFD-normalized substring → verified (REQ-010, RN-012)

**Given** a segment with `contenido: 'CAPACIDAD JURÍDICA. El proponente debe acreditar...'` and a quote `'Capacidad Juridica'`
**When** `verifyCitation({ quote, segment })` runs
**Then** `{ verified: true }`

**Test file:** `lib/extraction/anthropic/__tests__/validation.test.ts`
**Framework:** vitest

---

### Behavior: Paraphrased quote → not verified, no throw (REQ-010, RN-012)

**Given** a segment with `contenido: 'El proponente debe presentar el certificado de existencia.'` and a quote `'must present an existence certificate'`
**When** `verifyCitation` runs
**Then** `{ verified: false }`; no error thrown

**Test file:** `lib/extraction/anthropic/__tests__/validation.test.ts`
**Framework:** vitest

---

### Behavior: Cited segment missing from input → citation_verified: false (REQ-010, RN-012)

**Given** a payload referencing `citation_segment_id: 'seg-999'` and a `segments` array with no such id
**When** `assembleRequisitos(payload, segments)` runs
**Then** the returned requisito has `citation_verified: false`; no error thrown

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

### Behavior: Empty segments rejected synchronously (REQ-002, RN-005)

**Given** a stub `Anthropic` client that records calls and an `ExtractorInput` with `segments: []`
**When** `extract(input)` runs
**Then** it rejects with `ExtractorInputInvalidError` (`code: 'EXTRACTOR_INPUT_INVALID'`); zero `client.messages.create` calls were recorded

**Test file:** `lib/extraction/anthropic/__tests__/extractor.test.ts`
**Framework:** vitest

---

### Behavior: Up to 4 concurrent calls, one per categoría (REQ-006, RN-007)

**Given** a stub client recording call arguments + start times, and segments spanning all 4 categorías
**When** `extract(input)` runs
**Then** exactly 4 calls were recorded, all initiated within the same microtask tick (concurrent), each carrying segments from one categoría only

**Test file:** `lib/extraction/anthropic/__tests__/extractor.test.ts`
**Framework:** vitest

---

### Behavior: general / is_synthetic segments skipped + logged (REQ-006, RN-007)

**Given** an input with one segment `categoria: 'general'`, one with `is_synthetic: true`, and 2 valid jurídico segments
**When** `extract(input)` runs
**Then** exactly 1 call was issued (jurídico); the captured logger received exactly 2 `contract_violation` log entries with the skipped segment ids

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

### Behavior: Zod failure retries once, second failure throws (REQ-009, RN-013)

**Given** a stub client returning malformed JSON on the first call for a categoría and valid JSON on the second
**When** `extract(input)` runs
**Then** the call resolves successfully; exactly 2 calls recorded for that categoría; the second call's `messages[0].content` includes the Zod error message

**Given** a stub client returning malformed JSON twice
**When** `extract(input)` runs
**Then** the call rejects with `ExtractorSchemaValidationError`; exactly 2 calls were attempted

**Test file:** `lib/extraction/anthropic/__tests__/extractor.test.ts`
**Framework:** vitest

---

### Behavior: Cost telemetry log emitted on success (REQ-011, NFR-03)

**Given** a stub client returning known usage data
**When** `extract(input)` resolves successfully
**Then** the captured logger received a `cost_telemetry` event with `{ costUsd, cacheReadRatio, perCategoria, analisisId }` populated

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

### Behavior: Structural-tier bypass (REQ-019, RN-016) — TC-020

**Given** a stub Anthropic client and an input including a segmento with `heading_normalized: 'capacidad juridica'` (matches `HABILITANTE_HEADING_PATTERNS[1]`)
**When** `extract()` runs
**Then** every requisito emitted from that segmento has `is_habilitante: true` and `is_habilitante_source: 'structural'`. The recorded prompt for that segmento's categoría omits the "classify is_habilitante" instruction (the extractor populates the field from the structural map post-validation).

**Given** the same client and a segmento with `heading_normalized: 'condiciones tecnicas adicionales'` (matches no pattern)
**When** `extract()` runs
**Then** the requisitos from that segmento carry `is_habilitante` per the LLM payload and `is_habilitante_source: 'llm'`

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
