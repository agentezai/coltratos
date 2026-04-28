# TDD Contract: semaforo-aggregation

Markdown TDD guide for nybo-run. The Executor Agent reads this file and writes failing tests
before implementing each task (Red phase), then implements (Green), then refactors (Refactor).

Framework throughout: **vitest** (per CORE.md / project conventions).

---

## Task T1: Thresholds + ADRs

### Behavior: thresholds.ts exports the three constants (REQ-011)

**Given** the file `lib/semaforo/thresholds.ts`
**When** imported and inspected
**Then** `VERDE_THRESHOLD === 0.9`, `AMARILLO_THRESHOLD === 0.7`, `SEMAFORO_RULES_VERSION === 'v1.0.0'`; all three are typed as their literal values (`as const`)

**Test file:** `lib/semaforo/__tests__/thresholds.test.ts`
**Framework:** vitest

---

### Behavior: SEMAFORO_RULES_VERSION matches semver shape (REQ-011, RN-011)

**Given** the imported `SEMAFORO_RULES_VERSION`
**When** matched against `/^v\d+\.\d+\.\d+$/`
**Then** the regex matches

**Test file:** `lib/semaforo/__tests__/thresholds.test.ts`
**Framework:** vitest

---

### Behavior: thresholds.ts is pure data (zero non-primitive imports)

**Given** the source of `lib/semaforo/thresholds.ts`
**When** scanned for `import` statements
**Then** zero imports are found (TypeScript `as const` is built-in, not an import)

**Test file:** `lib/semaforo/__tests__/thresholds.purity.test.ts`
**Framework:** vitest

---

## Task T2: aggregateSemaforo

### Behavior: pure + deterministic (REQ-001, REQ-002, RN-001, RN-007)

**Given** any `Requisito[]` input
**When** `aggregateSemaforo(input)` is called twice and the input is `structuredClone`d before/after
**Then** both outputs are deeply equal AND the input is unchanged

**Test file:** `lib/semaforo/__tests__/aggregate.test.ts`
**Framework:** vitest

---

### Behavior: knockout rule fires on a single failing habilitante (REQ-004, RN-003)

**Given** 10 requisitos, 9 with `cumple: true`, 1 with `is_habilitante: true, cumple: false`
**When** aggregated
**Then** `output.overall === 'rojo'`; the failing requisito appears in `output.blockers`

**Test file:** `lib/semaforo/__tests__/aggregate.test.ts`
**Framework:** vitest

---

### Behavior: knockout applies per categoría independently (REQ-004, RN-003)

**Given** 1 habilitante-failing in juridico, 10 cumple-true in tecnico
**When** aggregated
**Then** `byCategoria.juridico === 'rojo'`; `byCategoria.tecnico === 'verde'`; `overall === 'rojo'`

**Test file:** `lib/semaforo/__tests__/aggregate.test.ts`
**Framework:** vitest

---

### Behavior: percentage thresholds inclusive at lower bound (REQ-005, RN-004)

**Given** 10 requisitos, 9 cumple-true, 1 cumple-false, no habilitantes
**When** aggregated
**Then** `stats.cumplePct === 0.9`; `overall === 'verde'`

**Given** 100 requisitos, 89 cumple-true, 11 cumple-false
**When** aggregated
**Then** `stats.cumplePct === 0.89`; `overall === 'amarillo'`

**Given** 10 requisitos, 7 cumple-true, 3 cumple-false
**When** aggregated
**Then** `stats.cumplePct === 0.7`; `overall === 'amarillo'`

**Given** 100 requisitos, 69 cumple-true, 31 cumple-false
**When** aggregated
**Then** `stats.cumplePct === 0.69`; `overall === 'rojo'`

**Test file:** `lib/semaforo/__tests__/aggregate.test.ts`
**Framework:** vitest

---

### Behavior: sin-info excluded from denominator (REQ-005, RN-004)

**Given** 10 requisitos: 8 cumple-true, 0 cumple-false, 2 cumple-null
**When** aggregated
**Then** `stats.cumplePct === 1.0`; `overall === 'verde'`

**Test file:** `lib/semaforo/__tests__/aggregate.test.ts`
**Framework:** vitest

---

### Behavior: all-sin-info → amarillo with cumplePct = 0 (no NaN) (REQ-007, RN-006, RN-012)

**Given** 5 requisitos all with `cumple: null`, no habilitantes failing
**When** aggregated
**Then** `overall === 'amarillo'`; `stats.cumplePct === 0`; not `NaN`

**Test file:** `lib/semaforo/__tests__/aggregate.test.ts`
**Framework:** vitest

---

### Behavior: empty array → rojo with empty buckets (REQ-006, RN-005)

**Given** `requisitos: []`
**When** aggregated
**Then** `overall === 'rojo'`; `byCategoria.juridico === byCategoria.financiero === byCategoria.tecnico === byCategoria.experiencia === 'amarillo'`; `blockers === []`; `stats === { total: 0, cumple: 0, noCumple: 0, sinInfo: 0, cumplePct: 0 }`

**Test file:** `lib/semaforo/__tests__/aggregate.test.ts`
**Framework:** vitest

---

### Behavior: empty categoría → amarillo (REQ-008, RN-009)

**Given** 5 cumple-true requisitos all in juridico, zero requisitos in other categorías
**When** aggregated
**Then** `byCategoria.juridico === 'verde'`; the other three categorías are `'amarillo'`

**Test file:** `lib/semaforo/__tests__/aggregate.test.ts`
**Framework:** vitest

---

### Behavior: general-categoría requisito triggers warn + exclusion (REQ-009, RN-008)

