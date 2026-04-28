# T3: Tests + Golden Corpus + Isolation Grep + Public Barrel

## Scope

- `lib/semaforo/__tests__/aggregate.test.ts` — NEW. Table-driven unit tests covering every threshold boundary, knockout combination, edge case, contract violation, and stats invariant.
- `tests/fixtures/golden/semaforo/` — NEW directory. 5 hand-crafted Requisito[] inputs paired with expected Semaforo outputs.
- `tests/fixtures/golden/semaforo/*.test.ts` — NEW. Golden-fixture replay test asserting `aggregateSemaforo(input)` deeply equals each expected output.
- `tests/ci/semaforo-provider-isolation.test.ts` — NEW. Provider-isolation grep CI test.
- `lib/semaforo/index.ts` — NEW. Public barrel.

> **Note:** there is **no CI script** enforcing the ≤80-line target. The constraint lives in the spec narrative (NFR-01) as a PR-review heuristic. A hard automated gate would eventually conflict with a legitimate edge-case addition and become noise — trust PR review to enforce intent rather than line count.

## Changes

### `aggregate.test.ts` — table-driven unit tests

Use vitest's `it.each` (or `describe.each`) over a typed test-case table:

```typescript
type TestCase = {
  name: string
  input: Requisito[]
  expected: Semaforo
  warns?: number  // count of expected console.warn calls
}
```

Cover at minimum:

- **Threshold boundaries (TC-004, TC-005):**
  - `cumplePct === 0.9` → verde
  - `cumplePct === 0.89` → amarillo
  - `cumplePct === 0.7` → amarillo
  - `cumplePct === 0.69` → rojo
  - Use both 10-requisito and 100-requisito cases so rounding surfaces (`89/100 = 0.89` vs `9/10 = 0.9`).
- **Knockout precedence (TC-002, TC-003):**
  - 95% cumplePct + 1 habilitante-failing → rojo (knockout overrides percentage).
  - Knockout in juridico, all-cumple in tecnico → overall rojo, byCategoria.juridico rojo, byCategoria.tecnico verde.
  - Multiple knockouts across categorías all appear in blockers, sorted.
- **Sin-información (TC-006, TC-007):**
  - 8 cumple + 2 null + 0 false → cumplePct 1.0, verde.
  - 5 null + 0 cumple + 0 false → amarillo (all-null edge case), cumplePct 0 (no NaN).
  - Mixed null + cumple + false → denominator excludes nulls.
- **Empty input (TC-008):**
  - `[]` → rojo overall, all-amarillo byCategoria, zeroed stats.
- **Empty categoría (TC-009):**
  - 5 juridico cumple + 0 in other categorías → byCategoria.juridico verde, others amarillo.
- **Contract violation (TC-010):**
  - 1 general + 5 juridico cumple → 1 warn call, stats.total === 5, overall verde.
  - 0 valid + 1 general → 1 warn call, treated as empty array for the rest of the algorithm.
- **Blockers ordering (TC-011, TC-012):**
  - Multiple habilitantes failing across categorías + varying descripciones → output is sorted (categoria fixed-order, descripcion alphabetical asc).
  - Same input shuffled → output identical.
  - Non-habilitante false → NOT in blockers.
  - Habilitante null → NOT in blockers.
- **Stats invariant (TC-013):**
  - Property-based: for any input, `cumple + noCumple + sinInfo === total`.
  - `cumplePct` always in `[0, 1]`, never NaN, never Infinity.
- **Determinism (TC-001, NFR-04):**
  - Call twice with same input → outputs deeply equal.
  - Input array unchanged after the call.
- **Side-effect purity (TC-017):**
  - Stub `console.warn`, `console.log`, `console.error`, `console.info`, `process.env`, `Date.now`, `Math.random`. Run any non-violating input. Assert all stubs untouched.
  - Run a violating input. Assert `console.warn` is the only stub touched.

### Coverage gate (NFR-02)

- Run `vitest run --coverage` (project must have v8 or istanbul coverage configured).
- Assert per-file branch coverage ≥ 100% for `lib/semaforo/aggregate.ts` and `lib/semaforo/thresholds.ts`.
- Add a CI step that fails the build if branch coverage drops below 100% on either file. Lines/functions/statements coverage are not gated separately — branch coverage subsumes them for a function this small.

### Golden fixtures (REQ-014, RN-013, RN-014)

Five fixtures at `tests/fixtures/golden/semaforo/` — one JSON file per fixture, each carrying `{ _comment: string, input: Requisito[], expected: Semaforo }`:

- `01-all-habilitantes-fail.json` — 4 requisitos, all `is_habilitante: true, cumple: false` across 4 categorías. Expected: overall rojo, all categorías rojo, blockers has 4, sorted.
- `02-borderline-89pct-amarillo.json` — 100 requisitos, 89 cumple, 11 false (no habilitantes). Expected: overall amarillo, cumplePct 0.89.
- `03-borderline-90pct-verde.json` — 100 requisitos, 90 cumple, 10 false (no habilitantes). Expected: overall verde, cumplePct 0.9.
- `04-all-sin-info.json` — 8 requisitos all `cumple: null` distributed across 3 categorías. Expected: overall amarillo, byCategoria amarillo for the 3 with data + amarillo for the empty 4th, cumplePct 0.
- `05-mixed-realistic.json` — ~25 requisitos representing a plausible real pliego: mix of cumple/no cumple/null, one habilitante-failing in financiero. Expected: overall rojo (knockout), per-categoría mixed, blockers has 1.

