# T6: Barrel Exports + Typecheck Gate

## Scope

- `src/types/index.ts` — Single public export surface for all domain types
- `src/types/logger.ts` — **NEW.** `ExtractorLogger` structural interface (REQ-017)

## Changes

### `src/types/logger.ts` (NEW)

```typescript
// Structural logger interface used by lib/extraction/. Pure type — zero runtime.
// Composition root (orchestrator) provides the implementation; lib/extraction/
// only depends on this shape (per requisitos-extraction RN-006).
export interface ExtractorLogger {
  info(event: string, payload: Record<string, unknown>): void
  warn(event: string, payload: Record<string, unknown>): void
  error(event: string, payload: Record<string, unknown>): void
}
```

### Barrel Contents

`src/types/index.ts` re-exports:

```typescript
// Primitives
export * from './domain/primitives'

// Zod schemas (runtime)
export { EmpresaSchema } from './domain/empresa'
export { ProcesoSchema } from './domain/proceso'
export { PliegoSchema } from './domain/pliego'
export { AnexoProcesoSchema } from './domain/anexo-proceso'
export { SegmentoSchema } from './domain/segmento'
export { AnalisisSchema } from './domain/analisis'
export { RequisitoSchema } from './domain/requisito'
export { PromptCacheSchema } from './domain/prompt-cache'
export {
  RequisitoExtractionPayloadSchema,
  RequisitoExtractionPayloadArraySchema,
} from './domain/extraction-payload'

// TypeScript types (compile-time)
export type { Empresa } from './domain/empresa'
export type { Proceso } from './domain/proceso'
export type { Pliego } from './domain/pliego'
export type { AnexoProceso } from './domain/anexo-proceso'
export type { Segmento } from './domain/segmento'
export type { Analisis } from './domain/analisis'
export type { Requisito } from './domain/requisito'
export type { PromptCache } from './domain/prompt-cache'
export type { RequisitoExtractionPayload } from './domain/extraction-payload'

// Logger interface (consumed by lib/extraction; defined here to avoid circular deps)
export type { ExtractorLogger } from './logger'

// Semaforo aggregation types (rev 5 — REQ-021)
export type {
  Semaforo,
  SemaforoStats,
  RequisitoCategoria,    // re-exported from primitives via semaforo.ts
  IsHabilitanteSource,   // re-exported from primitives via semaforo.ts
} from './domain/semaforo'

// Habilitante pattern constants (rev 5 — REQ-022) — runtime values, not types
export {
  HABILITANTE_HEADING_PATTERNS,
  HABILITANTE_PATTERNS_VERSION,
} from './domain/habilitante-patterns'

// Kysely Database interface and table types
export type {
  Database,
  EmpresaTable, ProcesoTable, PliegoTable, AnexoProcesoTable, SegmentoTable,
  AnalisisTable, RequisitoTable, PromptCacheTable,
  ModelMetadata,
  NewProceso, ProcesoUpdate,
  NewPliego, PliegoUpdate,
  NewAnexoProceso, AnexoProcesoUpdate,
  NewAnalisis, AnalisisUpdate,
  /* etc — one New*/Update* per table */
} from './db'
```

The barrel does **not** export `Documento*` — that name is removed (RN-012 / ADR-008). Consumers of the prior name must be updated to import `Pliego*` or `AnexoProceso*` depending on which kind of document they handle.

### Typecheck Gate

This task includes running `npm run typecheck` (or `tsc --noEmit --strict`) as the final gate. The typecheck must pass with zero errors and complete in under 10s. This gate is the acceptance criterion for the entire domain-model feature.

### tsconfig Alias

Ensure `tsconfig.json` includes `"@/types": ["src/types/index.ts"]` in `compilerOptions.paths` so downstream code can use `import { ... } from '@/types'`.

### Design Rationale (OCP)

The barrel is the only file that changes when a new entity is added — existing entity files are not touched. Consumers import from one path; if an entity moves, only the barrel needs updating.

## Dependencies

Requires T2 (all Zod schemas exist) and T5 (Kysely interface exists).

## Done When

- [ ] `src/types/index.ts` exports all 9 schemas (incl. `RequisitoExtractionPayloadSchema`), all 9 types, the Database interface, `ModelMetadata`, `ExtractorLogger`, the Semaforo types (`Semaforo`/`SemaforoStats`/`RequisitoCategoria`/`IsHabilitanteSource`), and the habilitante runtime constants (`HABILITANTE_HEADING_PATTERNS`/`HABILITANTE_PATTERNS_VERSION`)
- [ ] `src/types/logger.ts` exists and exports `ExtractorLogger` as a pure interface (zero runtime code)
- [ ] `@/types` path alias configured in `tsconfig.json`
- [ ] `import { ProcesoSchema, type Proceso, PliegoSchema, type Pliego, AnexoProcesoSchema, type AnexoProceso, type Database, RequisitoExtractionPayloadSchema, type RequisitoExtractionPayload, type ExtractorLogger } from '@/types'` resolves without errors
- [ ] `import { type Semaforo, type SemaforoStats, type RequisitoCategoria, type IsHabilitanteSource, HABILITANTE_HEADING_PATTERNS, HABILITANTE_PATTERNS_VERSION } from '@/types'` resolves without errors (TC-031)
- [ ] `import { DocumentoSchema } from '@/types'` produces a TypeScript error (legacy name removed)
- [ ] `npm run typecheck` (strict mode) exits with code 0 in under 10s
- [ ] TC-005, TC-007, TC-031 pass
