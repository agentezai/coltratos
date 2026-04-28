# Progress Tracker

**Status:** Not Started

**Current Task:** T0 — schema additions in `domain-model` (HARD PREREQUISITE; outside this spec)

---

## Task Checklist

### T0: Domain-model schema additions (in domain-model spec, NOT this spec)
- [ ] Apply T0 (9 items) via `/nybo-plan edit domain-model`: (1) `requisito.categoria` (narrow enum, excludes `general`); (2) `requisito.is_habilitante BOOLEAN NOT NULL`; (3) `requisito.is_habilitante_source TEXT NOT NULL` with CHECK constraint on `'structural' | 'llm' | 'manual'`; (4) Zod `RequisitoSchema` extended with all three; (5) Zod `RequisitoExtractionPayloadSchema` extended with `is_habilitante` AND `is_habilitante_source`; (6) Kysely `RequisitoTable` extended; (7) `analisis.semaforo_rules_version TEXT NULL` + Zod + Kysely; (8) `Semaforo`/`SemaforoStats`/`RequisitoCategoria`/`IsHabilitanteSource` types at `src/types/domain/semaforo.ts` exported from `@/types`; (9) `HABILITANTE_HEADING_PATTERNS` (regex array) and `HABILITANTE_PATTERNS_VERSION = 'v1.0.0'` at `src/types/domain/habilitante-patterns.ts` exported from `@/types`.

### T1: Thresholds + ADRs
- [ ] Implement Task 1: `lib/semaforo/thresholds.ts` (VERDE_THRESHOLD, AMARILLO_THRESHOLD, SEMAFORO_RULES_VERSION); `.nybo/foundation/adrs/ADR-011.md` (threshold values for v1); `.nybo/foundation/adrs/ADR-012.md` (sin-info handling).
- [ ] Verify Task 1: typecheck passes; both ADRs present with all required sections (Context, Decision, Rationale, Alternatives, Consequences) and Status: Accepted; `thresholds.ts` is pure data with zero non-primitive imports.

### T2: aggregateSemaforo Implementation
- [ ] Implement Task 2: `lib/semaforo/aggregate.ts` exporting `aggregateSemaforo` (≤80 lines production code). Knockout-then-percentage logic at both overall and per-categoría levels. Empty array → rojo. All sin-info → amarillo. Empty categoría → amarillo. `general`-categoría requisitos → console.warn + exclude. Deterministic blockers ordering. Stats with denominator-zero guard.
- [ ] Verify Task 2: function returns `Semaforo` for all inputs and never throws; literal threshold numbers do not appear in `aggregate.ts`; `console.warn` is the only side effect; production lines ≤ 80; no forbidden imports.

### T3: Tests + Golden Corpus + Isolation Grep + Public Barrel
- [ ] Implement Task 3: table-driven unit tests covering every threshold boundary, knockout combination, edge case, contract violation, stats invariant; 5 golden fixtures (all-habilitantes-fail, borderline-89pct, borderline-90pct, all-sin-info, mixed-realistic) with `_comment`/`input`/`expected`; golden replay test; provider-isolation grep CI test; code-economy soft check; public barrel `lib/semaforo/index.ts`.
- [ ] Verify Task 3: 4 test files pass in CI; branch coverage 100% on `aggregate.ts` and `thresholds.ts`; provider-isolation grep zero violations; code-economy soft check passes (current line count logged); public barrel resolves expected exports.

---

## Completion Summary

_To be filled in when all tasks ship: final production line count of `aggregate.ts`, branch coverage percentage, total CI runtime for the corpus + unit tests, and a note on whether any threshold or knockout rule was tuned during execution (would require a `SEMAFORO_RULES_VERSION` bump and ADR-013)._
