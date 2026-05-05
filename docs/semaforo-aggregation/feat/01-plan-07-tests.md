# T7: Tests + Golden Fixtures

## Scope

- `lib/semaforo/__tests__/juridico-matcher.test.ts` — NEW
- `lib/semaforo/__tests__/financiero-matcher.test.ts` — NEW
- `lib/semaforo/__tests__/tecnico-matcher.test.ts` — NEW
- `lib/semaforo/__tests__/aggregator.test.ts` — NEW
- `lib/semaforo/__tests__/index.test.ts` — NEW (integration + purity)
- `tests/fixtures/golden/semaforo/` — NEW directory, ≥15 fixtures (≥5 per tipo)
- `tests/fixtures/golden/semaforo/golden.test.ts` — NEW
- `tests/ci/semaforo-provider-isolation.test.ts` — NEW (or update existing)

## Changes

### Matcher unit tests (one file per matcher)

Each file covers every branch in the matcher:
- **Jurídico**: all 5 definitorio types (each: match, mismatch, absent/unresolved); all 7 obtainable types (present+vigente, expired, absent); unknown type → warn+rojo.
- **Financiero**: all 5 supported indicators; verde (≥10% margin), amarillo (5% margin, 0% margin), rojo (miss); multi-year ALL-pass verde, recent-year-only amarillo, any-year-miss rojo; missing fiscal year; unsupported indicator.
- **Técnico**: exact UNSPSC verde; parent UNSPSC amarillo; cosine-match amarillo (0.80, 0.95); no-match rojo; valor_cop_min pre-filter; personal clave exact match, partial match, no match.

### `aggregator.test.ts`

Table-driven tests covering every branch:
- Empty tipo → amarillo, `threshold_applied = false`
- Definitorio rojo → tipo-rojo (regardless of N)
- N=3, 1 non-definitorio rojo → tipo-amarillo, `threshold_applied = false`
- N=4, 2 non-definitorio rojos → tipo-amarillo, `threshold_applied = false`
- N=5, 1 rojo at 20% → tipo-verde, `threshold_applied = true`
- N=10, 2 rojos at 20% → tipo-verde (if 0 amarillo), `threshold_applied = true`
- N=10, 4 rojos at 40% → tipo-rojo, `threshold_applied = true`
- N=10, 6 amarillo at 60% → tipo-amarillo, `threshold_applied = true`
- Invariant: `n_rojo + n_amarillo + n_verde === n` for all test cases
- `deriveOverall`: definitorio blockers → rojo; worst-tipo cascades correctly

### `index.test.ts` (integration + purity)

- Determinism: `JSON.stringify(result1) === JSON.stringify(result2)` for same inputs
- Purity: no I/O stubs invoked on non-violating input
- Unknown tipo: `console.warn` called once, rojo MatchResult returned, no throw
- `semaforo_rules_version === 'v2.0.0'`
- `definitorio_blockers` only contains `definitorio === true AND verdict === 'rojo'`
- Reason length: every match result reason ≤200 chars (parameterized assertion)
- Provider isolation grep (see below)

### Golden fixtures (≥5 per tipo, ≥15 total)

Structure per fixture:
```json
{
  "_comment": "Scenario description",
  "input": {
    "requisitos": [...],
    "profile": { ... }
  },
  "expected": { "overall": "...", "byTipo": {...}, ... }
}
```

**Jurídico fixtures (≥5)**:
1. `juridico-all-verde.json` — all 5 definitorio types present+vigente → overall verde
2. `juridico-definitorio-rup-rojo.json` — `rup_vigente = false` + 4 verde → overall rojo, definitorio blocker
3. `juridico-tipo-societario-mismatch.json` — PN required SAS → overall rojo
4. `juridico-obtainable-absent.json` — N=3, paz_y_salvo absent → tipo-amarillo (N<5 knockout-only)
5. `juridico-heuristic-unresolved.json` — unknown document_type → rojo per unmatched rule

**Financiero fixtures (≥5)**:
1. `financiero-all-verde-margin.json` — 3 indicators all at 2×threshold → confidence 1.0 each
2. `financiero-tight-margin-amarillo.json` — liquidez at 1.05×threshold → confidence 0.5
3. `financiero-multi-year-partial.json` — passes recent year, fails prior year → amarillo
4. `financiero-rojo-miss.json` — liquidez at 0.90×threshold → rojo, confidence 0.5
5. `financiero-n5-small-miss.json` — N=5, 1 rojo at 20% → tipo-verde (threshold N≥5)

**Técnico/Experiencia fixtures (≥5)**:
1. `tecnico-exact-unspsc.json` — exact UNSPSC match → verde, confidence 1.0
2. `tecnico-parent-unspsc.json` — parent segment match → amarillo, confidence 0.7
3. `tecnico-cosine-match.json` — cosine 0.88 → amarillo, confidence 0.88
4. `tecnico-no-match-rojo.json` — no qualifying contract → rojo, confidence 0.0
5. `tecnico-n10-threshold.json` — N=10, 4 rojos at 40% → tipo-rojo (N≥5 threshold fires)
6. `tecnico-n4-small-rojo.json` — N=4, 2 non-definitorio rojos → tipo-amarillo (N<5)

### Provider isolation grep

```typescript
// tests/ci/semaforo-provider-isolation.test.ts
// Scans lib/semaforo/** (excluding __tests__/, *.test.*, tests/**) for forbidden imports.
// Fails CI if any match found for:
// @supabase/, @anthropic-ai/, node:fs, node:net, node:http,
// pino, winston, bunyan, @logtape/, process.env
```

## Dependencies

T6: `runSemaforoMatching` (integration tests). T2/T3/T4: individual matchers (unit tests). T5: aggregator.

## Done When

- [ ] All matcher unit tests pass; 100% branch coverage on each matcher file.
- [ ] `aggregator.test.ts` covers every N-threshold scenario including small-N worked examples.
- [ ] `index.test.ts`: determinism, purity, unknown tipo, reason-length assertion.
- [ ] ≥15 golden fixtures exist (≥5 per tipo) and `golden.test.ts` replays all verbatim.
- [ ] All small-N transition scenarios from RN-009 covered in fixtures.
- [ ] Provider-isolation grep CI test passes with zero violations.
- [ ] `vitest --coverage` reports 100% branch coverage on all `lib/semaforo/` files (excl. tests).
- [ ] `npm run typecheck` passes.
