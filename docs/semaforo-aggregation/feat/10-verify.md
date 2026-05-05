# Verification Plan — semaforo-aggregation

## T1: Thresholds + ADRs

**Gate criteria:** `lib/semaforo/thresholds.ts` exports all 8 named constants as `as const` literal types;
`SEMAFORO_RULES_VERSION === 'v2.0.0'`; zero imports in the file; ADR-011 through ADR-014 exist
under `.nybo/foundation/adrs/` with Status: Accepted and all required sections.

**Test scenarios:**
- Import and verify each constant value matches spec values
- Grep `thresholds.ts` for `import` — expect zero matches
- `DEFINITORIO_DOCUMENT_TYPES.length === 5` and all 5 entries present
- `OBTAINABLE_DOCUMENT_TYPES.length === 7`

---

## T2: Jurídico Matcher

**Gate criteria:** 100% branch coverage on `juridico-matcher.ts`; every definitorio and obtainable
type handled; unknown type triggers exactly one `console.warn` and returns rojo; all reasons ≤200 chars.

**Test scenarios:**
- `rup_vigente = true` → verde, confidence 1.0
- `rup_vigente = false` → rojo, definitorio true, confidence 1.0
- `rup_vigente = undefined` → amarillo, confidence 0.3
- `tipo_societario` match → verde; mismatch → rojo definitorio
- `paz_y_salvo_tributario` present+vigente → verde; absent → amarillo 0.5
- Unknown `document_type` → warn + rojo definitorio false + confidence 0.0
- All reason strings: `reason.length ≤ 200`

---

## T3: Financiero Matcher

**Gate criteria:** 100% branch coverage on `financiero-matcher.ts`; verde only at ≥10% margin;
confidence formula verified at 5% (0.5), 10% (1.0), 0% (0.0), -5% (0.5); multi-year logic correct.

**Test scenarios:**
- `actual = 1.65`, `threshold = 1.5` (10% margin) → verde, confidence 1.0
- `actual = 1.575`, `threshold = 1.5` (5% margin) → amarillo, confidence 0.5
- `actual = 1.5`, `threshold = 1.5` (0% margin) → amarillo, confidence 0.0
- `actual = 1.425`, `threshold = 1.5` (-5%) → rojo, confidence 0.5
- `actual = 3.0`, `threshold = 1.5` (100% margin) → verde, confidence 1.0
- Multi-year: year1 pass, year2 fail → rojo
- Multi-year: year1 fail verde_margin, year2 pass → amarillo
- Missing fiscal year → amarillo, confidence 0.3
- Unsupported indicator → warn + rojo
- No inline literal `0.10` in `financiero-matcher.ts`

---

## T4: Técnico / Experiencia Matcher

**Gate criteria:** 100% branch coverage; each UNSPSC tier produces correct verdict and confidence;
cosine boundary (0.80 qualifies, 0.79 does not); valor_cop_min pre-filter excludes correctly.

**Test scenarios:**
- Exact UNSPSC → verde, confidence 1.0
- Parent UNSPSC (6-digit prefix match) → amarillo, confidence 0.7
- Cosine = 0.88 → amarillo, confidence 0.88
- Cosine = 0.80 → amarillo, confidence 0.80 (boundary — qualifies)
- Cosine = 0.79 → rojo (below minimum)
- No match any tier → rojo, confidence 0.0
- `valor_cop_min = 500M`, contract `valor_cop = 400M` → excluded from matching → rojo

---

## T5: Aggregator

**Gate criteria:** 100% branch coverage; all small-N worked examples pass; invariant holds; overall
derivation correctly mirrors worst-tipo and definitorio blockers.

**Test scenarios (from RN-009 worked examples):**
- N=3, 1 non-definitorio rojo → tipo-amarillo, `threshold_applied = false`
- N=4, 2 non-definitorio rojos → tipo-amarillo, `threshold_applied = false`
- N=5, 1 rojo at 20% → tipo-verde, `threshold_applied = true`
- N=10, 2 rojos at 20%, 0 amarillo → tipo-verde, `threshold_applied = true`
- N=10, 4 rojos at 40% → tipo-rojo, `threshold_applied = true`
- N=10, 6 amarillo at 60%, 0 rojo → tipo-amarillo, `threshold_applied = true`
- Empty tipo → `{ verdict: 'amarillo', threshold_applied: false }`
- Definitorio rojo in N=3 → tipo-rojo (definitorio overrides N<5 rule)
- `n_rojo + n_amarillo + n_verde === n` for all cases
- `deriveOverall`: definitorio blocker → rojo; all verde → verde; worst-tipo propagates

---

## T6: Integration Entry Point

**Gate criteria:** `runSemaforoMatching` is deterministic and pure; unknown tipo handled without
throw; `semaforo_rules_version` always equals `'v2.0.0'`; provider isolation grep passes.

**Test scenarios:**
- Same inputs × 2 → byte-identical `JSON.stringify` outputs
- No I/O stubs invoked on non-violating input
- Unknown `requisito_tipo` → `console.warn` exactly once, rojo MatchResult, no throw
- `result.semaforo_rules_version === 'v2.0.0'`
- `result.definitorio_blockers` = only `{ definitorio: true, verdict: 'rojo' }` entries
- All `result.matches[*].reason.length ≤ 200`

---

## T7: Tests + Golden Fixtures

**Gate criteria:** ≥15 golden fixtures (≥5 per tipo) all replay verbatim; 100% branch coverage
across all `lib/semaforo/` files (excl. tests); provider-isolation grep zero violations.

**Test scenarios:**
- All golden fixture replays pass (`toEqual` deep equality)
- Small-N transition fixtures: N=3 1-rojo→amarillo, N=5 1-rojo→verde, N=10 4-rojo→rojo
- Coverage report: every branch in all matcher files, aggregator, and index hit
- Provider isolation: zero matches for forbidden imports

---

## End-to-End Acceptance

Given a realistic `ExtractedRequisito[]` and `CompanyProfileSnapshot`:

1. `runSemaforoMatching` completes without throw
2. Every `MatchResult` has `reason.length ≤ 200` and `confidence ∈ [0, 1]`
3. `SemaforoResult.semaforo_rules_version === 'v2.0.0'`
4. `definitorio_blockers` contains only definitorio rojo matches
5. All `byTipo` verdicts correctly reflect per-tipo aggregation rules
6. `overall` correctly derived from `byTipo` and `definitorio_blockers`
7. Called twice with same inputs → byte-identical `JSON.stringify` output
8. Provider isolation grep passes (zero forbidden imports in `lib/semaforo/`)
9. `vitest --coverage` reports 100% branch coverage on all `lib/semaforo/` files

**Final gate:** All 9 criteria pass in CI before marking the feature `shipped`.
