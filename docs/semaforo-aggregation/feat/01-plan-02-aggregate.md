# T2: aggregateSemaforo Implementation

## Scope

- `lib/semaforo/aggregate.ts` — NEW. The single ~50-80 line aggregation function plus tightly-scoped private helpers.

## Changes

### Public surface

```typescript
import type { Requisito, Semaforo, RequisitoCategoria, SemaforoColor } from '@/types'
import { VERDE_THRESHOLD, AMARILLO_THRESHOLD } from './thresholds'

export function aggregateSemaforo(requisitos: Requisito[]): Semaforo
```

### Algorithm (precedence-ordered, mirrors RN-003 → RN-006)

The implementation MUST follow this precise order so test cases map 1:1 to code paths:

1. **Filter contract violators**: split inputs into `valid` (`categoria !== 'general'`) and `violators` (`categoria === 'general'`). For each violator, call `console.warn('[semaforo-aggregation] contract violation: general-categoria requisito received', { requisitoId: r.id, segmentoId: r.segmento_id })`. The `valid` array is what the rest of the algorithm operates on.

2. **Compute stats** over `valid`:
   ```
   total      = valid.length
   cumple     = valid.filter(r => r.cumple === true).length
   noCumple   = valid.filter(r => r.cumple === false).length
   sinInfo    = valid.filter(r => r.cumple === null).length
   denominator = total - sinInfo
   cumplePct  = denominator === 0 ? 0 : round6(cumple / denominator)
   ```

3. **Compute blockers**:
   ```
   blockers = valid
     .filter(r => r.is_habilitante === true && r.cumple === false)
     .sort(byCategoriaThenDescripcion)  // CATEGORIA_ORDER ['juridico','financiero','tecnico','experiencia']
   ```

4. **Compute overall verdict** with precedence:
   - **Empty array (RN-005):** if `total === 0`, `overall = 'rojo'` (with all-amarillo `byCategoria` per RN-009 + zeroed stats per REQ-006).
   - **Knockout (RN-003):** if `blockers.length > 0`, `overall = 'rojo'`.
   - **All sin-info (RN-006):** if `denominator === 0` and `total > 0`, `overall = 'amarillo'`.
   - **Percentage (RN-004):** otherwise, `cumplePct >= VERDE_THRESHOLD ? 'verde' : cumplePct >= AMARILLO_THRESHOLD ? 'amarillo' : 'rojo'`.

5. **Compute per-categoría**:
   - For each `c ∈ ['juridico', 'financiero', 'tecnico', 'experiencia']`:
     - Filter `valid` to `bucket = valid.filter(r => r.categoria === c)`.
     - **Empty bucket (RN-009):** `bucket.length === 0` → `byCategoria[c] = 'amarillo'`.
     - Otherwise apply the same knockout-then-percentage logic to the bucket only:
       - Knockout: any habilitante-failing in bucket → `'rojo'`.
       - All sin-info in bucket → `'amarillo'`.
       - Percentage: same thresholds applied to the bucket's own `cumplePct`.

6. **Return** `{ overall, byCategoria, blockers, stats: { total, cumple, noCumple, sinInfo, cumplePct } }`.

### Private helpers (same file, not exported)

Keep these within the same file unless the file exceeds ~80 LOC; extracting helpers solely for code organization defeats NFR-01.

- `computeStats(valid: Requisito[]): SemaforoStats` — the stats object.
- `applyRules(bucket: Requisito[], stats: { cumple: number; denominator: number }): SemaforoColor` — the knockout-then-percentage logic, callable for both overall and per-categoría. Takes pre-computed stats so the overall and per-categoría paths don't recompute.
- `byCategoriaThenDescripcion(a: Requisito, b: Requisito): number` — comparator for blockers sort.
- `round6(n: number): number` — `Math.round(n * 1_000_000) / 1_000_000`. Inline if it makes the helper count feel like over-decomposition.
- `CATEGORIA_ORDER: readonly RequisitoCategoria[] = ['juridico','financiero','tecnico','experiencia']` — module-level constant. Iteration order for blockers sort and `byCategoria` construction; keeping it as a single source of truth prevents categoría-order drift if the algorithm is touched.

### Purity contract

- No imports of `@supabase/*`, `@anthropic-ai/sdk`, `node:*`, `pino`/`winston`/`bunyan`/`@logtape/`, `process.env`. Verified by REQ-013 grep.
- No `Date.now()`, `new Date()`, `Math.random()`. Verified by TC-001 (deterministic) and TC-017 (only-side-effect-is-warn).
- No mutation of `requisitos` (input array). Use `Array.prototype.filter`, `.map`, `.sort` on copies (`.sort` mutates — call it on a defensive copy: `[...filtered].sort(...)`).
- The single permitted side effect is `console.warn` for general-categoría contract violations.

### Code economy heuristic (NFR-01)

Production lines (excluding blank and comment-only lines) MUST stay ≤80. If implementation grows beyond this, the rules need rethinking — push back at PR review and consider whether the new case is genuinely v1 or is a v2 enhancement (per-empresa thresholds, weighted requisitos, etc.). The CI script in T3 surfaces this as a soft warning, not a hard fail.

### Design Rationale (Single Responsibility, OCP)

`aggregate.ts` owns one concern: the rule engine. It does not own configuration (`thresholds.ts`), persistence (orchestrator), I/O (none), or test harness (T3). The result is a file that fits on one screen, is trivially testable, and is the *exact* place a future engineer goes to answer "why did the user get rojo?"

Reusing `applyRules` for both overall and per-categoría is OCP: adding a new categoría (a v2 feature, e.g. `'ambiental'`) requires only extending `RequisitoCategoria` (in `@/types`) and the `CATEGORIA_ORDER` constant; the rule logic is unchanged.

## Dependencies

Requires **T1** (`thresholds.ts` exports the three constants).
Requires **T0** (`Requisito.categoria` and `Requisito.is_habilitante` exist in the domain model and are populated by extraction).

## Done When

- [ ] `lib/semaforo/aggregate.ts` exists, exports `aggregateSemaforo`, no other named exports (helpers are file-private).
- [ ] Production line count (excluding blank + comment-only lines) is ≤ 80.
- [ ] No literal `0.9` / `0.7` / `90` / `70` / `'v1.0.0'` appears in this file (TC-014 grep).
- [ ] No imports of `@supabase/*`, `@anthropic-ai/sdk`, `node:*`, common loggers, or `process.env` (REQ-013).
- [ ] No `Date.now`, `new Date`, `Math.random` references.
- [ ] Function is total: returns `Semaforo` for all inputs (empty, all-null, contract-violating); never throws.
- [ ] `console.warn` is the only side effect; fires exactly once per general-categoría requisito and not at all otherwise.
- [ ] `npm run typecheck` passes; no `any` in the file.
- [ ] Initial integration with the test harness (T3) compiles cleanly.
