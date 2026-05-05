# T5: Aggregator

## Scope

- `lib/semaforo/aggregator.ts` — NEW. Per-tipo aggregation + overall verdict derivation.

## Changes

### `lib/semaforo/aggregator.ts`

```typescript
import type { MatchResult, SemaforoColor, TipoVerdict, RequisitoTipo } from '@/types'
import {
  MIN_N_FOR_THRESHOLD,
  ROJO_THRESHOLD,
  AMARILLO_THRESHOLD,
} from './thresholds'

export function aggregateByTipo(
  matches: MatchResult[],
): Record<RequisitoTipo, TipoVerdict>

export function deriveOverall(
  byTipo: Record<RequisitoTipo, TipoVerdict>,
  definitorio_blockers: MatchResult[],
): SemaforoColor
```

#### `aggregateByTipo` logic

For each `tipo ∈ ['juridico', 'financiero', 'tecnico', 'experiencia']`:

```
const tipoMatches = matches.filter(m => m.tipo === tipo)
const n = tipoMatches.length
const n_rojo = tipoMatches.filter(m => m.verdict === 'rojo').length
const n_amarillo = tipoMatches.filter(m => m.verdict === 'amarillo').length
const n_verde = tipoMatches.filter(m => m.verdict === 'verde').length
```

If `n === 0`: `TipoVerdict = { verdict: 'amarillo', n: 0, n_rojo: 0, n_amarillo: 0, n_verde: 0, threshold_applied: false }`. Empty tipo = no data, not verde.

If `n > 0`:

**Definitorio knockout (applies regardless of N)**:
```
has_definitorio_rojo = tipoMatches.some(m => m.definitorio && m.verdict === 'rojo')
if (has_definitorio_rojo) → verdict = 'rojo', threshold_applied = (n >= MIN_N_FOR_THRESHOLD)
```

**N < MIN_N_FOR_THRESHOLD (knockout-only for non-definitorio)**:
```
// Non-definitorio rojos treated as amarillo for tipo-verdict
any_non_def_rojo = tipoMatches.some(m => !m.definitorio && m.verdict === 'rojo')
any_amarillo = tipoMatches.some(m => m.verdict === 'amarillo')
verdict = any_non_def_rojo || any_amarillo ? 'amarillo' : 'verde'
threshold_applied = false
```

**N ≥ MIN_N_FOR_THRESHOLD (threshold logic)**:
```
rojo_rate = n_rojo / n
amarillo_rate = n_amarillo / n
verdict = rojo_rate > ROJO_THRESHOLD ? 'rojo'
        : amarillo_rate > AMARILLO_THRESHOLD ? 'amarillo'
        : 'verde'
threshold_applied = true
```

#### `deriveOverall` logic (RN-012)

```
if (definitorio_blockers.length > 0) return 'rojo'
const tipoVerdicts = Object.values(byTipo).map(tv => tv.verdict)
if (tipoVerdicts.includes('rojo')) return 'rojo'
if (tipoVerdicts.includes('amarillo')) return 'amarillo'
return 'verde'
```

#### Correctness invariant (test-verified)

`n_rojo + n_amarillo + n_verde === n` for every `TipoVerdict`.

## Design Rationale

`aggregateByTipo` and `deriveOverall` are separate exports so each can be unit-tested in
isolation. The aggregator imports only constants from `thresholds.ts` — no numeric literals.
The threshold logic for N≥5 replaces the v1 verde-percentage rule; the N<5 fallback ensures
small pliegos receive conservative but non-rojo verdicts for non-definitorio misses.

## Dependencies

T2, T3, T4: `MatchResult` outputs from all three matchers.
T1: `MIN_N_FOR_THRESHOLD`, `ROJO_THRESHOLD`, `AMARILLO_THRESHOLD` from `thresholds.ts`.
T0: `TipoVerdict`, `RequisitoTipo`, `SemaforoColor` from `@/types`.

## Done When

- [ ] `lib/semaforo/aggregator.ts` exports `aggregateByTipo` and `deriveOverall`.
- [ ] Empty tipo → `{ verdict: 'amarillo', threshold_applied: false }`.
- [ ] Definitorio rojo → tipo-rojo regardless of N.
- [ ] N<5, non-definitorio rojo → tipo-amarillo (not rojo).
- [ ] N≥5, rojo_rate > 0.30 → tipo-rojo.
- [ ] N≥5, amarillo_rate > 0.50 → tipo-amarillo (if not already rojo).
- [ ] N≥5, neither threshold fires → tipo-verde.
- [ ] `threshold_applied` set correctly in all paths.
- [ ] `deriveOverall`: definitorio blockers → rojo; then worst-tipo; all verde → verde.
- [ ] Invariant `n_rojo + n_amarillo + n_verde === n` verified in tests.
- [ ] No inline numeric literals. `npm run typecheck` passes. No forbidden imports.