**Given** 1 requisito with `categoria: 'general'` + 5 valid juridico cumple-true requisitos AND a `console.warn` spy installed
**When** aggregated
**Then** the warn was called once with the literal message `'[semaforo-aggregation] contract violation: general-categoria requisito received'`; the function does NOT throw; `stats.total === 5`; `overall === 'verde'`

**Test file:** `lib/semaforo/__tests__/aggregate.test.ts`
**Framework:** vitest

---

### Behavior: blockers list contains only habilitante-failing requisitos (REQ-010, RN-010)

**Given** requisitos: req-A `is_habilitante: true, cumple: false`; req-B `is_habilitante: false, cumple: false`; req-C `is_habilitante: true, cumple: null`; req-D `is_habilitante: true, cumple: true`
**When** aggregated
**Then** `blockers === [req-A]`; req-B / req-C / req-D are NOT present

**Test file:** `lib/semaforo/__tests__/aggregate.test.ts`
**Framework:** vitest

---

### Behavior: blockers list deterministic ordering (REQ-010, RN-010)

**Given** multiple habilitante-failing requisitos across categorías with varied descripciones, in shuffled input order
**When** aggregated twice with two different orderings of the same input set
**Then** `blockers` is identical across both calls; sorted first by categoría in fixed order (juridico, financiero, tecnico, experiencia), then by descripción ascending alphabetically

**Test file:** `lib/semaforo/__tests__/aggregate.test.ts`
**Framework:** vitest

---

### Behavior: stats invariant + cumplePct precision (REQ-012, RN-012)

**Given** any `Requisito[]` input
**When** aggregated
**Then** `stats.cumple + stats.noCumple + stats.sinInfo === stats.total`; `stats.cumplePct` is in `[0, 1]` and is finite (not NaN, not Infinity); rounded to 6 decimal places

**Test file:** `lib/semaforo/__tests__/aggregate.test.ts`
**Framework:** vitest

---

### Behavior: only side effect is console.warn on contract violations (REQ-002, REQ-009, RN-001)

**Given** stubs for `console.warn`/`log`/`error`/`info`, `process.env` access, `Date.now`, `Math.random`
**When** aggregated against any non-violating input
**Then** zero invocations of any stub

**Given** the same stubs and an input containing a `categoria: 'general'` requisito
**When** aggregated
**Then** `console.warn` is the only stub touched; warn is called exactly once per violator

**Test file:** `lib/semaforo/__tests__/aggregate.test.ts`
**Framework:** vitest

---

### Behavior: literal threshold numbers do not appear in aggregate.ts (REQ-011, RN-011)

**Given** the source of `lib/semaforo/aggregate.ts`
**When** grepped for the literals `0.9`, `0.7`, `90`, `70`
**Then** zero matches

**Test file:** `lib/semaforo/__tests__/aggregate.purity.test.ts`
**Framework:** vitest

---

## Task T3: Tests + Golden Corpus + Isolation Grep + Public Barrel

### Behavior: golden corpus replays verbatim (REQ-014, RN-013)

**Given** the 5 fixtures at `tests/fixtures/golden/semaforo/` (all-habilitantes-fail, borderline-89pct, borderline-90pct, all-sin-info, mixed-realistic)
**When** `aggregateSemaforo(fixture.input)` runs for each fixture
**Then** the output is `toEqual(fixture.expected)` for every fixture

**Test file:** `tests/fixtures/golden/semaforo/golden.test.ts`
**Framework:** vitest

---

### Behavior: branch coverage 100% (NFR-02)

**Given** the test suite under `lib/semaforo/__tests__/`
**When** `vitest run --coverage` runs against `aggregate.ts` and `thresholds.ts`
**Then** branch coverage on each of those files is 100%

**Test file:** (CI step / configured threshold)
**Framework:** vitest --coverage (v8 or istanbul)

---

### Behavior: provider-isolation grep enforces purity (REQ-013, NFR-03)

**Given** the file tree under `lib/semaforo/**` (excluding `__tests__/`, `*.test.*`, `tests/**`)
**When** the grep test runs
**Then** zero matches for `@supabase/`, `@anthropic-ai/sdk`, `node:fs/net/http`, `pino`/`winston`/`bunyan`/`@logtape/`, `process.env`

**Test file:** `tests/ci/semaforo-provider-isolation.test.ts`
**Framework:** vitest

---

### Behavior: golden fixtures carry realistic is_habilitante_source distribution (REQ-014, RN-014, TC-018)

**Given** all `*.json` fixtures under `tests/fixtures/golden/semaforo/` and the aggregate count of requisitos with `is_habilitante === true` grouped by `is_habilitante_source` across all fixtures combined
**When** the manifest test runs
**Then** `count('structural') / count(total habilitante-true) >= 0.8`. If total habilitante-true count is zero, the assertion is skipped

**Test file:** `tests/fixtures/golden/semaforo/manifest.test.ts`
**Framework:** vitest

---

### Behavior: blockers passthrough is_habilitante_source (REQ-015, RN-014)

**Given** an input where each habilitante-failing requisito carries a known `is_habilitante_source` (`'structural'` for one, `'llm'` for another)
**When** `aggregateSemaforo(input)` runs
**Then** each blocker in `output.blockers` carries the same `is_habilitante_source` value it had in the input — the function does NOT modify it. The function reads `is_habilitante` only; `is_habilitante_source` is passthrough metadata

**Test file:** `lib/semaforo/__tests__/aggregate.test.ts`
**Framework:** vitest

---

### Behavior: public barrel resolves expected exports (T3 Done When)

**Given** `import { aggregateSemaforo, VERDE_THRESHOLD, AMARILLO_THRESHOLD, SEMAFORO_RULES_VERSION } from '@/lib/semaforo'`
**When** typechecked
**Then** all four named exports resolve

**Test file:** `lib/semaforo/__tests__/barrel.test-d.ts`
**Framework:** vitest (type-only)