**Authoring constraint (REQ-014, TC-018):** every requisito carries `is_habilitante_source ∈ {'structural', 'llm', 'manual'}`. Across all fixtures combined, ≥80% of `is_habilitante: true` requisitos MUST carry `is_habilitante_source: 'structural'` so the fixtures faithfully model the production tiered classifier. A fixture that hand-picks all-`'llm'` sources would invent a regression net against unrealistic data — the manifest test (TC-018) enforces this.

Each JSON file's leading commentary (in a top-level `_comment` field, since JSON has no comments) documents the scenario, which RNs/REQs it exercises, AND the breakdown of `is_habilitante_source` values for any habilitante-true requisitos — making the structural-distribution intent visible at fixture-author time, not just at test-run time.

### Golden replay test

`tests/fixtures/golden/semaforo/golden.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'  // ALLOWED in tests/
import { join } from 'node:path'
import { aggregateSemaforo } from '@/lib/semaforo'

const DIR = 'tests/fixtures/golden/semaforo'
const fixtures = readdirSync(DIR).filter(f => f.endsWith('.json'))

describe('semaforo golden corpus', () => {
  it.each(fixtures)('%s', (file) => {
    const { input, expected } = JSON.parse(readFileSync(join(DIR, file), 'utf-8'))
    expect(aggregateSemaforo(input)).toEqual(expected)
  })
})
```

This test lives under `tests/`, NOT under `lib/semaforo/__tests__/`, because it needs `node:fs` to read the corpus. The provider-isolation grep explicitly excludes `tests/**` for this reason.

### Provider-isolation grep (REQ-013, NFR-03)

`tests/ci/semaforo-provider-isolation.test.ts`:

- Recursively walk `lib/semaforo/**`. Exclude `__tests__/`, files matching `*.test.*`, and `tests/**`.
- For each file, scan for forbidden patterns:
  - `import .* from '@supabase/`
  - `import .* from '@anthropic-ai/sdk'`
  - `import .* from 'node:fs'` / `'node:net'` / `'node:http'`
  - Common logger module names: `'pino'`, `'winston'`, `'bunyan'`, `'@logtape/'`
  - `process\.env\.[A-Z_]+`
- Test passes iff zero matches found in the scoped tree.

### `is_habilitante_source` distribution check (REQ-014, RN-014, TC-018)

`tests/fixtures/golden/semaforo/manifest.test.ts` (or co-located in `golden.test.ts`):

- Load all `*.json` fixtures under `tests/fixtures/golden/semaforo/`.
- Aggregate the count of requisitos with `is_habilitante === true` grouped by `is_habilitante_source` across all fixtures combined.
- Assert: `count('structural') / count(total habilitante-true) >= 0.8`. Skip the assertion if total habilitante-true count is zero.
- This protects against fixture authors silently drifting toward all-`'llm'` sources, which would invalidate the fixtures as a representative regression net (RN-014).

### Public barrel (`lib/semaforo/index.ts`)

```typescript
export { aggregateSemaforo } from './aggregate'
export {
  VERDE_THRESHOLD,
  AMARILLO_THRESHOLD,
  SEMAFORO_RULES_VERSION,
} from './thresholds'
```

The orchestrator (future spec) imports `aggregateSemaforo` and `SEMAFORO_RULES_VERSION` from `'@/lib/semaforo'`. Internal helpers (`computeStats`, `applyRules`, `CATEGORIA_ORDER`) remain file-private inside `aggregate.ts`.

### Design Rationale (Defense in Depth)

Five independent quality gates, each catching a different failure mode:
- **Unit tests** catch algorithm bugs.
- **Golden fixtures** catch threshold drift (anyone "cleaning up" the rules without bumping `SEMAFORO_RULES_VERSION` will see a fixture diff).
- **Branch coverage** catches dead code and untested branches.
- **Provider-isolation grep** catches accidental dependency creep (someone "just" adding a Supabase call to log telemetry).
- **`is_habilitante_source` distribution check** catches fixture-author drift away from realistic classifier behavior (RN-014).

Code-economy is intentionally NOT a CI gate — the ≤80-line target is a PR-review heuristic only (NFR-01). The guarantee is structural: any rule change shows up in at least 2 of these gates simultaneously, making it visible in the PR diff.

## Dependencies

Requires **T2** (the `aggregate.ts` function exists).

## Done When

- [ ] `lib/semaforo/__tests__/aggregate.test.ts` covers every test case TC-001 → TC-013, TC-017 with table-driven structure.
- [ ] `vitest run --coverage` reports 100% branch coverage on `aggregate.ts` and `thresholds.ts`.
- [ ] 5 golden fixtures exist at `tests/fixtures/golden/semaforo/` with the names + scenarios above; each carries `_comment`, `input`, `expected`; every requisito carries `is_habilitante_source`.
- [ ] Golden replay test passes for all 5 fixtures (TC-016).
- [ ] Provider-isolation grep test (TC-015) passes with zero violations.
- [ ] `is_habilitante_source` distribution check (TC-018) passes — across all fixtures combined, ≥80% of `is_habilitante: true` requisitos carry `'structural'`.
- [ ] `lib/semaforo/index.ts` re-exports `aggregateSemaforo`, `VERDE_THRESHOLD`, `AMARILLO_THRESHOLD`, `SEMAFORO_RULES_VERSION`.
- [ ] A consumer compile-check fixture confirms `import { aggregateSemaforo, SEMAFORO_RULES_VERSION } from '@/lib/semaforo'` resolves cleanly.
- [ ] `npm run test` passes.
- [ ] `npm run typecheck` passes.
