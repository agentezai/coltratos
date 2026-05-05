# Progress Tracker — semaforo-aggregation

**Status:** Not Started

**Current Task:** T0 — domain-model-mvp schema additions (HARD PREREQUISITE)

---

## Task Checklist

### T0: Domain-model-mvp additions (outside this spec)
- [ ] Apply T0 via `/nybo-plan edit domain-model-mvp`: `CompanyProfileSnapshot` type; `ExtractedRequisito` discriminated union (`JuridicoExtracted`, `FinancieroExtracted`, `TecnicoExtracted`); `MatchResult`, `SemaforoResult`, `TipoVerdict` types in `@/types`; `RequisitoTipo = 'juridico' | 'financiero' | 'tecnico' | 'experiencia'`; `analisis.semaforo_rules_version TEXT NULL` column + Kysely extension.

### T1: Thresholds + ADRs
- [ ] Implement T1: `lib/semaforo/thresholds.ts` with `SEMAFORO_RULES_VERSION = 'v2.0.0'`, `MIN_N_FOR_THRESHOLD = 5`, `ROJO_THRESHOLD = 0.30`, `AMARILLO_THRESHOLD = 0.50`, `FINANCIERO_VERDE_MARGIN = 0.10`, `TECNICO_COSINE_MIN = 0.80`, `DEFINITORIO_DOCUMENT_TYPES` (5 entries), `OBTAINABLE_DOCUMENT_TYPES` (7 entries). Author ADR-011 through ADR-014.
- [ ] Verify T1: all exports `as const`; zero imports in `thresholds.ts`; all 4 ADRs present with Status: Accepted; typecheck passes.

### T2: Jurídico Matcher
- [ ] Implement T2: `lib/semaforo/juridico-matcher.ts` — `matchJuridico(req, profile): MatchResult`; `is_definitorio` classification via `DEFINITORIO_DOCUMENT_TYPES`; all 5 definitorio type checks; all 7 obtainable heuristics; unknown type → warn+rojo; all reasons ≤200 chars.
- [ ] Verify T2: unit tests pass; 100% branch coverage on `juridico-matcher.ts`; all 5 definitorio + 7 obtainable paths covered; unknown type triggers console.warn exactly once; no forbidden imports.

### T3: Financiero Matcher
- [ ] Implement T3: `lib/semaforo/financiero-matcher.ts` — `matchFinanciero(req, profile): MatchResult`; 5 supported indicators; verde (≥10% margin all years), amarillo (tight margin or recent-year-only), rojo (any year miss); confidence formula `clamp(|ratio−1|/0.10, 0, 1)`; missing data → amarillo 0.3; unsupported indicator → warn+rojo.
- [ ] Verify T3: unit tests pass; 100% branch coverage; confidence values correct at boundary (5% → 0.5, 10% → 1.0, 0% → 0.0); multi-year logic tested; no inline numeric literals.

### T4: Técnico / Experiencia Matcher
- [ ] Implement T4: `lib/semaforo/tecnico-matcher.ts` — `matchTecnico(req, profile): MatchResult`; 4-tier match hierarchy (exact UNSPSC → verde 1.0; parent UNSPSC → amarillo 0.7; cosine ≥ 0.80 → amarillo = cosine; no match → rojo 0.0); valor_cop_min pre-filter; personal clave matching for `tipo: 'tecnico'`.
- [ ] Verify T4: unit tests pass; 100% branch coverage; each tier tested including boundaries (cosine 0.80 qualifies, 0.79 does not); valor_cop_min pre-filter excludes low-value contracts; no inline literals for thresholds.

### T5: Aggregator
- [ ] Implement T5: `lib/semaforo/aggregator.ts` — `aggregateByTipo` and `deriveOverall`; empty tipo → amarillo; definitorio knockout; N<5 non-definitorio rojo → tipo-amarillo; N≥5 threshold (>30% rojo, >50% amarillo); overall derivation per RN-012.
- [ ] Verify T5: all small-N worked examples from RN-009 pass (N=3/4/5/10 scenarios); invariant `n_rojo + n_amarillo + n_verde === n`; `threshold_applied` set correctly; overall derivation correct in all permutations.

### T6: Integration Entry Point
- [ ] Implement T6: `lib/semaforo/index.ts` — `runSemaforoMatching(requisitos, profile): SemaforoResult`; switch dispatch per tipo; unknown tipo → warn+rojo (no throw); `definitorio_blockers` populated; `semaforo_rules_version` field; public barrel re-exports all constants.
- [ ] Verify T6: integration test — determinism, purity, unknown tipo, correct result shape; `semaforo_rules_version === 'v2.0.0'`; provider isolation grep passes; typecheck passes.

### T7: Tests + Golden Fixtures
- [ ] Implement T7: ≥5 golden fixtures per tipo (≥15 total) covering clear-match verde, tight-amarillo, rojo, and all small-N transition scenarios from RN-009; `golden.test.ts` replaying each fixture; provider-isolation CI test.
- [ ] Verify T7: all golden fixtures replay verbatim; 100% branch coverage across all `lib/semaforo/` files (excluding tests); provider-isolation grep: zero violations; `npm run typecheck` passes.

---

## Completion Summary

_Fill in when all tasks ship: total lines under `lib/semaforo/` (excl. tests), branch coverage %,
number of golden fixtures shipped, any rules version bumps during execution._
