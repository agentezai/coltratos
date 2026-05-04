# T4: Barrel Exports + Typecheck Gate

## Scope

- `src/types/index.ts` — Single public export surface for all domain types (primitives, Zod schemas, Kysely interface)

## Changes

### Barrel Contents

`src/types/index.ts` re-exports:

```typescript
// Primitives — branded IDs and all enum const objects + union types
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

// TypeScript types (compile-time)
export type { Empresa } from './domain/empresa'
export type { Proceso } from './domain/proceso'
export type { Pliego } from './domain/pliego'
export type { AnexoProceso } from './domain/anexo-proceso'
export type { Segmento } from './domain/segmento'
export type { Analisis } from './domain/analisis'
export type { Requisito } from './domain/requisito'
export type { PromptCache } from './domain/prompt-cache'

// Kysely Database interface and table types
export type {
  Database,
  ModelMetadata,
  EmpresaTable, NewEmpresa, EmpresaUpdate,
  EmpresaMemberTable, NewEmpresaMember, EmpresaMemberUpdate,
  ProcesoTable, NewProceso, ProcesoUpdate,
  PliegoTable, NewPliego, PliegoUpdate,
  AnexoProcesoTable, NewAnexoProceso, AnexoProcesoUpdate,
  SegmentoTable, NewSegmento, SegmentoUpdate,
  AnalisisTable, NewAnalisis, AnalisisUpdate,
  RequisitoTable, NewRequisito, RequisitoUpdate,
  PromptCacheTable, NewPromptCache, PromptCacheUpdate,
} from './db'
```

The barrel does **not** export `Documento*` — that name is removed (RN-012 / ADR-008). Consumers of the prior name must be updated to import `Pliego*` or `AnexoProceso*`.

The barrel does **not** yet export extraction-contract types (`RequisitoExtractionPayloadSchema`, `ExtractorLogger`, `Semaforo`, `SemaforoStats`, `HABILITANTE_HEADING_PATTERNS`). Those are added by the `domain-model-extraction-contracts` spec.

### tsconfig Alias

Ensure `tsconfig.json` includes `"@/types": ["src/types/index.ts"]` in `compilerOptions.paths` so downstream code can use `import { ... } from '@/types'`.

### Typecheck Gate

Run `npm run typecheck` (or `tsc --noEmit --strict`) as the final gate. Must pass with zero errors and complete in under 10s. This gate is the acceptance criterion for the `domain-model-primitives` feature.

### Design Rationale

The barrel is the only file that changes when a new entity is added — existing entity files are untouched. Consumers import from one path; if an entity moves, only the barrel needs updating.

## Dependencies

Requires T2 (all Zod schemas) and T3 (Kysely interface).

## Done When

- [ ] `src/types/index.ts` exports all 8 Zod schemas, all 8 inferred TS types, `Database`, `ModelMetadata`, and `New*`/`*Update` types for all 9 tables
- [ ] `@/types` path alias configured in `tsconfig.json`
- [ ] `import { ProcesoSchema, type Proceso, PliegoSchema, type Pliego, AnexoProcesoSchema, type AnexoProceso, type Database } from '@/types'` resolves without TypeScript errors (TC-005)
- [ ] `import { DocumentoSchema } from '@/types'` produces a TypeScript error (TC-005 negative)
- [ ] `npm run typecheck` in strict mode exits with code 0 in under 10s
