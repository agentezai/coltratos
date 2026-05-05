# TDD Contract: semaforo-aggregation

Markdown TDD guide for nybo-run. Executor reads this before implementing each task —
write failing tests first (Red), implement (Green), refactor (Refactor).

Framework: **vitest** (per CORE.md).

---

## Task T1: Thresholds + ADRs

### Behavior: constants export with correct values (REQ-012)

**Given** `import { SEMAFORO_RULES_VERSION, MIN_N_FOR_THRESHOLD, ROJO_THRESHOLD, AMARILLO_THRESHOLD, FINANCIERO_VERDE_MARGIN, TECNICO_COSINE_MIN, DEFINITORIO_DOCUMENT_TYPES, OBTAINABLE_DOCUMENT_TYPES } from 'lib/semaforo/thresholds'`
**When** each constant is inspected
**Then** `SEMAFORO_RULES_VERSION === 'v2.0.0'`; `MIN_N_FOR_THRESHOLD === 5`; `ROJO_THRESHOLD === 0.30`; `AMARILLO_THRESHOLD === 0.50`; `FINANCIERO_VERDE_MARGIN === 0.10`; `TECNICO_COSINE_MIN === 0.80`; `DEFINITORIO_DOCUMENT_TYPES.length === 5`; `OBTAINABLE_DOCUMENT_TYPES.length === 7`

**Test file:** `lib/semaforo/__tests__/thresholds.test.ts`

### Behavior: thresholds.ts has zero imports

**Given** the source of `lib/semaforo/thresholds.ts`
**When** scanned for `import` statements
**Then** zero found

**Test file:** `lib/semaforo/__tests__/thresholds.test.ts`

---

## Task T2: Jurídico Matcher

### Behavior: definitorio types — resolved match → verde (REQ-004, RN-004)

**Given** `req = { document_type: 'rup_vigente' }` AND `profile.legal_data.rup_vigente = true`
**When** `matchJuridico(req, profile)` called
**Then** `{ verdict: 'verde', confidence: 1.0, definitorio: true, reason.length ≤ 200 }`

**Test file:** `lib/semaforo/__tests__/juridico-matcher.test.ts`

### Behavior: definitorio types — confirmed failure → rojo (REQ-004, REQ-005, RN-005)

**Given** `req = { document_type: 'rup_vigente' }` AND `profile.legal_data.rup_vigente = false`
**When** matched
**Then** `{ verdict: 'rojo', definitorio: true, confidence: 1.0 }`

**Test file:** `lib/semaforo/__tests__/juridico-matcher.test.ts`

### Behavior: definitorio unresolved → amarillo (RN-013)

**Given** `req = { document_type: 'rup_vigente' }` AND `profile.legal_data.rup_vigente = undefined`
**When** matched
**Then** `{ verdict: 'amarillo', definitorio: true, confidence: 0.3 }`

**Test file:** `lib/semaforo/__tests__/juridico-matcher.test.ts`

### Behavior: obtainable type absent → amarillo heuristic (REQ-004, RN-013)

**Given** `req = { document_type: 'paz_y_salvo_tributario' }` AND document absent in profile
**When** matched
**Then** `{ verdict: 'amarillo', definitorio: false, confidence: 0.5 }`

**Test file:** `lib/semaforo/__tests__/juridico-matcher.test.ts`

### Behavior: unknown document_type → warn + rojo (RN-003)

**Given** `req = { document_type: 'unknown_type_xyz' }` AND a `console.warn` spy
**When** matched
**Then** warn called once; `{ verdict: 'rojo', definitorio: false, confidence: 0.0, reason: 'Requisito sin correspondencia en el perfil' }`

**Test file:** `lib/semaforo/__tests__/juridico-matcher.test.ts`

### Behavior: all reasons ≤ 200 chars (REQ-010, RN-003)

**Given** all possible code paths through `matchJuridico`
**When** each produces a `MatchResult`
**Then** `result.reason.length ≤ 200` in every case

**Test file:** `lib/semaforo/__tests__/juridico-matcher.test.ts`

---

## Task T3: Financiero Matcher

### Behavior: verde at ≥10% margin (REQ-006, RN-006, RN-010)

**Given** `req = { indicador: 'liquidez_corriente', threshold: 1.5, operador: '>=' }` AND `profile.ejercicios_fiscales[0].indicadores.liquidez_corriente = 1.65`
**When** `matchFinanciero(req, profile)` called
**Then** `{ verdict: 'verde', confidence: 1.0 }`

**Test file:** `lib/semaforo/__tests__/financiero-matcher.test.ts`

### Behavior: confidence formula boundary cases (RN-010)

**Given** threshold = 1.5 AND:
- actual = 1.575 (5% margin) → confidence = 0.5
- actual = 1.5 (0% margin) → confidence = 0.0
- actual = 1.425 (-5%) → confidence = 0.5 (rojo)
- actual = 3.0 (100% margin) → confidence = 1.0 (clamped)

**When** each matched
**Then** confidence values match exactly

**Test file:** `lib/semaforo/__tests__/financiero-matcher.test.ts`

### Behavior: multi-year all-fail → rojo (RN-007)

**Given** `req = { years_required: 2 }` AND year1 misses threshold, year2 meets it
**When** matched
**Then** `{ verdict: 'rojo' }`

