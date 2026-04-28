# Verification Plan

## T1: Thresholds + ADRs

### Test Scenarios
- `lib/semaforo/thresholds.ts` exports `VERDE_THRESHOLD = 0.9`, `AMARILLO_THRESHOLD = 0.7`, `SEMAFORO_RULES_VERSION = 'v1.0.0'`, all `as const`.
- `SEMAFORO_RULES_VERSION` matches the regex `/^v\d+\.\d+\.\d+$/`.
- File contains zero imports beyond TypeScript primitives.
- ADR-011 and ADR-012 exist with all required sections (Context, Decision, Rationale, Alternatives Considered, Consequences) and Status: Accepted.

### Gate Criteria
`npm run typecheck` passes. Both ADRs are present and reviewed. The `thresholds.ts` file is pure data with no imports.

---

## T2: aggregateSemaforo

### Test Scenarios
- Function exported from `lib/semaforo/aggregate.ts` with signature `(requisitos: Requisito[]) => Semaforo`.
- Returns a `Semaforo` for empty arrays, all-null inputs, all-cumple inputs, all-failing inputs, and mixed inputs — never throws.
- Knockout rule applies BEFORE percentage rule at both overall and per-categoría levels.
- Percentage thresholds use the constants from `thresholds.ts`; literal `0.9`/`0.7` do not appear in `aggregate.ts`.
- `console.warn` is the only side effect; it fires only on `general`-categoría requisitos.
- Production line count (excluding blank + comment-only) is ≤ 80.
- No imports of `@supabase/*`, `@anthropic-ai/sdk`, `node:*`, common loggers, `process.env`.

### Gate Criteria
The function compiles in strict mode, the grep tests in T3 pass against this file, and the unit tests in T3 hit 100% branch coverage. Code-economy soft check below 80 lines (or PR review acknowledges the overshoot in writing).

---

## T3: Tests + Golden Corpus + Isolation Grep + Public Barrel

### Test Scenarios
- Table-driven unit tests cover every threshold boundary (`0.69` / `0.7` / `0.89` / `0.9`), every knockout combination, every edge case (empty, all-null, contract violation), every blockers-list rule, every stats invariant.
- 5 golden fixtures (`01-all-habilitantes-fail.json`, `02-borderline-89pct-amarillo.json`, `03-borderline-90pct-verde.json`, `04-all-sin-info.json`, `05-mixed-realistic.json`) exist with `_comment`, `input`, `expected`; every requisito carries `is_habilitante_source`.
- Golden replay test passes for all 5 fixtures (deeply-equal comparison).
- Provider-isolation grep test passes with zero violations under `lib/semaforo/**` (excluding `__tests__/`, `*.test.*`, `tests/**`).
- `is_habilitante_source` distribution check passes — ≥80% of habilitante-true requisitos across all fixtures carry `'structural'`.
- `vitest --coverage` reports 100% branch coverage on `aggregate.ts` and `thresholds.ts`.
- `lib/semaforo/index.ts` re-exports `aggregateSemaforo`, `VERDE_THRESHOLD`, `AMARILLO_THRESHOLD`, `SEMAFORO_RULES_VERSION`.

### Gate Criteria
All 4 test files pass in CI: unit tests, golden replay, provider-isolation grep, fixture-distribution check. Branch coverage 100%. Public barrel resolves the expected exports. The ≤80-line code-economy target is a PR-review heuristic only (no CI gate).

---

## End-to-End Verification

**Final acceptance — the integrated aggregation stage:**

1. T0 schema additions are applied via `domain-model` migration; new columns visible in Supabase: `requisito.categoria`, `requisito.is_habilitante`, `requisito.is_habilitante_source`, `analisis.semaforo_rules_version`.
2. The `Semaforo`, `SemaforoStats`, `RequisitoCategoria`, `IsHabilitanteSource` types are exported from `@/types`.
3. `HABILITANTE_HEADING_PATTERNS` and `HABILITANTE_PATTERNS_VERSION` are exported from `@/types`.
4. `requisitos-extraction` has been edited (separate spec revision) to (a) denormalize `categoria` from segmento onto each emitted requisito, (b) implement tiered `is_habilitante` classification (structural-first, LLM-fallback), (c) populate `is_habilitante_source` on every requisito, (d) update its golden corpus, and (e) add the ≥80%-structural acceptance test.
4. Build a small E2E test (or a manual reproduction script) that:
   a. Loads a fixture pliego from `tests/fixtures/golden/semaforo/05-mixed-realistic.json` (or constructs one inline).
   b. Calls `aggregateSemaforo(requisitos)`.
   c. Inspects the result.
5. Result conforms to the `Semaforo` shape: `overall ∈ {verde, amarillo, rojo}`; `byCategoria` has all 4 keys; `blockers` is sorted; `stats` invariants hold.
6. Repeat with a deliberately-empty `Requisito[]` — output is `rojo`/all-amarillo per RN-005.
7. Repeat with a `general`-categoría requisito injected — `console.warn` fires once; the rest of the algorithm proceeds.
8. Repeat with a habilitante-failing in juridico + 95% cumple in tecnico — overall rojo; juridico rojo; tecnico verde; the failing requisito appears in blockers.
9. Run the provider-isolation grep — zero violations.
10. Run the coverage report — 100% branches on `aggregate.ts` and `thresholds.ts`.
11. Confirm `SEMAFORO_RULES_VERSION` is `'v1.0.0'` and is exported from `'@/lib/semaforo'`.
12. (For the orchestrator integration, when its spec ships) confirm that `Analisis.semaforo_rules_version` is populated alongside `Analisis.semaforo` in a single UPDATE.

**Gate Criteria:** All steps complete. `npm run test`, `npm run typecheck`, and the coverage gate all pass. The 5 golden fixtures replay verbatim. The code-economy soft check is at-or-under 80 lines.
