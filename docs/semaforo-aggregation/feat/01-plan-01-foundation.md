# T1: Thresholds + ADRs

## Scope

- `lib/semaforo/thresholds.ts` — NEW (replaces v1 thresholds file). All versioned constants for v2 matching engine.
- `.nybo/foundation/adrs/ADR-011.md` — UPDATE. Supersedes v1 threshold-value ADR.
- `.nybo/foundation/adrs/ADR-012.md` — UPDATE. N≥5 per-tipo cutoff decision.
- `.nybo/foundation/adrs/ADR-013.md` — NEW. Confidence derivation approach.
- `.nybo/foundation/adrs/ADR-014.md` — NEW. `is_definitorio` static-list-in-matching decision.

## Changes

### `lib/semaforo/thresholds.ts`

```typescript
// lib/semaforo/thresholds.ts
// Versioning protocol (RN-015): any change to these constants requires:
//   (a) editing this file, (b) bumping SEMAFORO_RULES_VERSION,
//   (c) updating affected golden fixtures, (d) writing an ADR.

export const SEMAFORO_RULES_VERSION = 'v2.0.0' as const

// Per-tipo threshold aggregation (RN-009)
export const MIN_N_FOR_THRESHOLD = 5 as const
export const ROJO_THRESHOLD = 0.30 as const      // >30% rojo → tipo-rojo (N≥5 only)
export const AMARILLO_THRESHOLD = 0.50 as const  // >50% amarillo → tipo-amarillo (N≥5 only)

// Financiero confidence (RN-010)
export const FINANCIERO_VERDE_MARGIN = 0.10 as const  // ≥10% over threshold → verde

// Técnico cosine minimum for a qualifying match (RN-011)
export const TECNICO_COSINE_MIN = 0.80 as const

// Jurídico is_definitorio classification (RN-016)
// Changes to this list are SEMAFORO_RULES_VERSION-bumping events.
export const DEFINITORIO_DOCUMENT_TYPES = [
  'tipo_societario',
  'rup_vigente',
  'inhabilidades_incompatibilidades',
  'objeto_social_requerido',
  'capital_social_minimo',
] as const satisfies readonly string[]

// Jurídico known-obtainable (non-definitorio) types — absence → amarillo heuristic (RN-013, RN-016)
export const OBTAINABLE_DOCUMENT_TYPES = [
  'paz_y_salvo_tributario',
  'paz_y_salvo_parafiscal',
  'poliza_responsabilidad',
  'certificado_rut',
  'certificado_rup_copia',
  'registro_camara_comercio_renovado',
  'certificado_existencia_representacion',
] as const satisfies readonly string[]
```

All exports are `as const` literal types. The aggregator and matchers import from this file — numeric literals MUST NOT be inlined elsewhere (TC-017 grep enforces this).

### ADR-011 (update)

Title: **v2 matching engine: per-tipo matchers + N≥5 threshold aggregation** · Status: **Accepted**

Supersedes v1 ADR-011 (simple 90%/70% threshold on aggregated verdicts).

Key sections:
- **Decision**: replace aggregation-only with three per-tipo matchers; replace 90%/70% verde-percentage with 30%/50% rojo/amarillo percentage thresholds per tipo; add jurídico-definitorio knockout; apply thresholds only when N≥5 per tipo.
- **Rationale**: v1 assumed `cumple` was set upstream by extraction — discovery revealed matching was missing. Per-tipo thresholds prevent a large batch of técnico misses from contaminating a strong jurídico result and vice versa. The N≥5 cutoff prevents a single non-definitorio miss in a small pliego from producing rojo.
- **Validation**: same v1.1 plan — calibrate against N≥50 análisis outcomes.

### ADR-012 (update)

Title: **N≥5 per-tipo cutoff: non-monotone transition is intentional** · Status: **Accepted**

- **Decision**: threshold logic (30%/50%) applies only when a tipo has ≥5 requisitos. Below N=5, only definitorio knockout fires; non-definitorio rojos are treated as tipo-amarillo.
- **Rationale**: the N=4→N=5 transition (1 non-definitorio rojo: amarillo→verde) is non-monotone and intentional. Large pliegos tolerate small percentages of misses without penalizing the verdict; small pliegos are more conservatively evaluated because there is no denominator to absorb individual misses. The cutoff is documented in spec RN-009 with worked examples.

### ADR-013 (new)

Title: **Confidence derived from evidence quality, not extraction confidence** · Status: **Accepted**

- **Decision**: `MatchResult.confidence` is computed per-tipo from matching evidence quality (margin size, UNSPSC tier, heuristic resolution). `extraction_confidence` is a separate passthrough field.
- **Rationale**: extraction confidence answers "how sure is the LLM that it read this correctly." Matching confidence answers "how clearly does the rule apply." Mixing them produces a combined number that answers neither question and obscures which step introduced uncertainty.

### ADR-014 (new)

Title: **`is_definitorio` classification: static pattern list in matching layer** · Status: **Accepted**

- **Decision**: jurídico requisitos are classified as definitorio by checking `document_type` against `DEFINITORIO_DOCUMENT_TYPES` in `thresholds.ts`. The extraction layer and LLM do NOT set this flag.
- **Rationale**: definitorio is a legal judgment that changes only when procurement law or project knowledge evolves — not per-pliego. Static list is auditable, zero-cost at match time, and versionable. Adding a `document_type` to the definitorio list is a `SEMAFORO_RULES_VERSION`-bumping event with an ADR entry.

## Design Rationale

Concentrating all constants and ADRs in T1 means matchers (T2/T3/T4) import from one file with no numeric literals. Threshold tuning is a single-file PR; `git blame` points directly at the rule change. All four ADRs are co-located with the constants they justify.

## Dependencies

T0 (domain-model-mvp): `CompanyProfileSnapshot`, `ExtractedRequisito`, `MatchResult`, `SemaforoResult`, `TipoVerdict`, `RequisitoTipo` types exported from `@/types`.

## Done When

- [ ] `lib/semaforo/thresholds.ts` exports all named constants listed above as `as const` literals.
- [ ] `SEMAFORO_RULES_VERSION === 'v2.0.0'`.
- [ ] `DEFINITORIO_DOCUMENT_TYPES` is a `readonly string[]` with exactly 5 entries.
- [ ] `OBTAINABLE_DOCUMENT_TYPES` is a `readonly string[]` with exactly 7 entries.
- [ ] ADR-011 through ADR-014 exist under `.nybo/foundation/adrs/` with Status: Accepted and all required sections.
- [ ] `npm run typecheck` passes. Zero non-primitive imports in `thresholds.ts`.
