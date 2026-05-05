# T4: Técnico / Experiencia Matcher

## Scope

- `lib/semaforo/tecnico-matcher.ts` — NEW. Matches `tecnico` and `experiencia` tipo requisitos
  against company profile's `contratos_previos` and `personal_clave`.

## Changes

### `lib/semaforo/tecnico-matcher.ts`

```typescript
import type { TecnicoExtracted, CompanyProfileSnapshot, MatchResult } from '@/types'
import { TECNICO_COSINE_MIN } from './thresholds'

export function matchTecnico(
  req: TecnicoExtracted,
  profile: CompanyProfileSnapshot,
): MatchResult
```

#### `TecnicoExtracted` shape

```typescript
type TecnicoExtracted = {
  tipo: 'tecnico' | 'experiencia'
  // For experiencia requirements:
  valor_cop_min?: number               // minimum contract value required
  unspsc_required?: string             // required UNSPSC code (8-digit)
  objeto_description?: string          // free-text description for cosine matching
  embedding?: number[]                 // precomputed embedding of objeto_description
  // For tecnico (personnel) requirements:
  rol_required?: string                // e.g., "Director de Proyecto"
  titulo_required?: string             // e.g., "Ingeniero de Sistemas"
  years_experience_min?: number
  extraction_confidence: number
}
```

#### Match logic — Experiencia (contract-based)

Iterate `profile.contratos_previos`. For each contract, apply match hierarchy in order (best-match wins):

**Tier 1 — Exact UNSPSC match**
`req.unspsc_required` is present AND `contract.unspsc_codes.includes(req.unspsc_required)`:
→ candidate with verdict-verde, confidence = 1.0

**Tier 2 — Parent UNSPSC match (one segment level up)**
Parent = `req.unspsc_required.slice(0, 6) + '00'` (segment level):
`contract.unspsc_codes.some(code => code.slice(0, 6) === req.unspsc_required.slice(0, 6))`:
→ candidate with verdict-amarillo, confidence = 0.7

**Tier 3 — Embedding cosine similarity**
`req.embedding` present AND `contract.embedding` present:
```
cosine = dotProduct(req.embedding, contract.embedding)
         / (norm(req.embedding) × norm(contract.embedding))
```
`cosine >= TECNICO_COSINE_MIN (0.80)`:
→ candidate with verdict-amarillo, confidence = cosine

**Tier 4 — No match**
→ rojo, confidence = 0.0

**Filter step**: if `req.valor_cop_min` is present, only contracts with `contract.valor_cop >= req.valor_cop_min` are eligible (pre-filter before tier matching).

Best candidate (highest confidence) is the match result.

#### Match logic — Personal clave (personnel-based)

Check `profile.personal_clave` for entries matching the required role:
- `personal_clave.find(p => p.rol === req.rol_required AND p.years_experience >= req.years_experience_min AND p.titulo matches req.titulo_required)`:
  - Exact match (rol + titulo exact + years ≥ min) → verde, confidence = 1.0
  - Rol + years match, titulo similar (substring) → amarillo, confidence = 0.7
  - Rol match only → amarillo, confidence = 0.5
  - No match → rojo, confidence = 0.0

#### Reason templates (≤200 chars)

| Outcome | Template |
|---------|----------|
| Verde — exact UNSPSC | `"Contrato [entidad] ([year]) con UNSPSC [code] — coincidencia exacta"` |
| Verde — exact personal | `"[Nombre] — [rol] con [years] años de experiencia — coincidencia exacta"` |
| Amarillo — parent UNSPSC | `"Contrato [entidad] con segmento UNSPSC relacionado [code] — coincidencia parcial"` |
| Amarillo — cosine | `"Contrato [entidad] con objeto similar (similitud [cosine]) — verificación recomendada"` |
| Amarillo — partial personal | `"[Nombre] — rol compatible pero perfil incompleto — verificación recomendada"` |
| Rojo — no match | `"Sin contratos previos con UNSPSC o experiencia suficiente para este requisito"` |
| Rojo — no personal | `"Sin personal clave con el rol y experiencia requeridos"` |

## Design Rationale

`TECNICO_COSINE_MIN` is imported from `thresholds.ts` — never inlined. The cosine threshold
(0.80) is a tunable constant; lowering it would produce more amarillo matches at the cost of
precision. It is a `SEMAFORO_RULES_VERSION`-bumping change.

The valor_cop_min pre-filter prevents a low-value contract from being used to qualify a
large-contract requirement — a common source of false verde in procurement eligibility.

Cosine similarity requires precomputed embeddings on `contratos_previos` entries. These are
stored as part of `CompanyProfileSnapshot` (computed when the profile is saved, using the same
OpenAI embedding model as `procesos_index`). If either embedding is absent, Tier 3 is skipped.

## Dependencies

T1: `TECNICO_COSINE_MIN` from `thresholds.ts`.
T0: `TecnicoExtracted`, `CompanyProfileSnapshot`, `MatchResult`, `ContratoPrevio` from `@/types`.

## Done When

- [ ] `lib/semaforo/tecnico-matcher.ts` exports `matchTecnico`.
- [ ] Tier 1 (exact UNSPSC): verde, confidence = 1.0.
- [ ] Tier 2 (parent UNSPSC): amarillo, confidence = 0.7.
- [ ] Tier 3 (cosine ≥ 0.80): amarillo, confidence = cosine value.
- [ ] Tier 4 (no match): rojo, confidence = 0.0.
- [ ] `valor_cop_min` pre-filter applied before tier matching.
- [ ] Personal clave matching for `tipo: 'tecnico'` requisitos.
- [ ] Best-matching contract selected (highest confidence).
- [ ] All reasons ≤200 chars. `npm run typecheck` passes. No forbidden imports.
