# T5: Kysely Database Interface

## Scope

- `src/types/db.ts` — Kysely `Database` interface and table type definitions

## Changes

### Table Type Pattern

For each table define three types following Kysely conventions:

```typescript
// Row type — what SELECT returns
export interface PliegoTable {
  id: PliegoId
  proceso_id: ProcesoId
  tipo: PliegoTipo                 // 'pliego_condiciones' | 'pliego_definitivo'
  file_path: string
  file_hash: string
  uploaded_by_empresa_id: EmpresaId | null
  page_count: number | null
  deleted_at: Date | null
  created_at: Date
}

// Insert type — what INSERT accepts (generated fields optional)
export type NewPliego = Insertable<PliegoTable>

// Update type — what UPDATE accepts (all fields optional)
export type PliegoUpdate = Updateable<PliegoTable>

// Sibling for non-pliego documents (RN-012)
export interface AnexoProcesoTable {
  id: AnexoProcesoId
  proceso_id: ProcesoId
  tipo: AnexoProcesoTipo           // 'anexo_tecnico' | 'estudio_previo' | 'resolucion' | 'otro'
  file_path: string
  file_hash: string
  uploaded_by_empresa_id: EmpresaId | null
  page_count: number | null
  deleted_at: Date | null
  created_at: Date
}

export type NewAnexoProceso    = Insertable<AnexoProcesoTable>
export type AnexoProcesoUpdate = Updateable<AnexoProcesoTable>
```

Apply the same triple for: `EmpresaTable`, `EmpresaMemberTable`, `ProcesoTable`, `SegmentoTable`, `AnalisisTable`, `RequisitoTable`, `PromptCacheTable`.

### ProcesoTable

```typescript
export interface ProcesoTable {
  id: ProcesoId
  secop_process_number: string
  entidad_contratante: string
  objeto: string
  modalidad: ModalidadContratacion
  valor_estimado: number | null
  cronograma: Record<string, unknown> | null
  created_at: Date
}
```

No `deleted_at` field — public procurement records are permanent (RN-004).

### AnalisisTable

```typescript
export interface AnalisisTable {
  id: AnalisisId
  proceso_id: ProcesoId
  empresa_id: EmpresaId
  pliego_ids: ColumnType<string[], string[], string[]>   // uuid[]; v1 length=1 (the analyzed Pliego)
  estado: AnalisisEstado
  semaforo: SemaforoColor | null
  error_message: string | null
  cost_usd: number | null                                 // populated post-extraction (REQ-014)
  model_metadata: ModelMetadata | null                    // populated post-extraction (REQ-014)
  prompt_version: string | null                           // denormalized from model_metadata
  semaforo_rules_version: string | null                   // populated post-aggregation (REQ-020)
  created_at: Date
  updated_at: Date
  completed_at: Date | null
}

// ModelMetadata is owned by this file (canonical declaration). Re-exported via the
// @/types barrel; downstream code (lib/extraction/types.ts in requisitos-extraction)
// MUST import from @/types, not redeclare locally.
export interface ModelMetadata {
  implementation_id: string
  model_name: string
  prompt_version: string
}
```

### EmpresaTable (with trigger-owned profile_updated_at)

```typescript
export interface EmpresaTable {
  id: EmpresaId
  nombre: string
  nit: string
  // Trigger-owned. ColumnType<select, insert, update> = <Date, never, never>
  // means the column is readable but FORBIDDEN at insert/update at the type
  // level. The Postgres trigger `set_empresa_profile_updated_at()` is the only
  // legitimate writer (REQ-015, RN-014).
  profile_updated_at: ColumnType<Date, never, never>
  created_at: Date
  updated_at: Date
}
```

### RequisitoTable

```typescript
import type { RequisitoCategoria, IsHabilitanteSource } from './domain/primitives'

export interface RequisitoTable {
  id: RequisitoId
  analisis_id: AnalisisId
  segmento_id: SegmentoId
  // Immutable post-INSERT per RN-016. ColumnType<select, insert, update> = <R, R, never>:
  // the value is readable, writable on INSERT, but FORBIDDEN on UPDATE at the type level.
  // Recategorization MUST go through orchestrator-level cache invalidation + re-extraction.
  // Compile-time enforcement parallels EmpresaTable.profile_updated_at's <Date, never, never>
  // (which is read-only entirely; categoria is read-and-insert-only).
  categoria: ColumnType<RequisitoCategoria, RequisitoCategoria, never>
  descripcion: string
  cumple: boolean | null
  semaforo: SemaforoColor
  justificacion: string | null
  is_habilitante: boolean                   // REQ-019
  is_habilitante_source: IsHabilitanteSource  // 'structural'|'llm'|'manual' (REQ-019, RN-018)
  citation_segment_id: SegmentoId           // required FK (REQ-013, RN-013)
  citation_quote: string                    // length-bounded by DB CHECK
  // Default false at the DB layer; ColumnType makes it optional on insert.
  citation_verified: ColumnType<boolean, boolean | undefined, boolean>
  created_at: Date
}
```