**Test file:** `lib/semaforo/__tests__/financiero-matcher.test.ts`

### Behavior: no inline literals in financiero-matcher.ts

**Given** the source of `lib/semaforo/financiero-matcher.ts`
**When** grepped for `0.10`, `0.9`, `0.7`
**Then** zero matches

**Test file:** `lib/semaforo/__tests__/financiero-matcher.test.ts`

---

## Task T4: Técnico / Experiencia Matcher

### Behavior: exact UNSPSC → verde (REQ-007, RN-011)

**Given** `req.unspsc_required = '81111500'` AND `profile.contratos_previos[0].unspsc_codes = ['81111500']`
**When** `matchTecnico(req, profile)` called
**Then** `{ verdict: 'verde', confidence: 1.0 }`

**Test file:** `lib/semaforo/__tests__/tecnico-matcher.test.ts`

### Behavior: parent UNSPSC → amarillo 0.7 (RN-011)

**Given** `req.unspsc_required = '81111500'` AND `profile.contratos_previos[0].unspsc_codes = ['81110000']`
**When** matched
**Then** `{ verdict: 'amarillo', confidence: 0.7 }`

**Test file:** `lib/semaforo/__tests__/tecnico-matcher.test.ts`

### Behavior: cosine boundary (RN-011)

**Given** cosine similarity = 0.80 (minimum) AND cosine = 0.79 (below minimum)
**When** matched
**Then** 0.80 → amarillo; 0.79 → rojo

**Test file:** `lib/semaforo/__tests__/tecnico-matcher.test.ts`

### Behavior: valor_cop_min pre-filter (REQ-007)

**Given** `req.valor_cop_min = 500_000_000` AND only contract with `valor_cop = 400_000_000` exists
**When** matched
**Then** contract excluded; no tier 1/2/3 match possible → rojo

**Test file:** `lib/semaforo/__tests__/tecnico-matcher.test.ts`

---

## Task T5: Aggregator

### Behavior: all small-N worked examples (RN-009)

**Given** the scenarios from RN-009 (N=3/4/5/10 with various rojo counts)
**When** `aggregateByTipo` called per scenario
**Then** tipo-verdict and `threshold_applied` match the worked example exactly

**Test file:** `lib/semaforo/__tests__/aggregator.test.ts`

### Behavior: definitorio knockout overrides N<5 rule

**Given** 3 jurídico requisitos (N<5), 1 with `definitorio = true AND verdict = 'rojo'`
**When** aggregated
**Then** `byTipo.juridico.verdict === 'rojo'` (definitorio overrides, not tipo-amarillo)

**Test file:** `lib/semaforo/__tests__/aggregator.test.ts`

### Behavior: stats invariant

**Given** any MatchResult[] grouped by tipo
**When** `aggregateByTipo` called
**Then** `tv.n_rojo + tv.n_amarillo + tv.n_verde === tv.n` for every TipoVerdict

**Test file:** `lib/semaforo/__tests__/aggregator.test.ts`

---

## Task T6: Integration Entry Point

### Behavior: determinism (REQ-001, RN-002)

**Given** a `ExtractedRequisito[]` and `CompanyProfileSnapshot`
**When** `runSemaforoMatching` called twice with same inputs
**Then** `JSON.stringify(result1) === JSON.stringify(result2)`

**Test file:** `lib/semaforo/__tests__/index.test.ts`

### Behavior: unknown tipo → warn + rojo, no throw (REQ-002, RN-001)

**Given** a requisito with `tipo: 'unknown_tipo_xyz'` AND a `console.warn` spy
**When** `runSemaforoMatching` called
**Then** does not throw; warn called once; the requisito's MatchResult has `verdict: 'rojo'`

**Test file:** `lib/semaforo/__tests__/index.test.ts`

### Behavior: provider isolation grep (REQ-014, NFR-03)

**Given** `lib/semaforo/**` excluding `__tests__/`, `*.test.*`
**When** grep runs for `@supabase/`, `@anthropic-ai/`, `node:fs`, `node:net`, `node:http`, `pino`, `winston`, `process.env`
**Then** zero matches

**Test file:** `tests/ci/semaforo-provider-isolation.test.ts`

---

## Task T7: Tests + Golden Fixtures

### Behavior: golden corpus replays verbatim (REQ-015)

**Given** all fixtures at `tests/fixtures/golden/semaforo/` (≥15 total)
**When** `runSemaforoMatching(f.input.requisitos, f.input.profile)` per fixture
**Then** `toEqual(f.expected)` for every fixture

**Test file:** `tests/fixtures/golden/semaforo/golden.test.ts`

### Behavior: small-N transition fixtures present and passing

**Given** fixtures covering N=3 (1 rojo → amarillo), N=5 (1 rojo → verde), N=10 (4 rojo → tipo-rojo)
**When** replayed
**Then** each fixture's expected `byTipo` verdict matches the worked example from RN-009

**Test file:** `tests/fixtures/golden/semaforo/golden.test.ts`

### Behavior: 100% branch coverage

**Given** the test suite runs `vitest --coverage`
**When** coverage computed for all files under `lib/semaforo/` (excl. tests)
**Then** branch coverage = 100% on each file

**Test file:** (CI coverage gate)
