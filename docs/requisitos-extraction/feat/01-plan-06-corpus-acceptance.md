# T6: Golden Corpus + Acceptance Tests + Provider-Isolation Grep

## Scope

- `tests/fixtures/golden/extraction/` — NEW directory. 3 golden fixtures + `corpus.yaml` manifest.
- `tests/acceptance/requisitos-extraction.real.test.ts` — NEW. Real-Anthropic acceptance test (CI-only with `ANTHROPIC_API_KEY`).
- `tests/acceptance/requisitos-extraction.mock.test.ts` — NEW. Orchestrator-integration test against `MockRequisitosExtractor`.
- `tests/ci/extraction-provider-isolation.test.ts` — NEW. Provider-isolation grep CI test.

## Changes

### Golden corpus (`tests/fixtures/golden/extraction/`)

- 3 fixture directories. Reuse `tests/fixtures/pliegos/` PDFs where possible (any 3 of the 5 from pdf-ingestion's corpus). For each fixture:
  - `pliego.pdf` (or symlink to `tests/fixtures/pliegos/<name>.pdf`).
  - `segments.json` — pre-computed `Segment[]` from running `parsePliegoPdf` on the pliego (snapshot, regenerable). Excludes `is_synthetic` and `general` per the orchestrator's contract.
  - `empresa.json` — a hand-authored Empresa profile pinning specific qualification levels (financial ratios, technical capacity, experience).
  - `expected_requisitos.json` — manually curated by the founder (v1) listing the requisitos that an expert reviewer agreed with: `categoria` (narrow `RequisitoCategoria` — `juridico`/`financiero`/`tecnico`/`experiencia`, NEVER `general`), `descripcion`, `cumple` verdict, `citation_segment_id`, `citation_quote`, `is_habilitante` (boolean), `is_habilitante_source` (`'structural'` or `'llm'`; `'manual'` not produced in v1). Total ~10–25 requisitos per fixture.
  - **Distribution constraint per REQ-020:** across all 3 fixtures combined, the count of requisitos with `is_habilitante === true AND is_habilitante_source === 'structural'` MUST be ≥80% of the total habilitante-true count. The fixture authoring step is iterative — if the structural-tier patterns + segment headings don't naturally produce ≥80%, either expand `HABILITANTE_HEADING_PATTERNS` (a domain-model edit + version bump) or revise the fixtures to use pliegos with cleaner habilitante section headings. **The pattern list is co-evolved with this corpus.**
- `corpus.yaml` manifest (REQ-014, TC-018):
  ```yaml
  version: 1
  fixtures:
    - id: fixture-01-clean-pliego
      pliego_path: ../pliegos/clean-pliego-001.pdf
      empresa_profile_path: ./fixture-01-clean-pliego/empresa.json
      expected_requisitos_path: ./fixture-01-clean-pliego/expected_requisitos.json
      date_scored: '2026-04-26'
      expert_reviewer: 'founder'
    # ... (2 more)
  ```

### `requisitos-extraction.real.test.ts` (REQ-015, NFR-04, RN-014)

- Skip in test environments without `ANTHROPIC_API_KEY` (do NOT fail — vitest `test.skipIf(!process.env.ANTHROPIC_API_KEY)`).
- For each fixture:
  1. Load `pliego`, `segments`, `empresa`, `expectedRequisitos` from disk.
  2. Instantiate `AnthropicRequisitosExtractor({ client: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), logger: testLogger })`.
  3. Call `extract({ pliego, segments, empresa, analisisId })`.
  4. Compute requisito-level agreement:
     - For each `expected` requisito: find the `actual` requisito with same `categoria` and best semantic-equivalence score on `descripcion`. The semantic-equivalence function is defined in this test file initially (e.g., normalized-token Jaccard ≥0.6) and called out in a comment as a v2 candidate to swap to a stronger comparator (LLM-judge or embedding similarity).
     - Match also requires identical `cumple` verdict.
     - Agreement = matched / total expected.
  5. Average agreement across fixtures.
  6. Assert `averageAgreement >= 0.85` (NFR-04, RN-014).
  7. Console-log per-fixture agreement, per-fixture cost, total cost, average cache-hit ratio (from `testLogger`'s captured `cost_telemetry` events).
  8. **Tiered-classifier acceptance (REQ-020, RN-014, RN-016, TC-019).** After step 5, aggregate `is_habilitante_source` across all habilitante-true requisitos in all fixtures. Assert that `count(source === 'structural') / count(is_habilitante === true) >= 0.80`. If `count(is_habilitante === true) === 0`, skip the assertion (with a console.warn so a corpus that has zero habilitantes is visibly anomalous). This gate fails CI if `HABILITANTE_HEADING_PATTERNS` is empty or under-specified — the structural-tier pattern list MUST do real work.
  9. **Categoria-narrowness assertion (TC-022).** Walk every emitted `Requisito` and assert `categoria !== 'general'`. The narrow `RequisitoCategoria` type already enforces this at compile time, but the runtime assertion catches any path where the type might widen (e.g., a future Zod schema bug).

### `requisitos-extraction.mock.test.ts` (REQ-016, RN-002)

- Instantiate `MockRequisitosExtractor` with canned outputs for 2 fixtures.
- Exercise the orchestrator integration path (this test will be expanded once the orchestrator spec ships; v1 placeholder asserts the mock's `extract()` returns the canned data given the right key, validating the substitution mechanism).
- Zero `@anthropic-ai/sdk` imports in this file (verifiable by the grep test).

### `extraction-provider-isolation.test.ts` (REQ-017, NFR-05)

- Recursively walk `lib/extraction/**`. Exclude `__tests__/`, files matching `*.test.*`, and `tests/**`.
- For each file, read its source and check for forbidden patterns. **Forbidden everywhere under `lib/extraction/`**:
  - `import .* from '@supabase/`
  - `import .* from 'node:fs'` / `'node:net'` / `'node:http'` (and any subpath)
  - Common logger module imports: `'pino'`, `'winston'`, `'bunyan'`, `'@logtape/'` — list maintained in the test file.
  - `process\.env\.[A-Z_]+` — any direct env read.
- **`@anthropic-ai/sdk`** is allowed ONLY under `lib/extraction/anthropic/**`. Under `lib/extraction/types.ts`, `lib/extraction/mock/**`, `lib/extraction/index.ts`, or any sibling implementation directory: forbidden.
- Test passes iff all forbidden patterns return zero matches in the appropriate scope.

### Design Rationale (Quality Gate, Defense in Depth)

The corpus is the **product** quality gate. The mock orchestrator test is the **architectural** quality gate (proves the interface is provider-agnostic). The grep test is the **structural** quality gate (proves the rule is enforced in the import graph). Three independent gates with different failure modes — each catches a different class of regression. Per RN-014, lowering any of these gates requires a spec revision; that's the contract that ties test rigor to the product-economics premise.

## Dependencies

Requires **T5** (both implementations + barrels exist).

Requires `pdf-ingestion` shipped (the corpus reuses PDFs from `tests/fixtures/pliegos/` — if pdf-ingestion's corpus isn't in place yet, this T6 must include the relevant fixture PDFs directly).

## Done When

- [ ] 3 fixture directories exist under `tests/fixtures/golden/extraction/` with `pliego.pdf` (or symlink), `segments.json`, `empresa.json`, `expected_requisitos.json`.
- [ ] `corpus.yaml` lists all 3 fixtures with the schema in TC-018 — every referenced path resolves.
- [ ] `requisitos-extraction.real.test.ts` runs in CI with the API key, asserts ≥85% average agreement, and logs per-fixture cost + cache-hit ratio.
- [ ] `requisitos-extraction.mock.test.ts` runs without an API key and validates the `MockRequisitosExtractor` substitution.
- [ ] `extraction-provider-isolation.test.ts` runs in unit-test mode (no Anthropic credentials needed) and asserts zero forbidden matches in the appropriate scopes.
- [ ] Per-fixture average agreement ≥0.85; total cost across all 3 fixtures recorded for human review.
- [ ] Per-fixture cache-hit ratio ≥0.85 after the warmup (i.e., on the second-or-later call within the test run).
- [ ] Tiered-classifier gate: ≥80% of habilitante-true requisitos (corpus-wide) carry `is_habilitante_source === 'structural'` (TC-019, REQ-020).
- [ ] Categoria-narrowness gate: zero emitted requisitos have `categoria === 'general'` (TC-022).
- [ ] All `expected_requisitos.json` fixtures carry `is_habilitante` + `is_habilitante_source` annotations consistent with the structural pattern matches expected from `HABILITANTE_HEADING_PATTERNS@v1.0.0`.
- [ ] `npm run test` passes (excluding the real-Anthropic test if no key is present).
- [ ] CI pipeline configuration update: a separate CI job runs the real-Anthropic test on `main` branch pushes (out of this PR's diff if CI configuration is centralized; in-scope if not — note in PR description).