### SegmentoTable & PromptCacheTable

```typescript
import type { ColumnType } from 'kysely'

export interface SegmentoTable {
  id: SegmentoId
  pliego_id: PliegoId            // FK to pliego (was documento_id)
  categoria: SegmentoCategoria   // includes 'general' (RN-007)
  contenido: string
  orden: number
  page_range_start: number       // 1-indexed (RN-011)
  page_range_end: number         // 1-indexed inclusive (RN-011)
  heading_normalized: string | null
  heading_original: string | null
  is_synthetic: ColumnType<boolean, boolean | undefined, boolean>  // DB default false
  created_at: Date
}

export interface PromptCacheTable {
  id: PromptCacheId
  pliego_id: PliegoId           // FK to pliego (was documento_id)
  empresa_id: EmpresaId         // part of (pliego_id, empresa_id) unique key
  hash: string
  prompt_tokens: number
  cached_at: Date
  expires_at: Date
}
```

### Database Interface

```typescript
import { Insertable, Updateable, ColumnType } from 'kysely'

export interface Database {
  empresa: EmpresaTable
  empresa_member: EmpresaMemberTable
  proceso: ProcesoTable
  pliego: PliegoTable
  anexo_proceso: AnexoProcesoTable
  segmento: SegmentoTable
  analisis: AnalisisTable
  requisito: RequisitoTable
  prompt_cache: PromptCacheTable
}
```

### Column Name Contract (NFR-03)

Every field name in the Kysely table types must exactly match its Postgres column name (snake_case). The Zod schema field names must match as well — this is enforced by the typecheck gate in T6 via a structural compatibility check.

### Design Rationale (SRP)

`db.ts` is pure type declarations — no Kysely instance creation, no DB connection. The Kysely client is initialized in `src/lib/db.ts` (a downstream feature). Separating types from the client means domain types can be imported in server-only code, client components, and test utilities without pulling in the DB connection.

## Dependencies

Requires T2 — branded ID types and enum types from `primitives.ts` and entity schemas are imported here.

## Done When

- [ ] `src/types/db.ts` exports `Database` interface with all 9 table entries (incl. `pliego` and `anexo_proceso`)
- [ ] Row, `New*`, and `*Update` types exported for each table
- [ ] `ProcesoTable` has no `deleted_at` field
- [ ] `PliegoTable` and `AnexoProcesoTable` have nullable `deleted_at`; `PliegoTable.tipo` is `PliegoTipo` (narrow); `AnexoProcesoTable.tipo` is `AnexoProcesoTipo`
- [ ] `PliegoTable.file_hash` and `AnexoProcesoTable.file_hash` are `string` (validated to 64 chars at the Zod boundary)
- [ ] `AnalisisTable.pliego_ids` is `ColumnType<string[], string[], string[]>` (uuid[])
- [ ] `SegmentoTable.pliego_id` is `PliegoId`; has `page_range_start: number`, `page_range_end: number`, `heading_normalized: string | null`, `heading_original: string | null`, `is_synthetic: ColumnType<boolean, boolean | undefined, boolean>`
- [ ] `PromptCacheTable` has `pliego_id` and `empresa_id` (was `documento_id`)
- [ ] All column names exactly match the Postgres migration from T3
- [ ] `Insertable<T>` and `Updateable<T>` applied from Kysely — no manual optional mapping
- [ ] `NewSegmento` makes `is_synthetic` optional (DB default applies); type-test asserts this
- [ ] `RequisitoTable` carries `citation_segment_id`, `citation_quote`, `citation_verified` (ColumnType-optional on insert), `is_habilitante: boolean`, `is_habilitante_source: IsHabilitanteSource`
- [ ] `RequisitoTable.categoria` is `ColumnType<RequisitoCategoria, RequisitoCategoria, never>`; type-test asserts that `db.updateTable('requisito').set({ categoria: 'tecnico' })` fails to compile (TC-030 type-side)
- [ ] `AnalisisTable` carries `cost_usd`, `model_metadata`, `prompt_version`, `semaforo_rules_version` (all `| null`)
- [ ] `EmpresaTable.profile_updated_at` typed as `ColumnType<Date, never, never>`; type-test asserts that `db.insertInto('empresa').values({ ..., profile_updated_at: ... })` and `db.updateTable('empresa').set({ profile_updated_at: ... })` both fail to compile (TC-022 type-side)
- [ ] TC-005 passes: `tsc --noEmit` with strict mode produces zero errors
