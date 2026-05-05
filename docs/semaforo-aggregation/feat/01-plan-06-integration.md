# T6: Integration — `runSemaforoMatching` Entry Point

## Scope

- `lib/semaforo/index.ts` — NEW (replaces v1 index). Public barrel + `runSemaforoMatching` entry.

## Changes

### `lib/semaforo/index.ts`

```typescript
import type { ExtractedRequisito, CompanyProfileSnapshot, SemaforoResult } from '@/types'
import { matchJuridico } from './juridico-matcher'
import { matchFinanciero } from './financiero-matcher'
import { matchTecnico } from './tecnico-matcher'
import { aggregateByTipo, deriveOverall } from './aggregator'
import { SEMAFORO_RULES_VERSION } from './thresholds'

export function runSemaforoMatching(
  requisitos: ExtractedRequisito[],
  profile: CompanyProfileSnapshot,
): SemaforoResult {
  // 1. Dispatch each requisito to the correct matcher
  const matches: MatchResult[] = requisitos.map(req => {
    switch (req.tipo) {
      case 'juridico':    return matchJuridico(req, profile)
      case 'financiero':  return matchFinanciero(req, profile)
      case 'tecnico':
      case 'experiencia': return matchTecnico(req, profile)
      default:
        console.warn('[semaforo-aggregation] unknown requisito_tipo', { tipo: req.tipo })
        return unknownMatchResult(req)
    }
  })

  // 2. Aggregate per tipo
  const byTipo = aggregateByTipo(matches)

  // 3. Collect definitorio blockers
  const definitorio_blockers = matches.filter(m => m.definitorio && m.verdict === 'rojo')

  // 4. Derive overall
  const overall = deriveOverall(byTipo, definitorio_blockers)

  return {
    matches,
    overall,
    byTipo,
    definitorio_blockers,
    semaforo_rules_version: SEMAFORO_RULES_VERSION,
  }
}

// Re-export constants for orchestrator
export {
  SEMAFORO_RULES_VERSION,
  DEFINITORIO_DOCUMENT_TYPES,
  FINANCIERO_VERDE_MARGIN,
  ROJO_THRESHOLD,
  AMARILLO_THRESHOLD,
  MIN_N_FOR_THRESHOLD,
  TECNICO_COSINE_MIN,
} from './thresholds'
```

#### `unknownMatchResult` helper (private)

```typescript
function unknownMatchResult(req: ExtractedRequisito): MatchResult {
  return {
    requisito_id: req.requisito_id,
    verdict: 'rojo',
    reason: 'Requisito sin correspondencia en el perfil',
    confidence: 0.0,
    extraction_confidence: req.extraction_confidence ?? 0,
    definitorio: false,
  }
}
```

#### Orchestrator contract

The future `analisis-orchestration` spec MUST:
- Pass the full `ExtractedRequisito[]` for an `Analisis` — no pre-filtering.
- Pass the `CompanyProfileSnapshot` as pinned at analysis time — never re-fetch live profile.
- Persist `Analisis.semaforo_rules_version = result.semaforo_rules_version` together with `Analisis.verdict = result.overall`.
- Persist `MatchResult[]` to the `requisitos` table (verdict, reason, confidence, definitorio fields) in the same transaction.
- Insert a new `Analisis` row on re-run — never mutate existing rows.

## Design Rationale

The entry point is a thin dispatch layer: it does no matching logic itself, only routing.
The `switch` on `req.tipo` is the single place where new requisito types are wired in.
`unknown` default with `console.warn` ensures unknown tipos produce a rojo (safe default)
without throwing, which would abort the entire analysis.

## Dependencies

T2: `matchJuridico`. T3: `matchFinanciero`. T4: `matchTecnico`. T5: `aggregateByTipo`, `deriveOverall`. T1: all constants.

## Done When

- [ ] `lib/semaforo/index.ts` exports `runSemaforoMatching` and all constants from `thresholds.ts`.
- [ ] Switch dispatches `juridico → matchJuridico`, `financiero → matchFinanciero`, `tecnico|experiencia → matchTecnico`.
- [ ] Unknown tipo: `console.warn` + rojo MatchResult, no throw.
- [ ] `semaforo_rules_version` field on `SemaforoResult` is always `SEMAFORO_RULES_VERSION`.
- [ ] `definitorio_blockers` contains only matches where `definitorio === true AND verdict === 'rojo'`.
- [ ] `npm run typecheck` passes. Provider isolation grep passes (REQ-014). No forbidden imports.
