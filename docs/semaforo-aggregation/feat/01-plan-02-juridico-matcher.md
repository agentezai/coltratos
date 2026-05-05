# T2: Jurídico Matcher

## Scope

- `lib/semaforo/juridico-matcher.ts` — NEW. Matches extracted jurídico requirements against `CompanyProfileSnapshot`.

## Changes

### `lib/semaforo/juridico-matcher.ts`

```typescript
import type { JuridicoExtracted, CompanyProfileSnapshot, MatchResult } from '@/types'
import {
  DEFINITORIO_DOCUMENT_TYPES,
  OBTAINABLE_DOCUMENT_TYPES,
} from './thresholds'

export function matchJuridico(
  req: JuridicoExtracted,
  profile: CompanyProfileSnapshot,
): MatchResult
```

#### Match logic (in priority order)

**Step 1 — is_definitorio classification**
Check `req.document_type` against `DEFINITORIO_DOCUMENT_TYPES`. Set `definitorio = true` if it
matches. This flag is set BEFORE any lookup — it is not derived from the profile result.

**Step 2 — Profile lookup by document_type**

For `tipo_societario`:
- Extract `profile.legal_data.tipo_societario` (e.g., `'SAS'`, `'Persona Natural'`)
- Compare against `req.required_tipo_societario`
- Match: verde, confidence = 1.0, `reason = "Tipo societario SAS coincide con requerimiento"`
- Mismatch (definitorio): rojo, confidence = 1.0, `reason = "Tipo societario Persona Natural no cumple requerimiento SAS o SA"`

For `rup_vigente`:
- Check `profile.legal_data.rup_vigente: boolean`
- `true` → verde, 1.0. `false` → rojo (definitorio), 1.0
- `undefined` → amarillo (unresolved), 0.3, reason = `"Estado RUP no disponible en perfil"`

For `inhabilidades_incompatibilidades`:
- Check `profile.legal_data.sin_inhabilidades: boolean`
- `true` (no inhabilidades) → verde, 1.0. `false` → rojo (definitorio), 1.0
- `undefined` → amarillo, 0.3

For `objeto_social_requerido`:
- Check `profile.legal_data.objeto_social` contains required text (case-insensitive substring)
- Match → verde, 1.0. No match → rojo (definitorio), 1.0. Field absent → amarillo, 0.3

For `capital_social_minimo`:
- Compare `profile.legal_data.capital_social_cop` against `req.capital_minimo_cop`
- Met → verde, 1.0. Not met → rojo (definitorio), 1.0. Field absent → amarillo, 0.3

**Step 3 — Known-obtainable (non-definitorio)**
`document_type` in `OBTAINABLE_DOCUMENT_TYPES`:
- Document present in `profile.documentos[document_type]` AND status=`vigente` → verde, 1.0
- Present but expired → amarillo, 0.5, reason = `"[doc] vencido — renovación requerida antes de presentación"`
- Absent from profile → amarillo, 0.5 (heuristic: obtainable), reason = `"[doc] no registrado en perfil — trámite antes de cierre"`

**Step 4 — Unresolved**
`document_type` matches neither list:
- `console.warn('[semaforo-aggregation] unknown document_type', { document_type })`
- rojo, 0.0, `definitorio = false`, reason = `"Requisito sin correspondencia en el perfil"`

#### Reason templates (all ≤200 chars)

| Outcome | Template |
|---------|----------|
| Verde — present | `"[label] vigente en perfil"` |
| Verde — tipo match | `"Tipo societario [actual] coincide con requerimiento [required]"` |
| Amarillo — expired | `"[label] vencido — renovar antes de presentación de oferta"` |
| Amarillo — obtainable | `"[label] no registrado en perfil — trámite requerido antes del cierre"` |
| Amarillo — unresolved | `"[label] no disponible en perfil — verificación manual requerida"` |
| Rojo definitorio — tipo | `"Tipo societario [actual] no cumple requerimiento [required]"` |
| Rojo definitorio — rup | `"RUP suspendido o cancelado — inhabilidad legal para presentar oferta"` |
| Rojo definitorio — inhabilidad | `"Inhabilidad o incompatibilidad detectada — empresa no puede contratar con el Estado"` |
| Rojo definitorio — objeto social | `"Objeto social no incluye [required] — reconfiguración de escritura requerida"` |
| Rojo definitorio — capital | `"Capital social [actual] inferior al mínimo exigido [required]"` |

All values substituted at match time; totals must not exceed 200 chars.

## Design Rationale

`is_definitorio` is set in Step 1 (before lookup), not derived from the match outcome.
This ensures that even if the profile is incomplete, we still classify the requisito
correctly for the knockout rule. The heuristics list (`OBTAINABLE_DOCUMENT_TYPES`) is in
`thresholds.ts` so adding a new obtainable type is a single-file PR with a version bump.

## Dependencies

T1: `DEFINITORIO_DOCUMENT_TYPES`, `OBTAINABLE_DOCUMENT_TYPES` from `thresholds.ts`.
T0: `JuridicoExtracted`, `CompanyProfileSnapshot`, `MatchResult` from `@/types`.

## Done When

- [ ] `lib/semaforo/juridico-matcher.ts` exports `matchJuridico`.
- [ ] All 5 definitorio types handled with correct verdict and confidence.
- [ ] All 7 obtainable types handled with heuristic amarillo path.
- [ ] Unknown type → warn + rojo + confidence 0.0.
- [ ] `MatchResult.reason.length ≤ 200` for all code paths (test covers every branch).
- [ ] `definitorio` field set correctly for all cases.
- [ ] No inline string literals for document_type — use constants from `thresholds.ts`.
- [ ] `npm run typecheck` passes. No forbidden imports.
