# T2: Semaforo Types + Habilitante Patterns + Barrel Additions

## Scope

- `src/types/domain/semaforo.ts` — Pure TypeScript view types for aggregation output
- `src/types/domain/habilitante-patterns.ts` — Versioned habilitante heading constants
- `src/types/index.ts` — Add extraction-contract exports to the existing barrel

## Changes

### `src/types/domain/semaforo.ts`

```typescript
import type { SemaforoColor, Requisito } from './primitives'

// Narrow categoria union — no 'general'. RequisitoCategoria is defined
// in domain-model-primitives/primitives.ts; re-exported here for convenience.
export type { RequisitoCategoria, IsHabilitanteSource } from './primitives'

export type SemaforoStats = {
  total: number
  cumple: number
  noCumple: number
  sinInfo: number
  cumplePct: number
}

export type Semaforo = {
  overall: SemaforoColor
  byCategoria: Record<RequisitoCategoria, SemaforoColor>   // exactly 4 keys — 'general' is absent
  blockers: Requisito[]
  stats: SemaforoStats
}
```

Pure type definitions — no Zod schemas, no runtime code. `byCategoria: Record<RequisitoCategoria, SemaforoColor>` has exactly four keys; accessing `.byCategoria.general` is a TypeScript compile error.

### `src/types/domain/habilitante-patterns.ts`

```typescript
export const HABILITANTE_HEADING_PATTERNS: readonly RegExp[] = [
  /\brequisitos\s+habilitantes\b/,
  /\bcapacidad\s+juridica\b/,
  /\bcapacidad\s+financiera\b/,
  /\bcapacidad\s+tecnica\b/,
  /\bexperiencia\s+(minima|acreditada|requerida)\b/,
]

export const HABILITANTE_PATTERNS_VERSION = 'v1.0.0' as const
```

Patterns are authored against the NFD-normalized lowercase form produced by pdf-ingestion. The version constant must be bumped whenever any pattern is added, changed, or removed — downstream caches that depend on structural `is_habilitante` classifications must invalidate on version change (RN-003).

`'structural'` classifications are deterministic: if a segmento's `heading_normalized` matches any pattern, `is_habilitante_source = 'structural'` regardless of LLM output. The LLM-fallback tier fires only when no pattern matches.

### Barrel Additions to `src/types/index.ts`

Append to the existing barrel (created by `domain-model-primitives` T4):

```typescript
// Extraction payload schema (LLM output contract — distinct from RequisitoSchema)
export { RequisitoExtractionPayloadSchema, RequisitoExtractionPayloadArraySchema } from './domain/extraction-payload'
export type { RequisitoExtractionPayload } from './domain/extraction-payload'

// Logger interface (consumed by lib/extraction; zero runtime)
export type { ExtractorLogger } from './logger'

// Semaforo aggregation types
export type { Semaforo, SemaforoStats, RequisitoCategoria, IsHabilitanteSource } from './domain/semaforo'

// Habilitante pattern constants (runtime values, not types)
export { HABILITANTE_HEADING_PATTERNS, HABILITANTE_PATTERNS_VERSION } from './domain/habilitante-patterns'
```

## Dependencies

Requires T1 — `RequisitoExtractionPayloadSchema` and `ExtractorLogger` must exist before this task adds them to the barrel. Requires `domain-model-primitives` — imports `SemaforoColor`, `RequisitoCategoria`, and `Requisito` from `./primitives`.

## Done When

- [ ] `src/types/domain/semaforo.ts` exports `Semaforo`, `SemaforoStats`, and re-exports `RequisitoCategoria`, `IsHabilitanteSource`
- [ ] `src/types/domain/habilitante-patterns.ts` exports `HABILITANTE_HEADING_PATTERNS` (`readonly RegExp[]`, length 5) and `HABILITANTE_PATTERNS_VERSION: 'v1.0.0'`
- [ ] `src/types/index.ts` barrel exports all T1 and T2 additions
- [ ] `import { type Semaforo, type SemaforoStats, type RequisitoCategoria, type IsHabilitanteSource, HABILITANTE_HEADING_PATTERNS, HABILITANTE_PATTERNS_VERSION } from '@/types'` resolves without TypeScript errors (TC-005)
- [ ] `import { RequisitoExtractionPayloadSchema, type RequisitoExtractionPayload, type ExtractorLogger } from '@/types'` resolves without TypeScript errors
- [ ] `semaforo.byCategoria.general` produces a TypeScript compile error (TC-006)
- [ ] `semaforo.byCategoria.juridico` compiles (TC-006)
- [ ] `npm run typecheck` in strict mode exits with code 0 in under 10s (NFR-01)
