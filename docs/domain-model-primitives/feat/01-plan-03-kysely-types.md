# T3: Kysely Database Interface

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
  pliego_ids: ColumnType<string[], string[], string[]>   // uuid[]; v1 length=1
  estado: AnalisisEstado
  semaforo: SemaforoColor | null
  error_message: string | null
  cost_usd: number | null
  model_metadata: ModelMetadata | null
  prompt_version: string | null
  semaforo_rules_version: string | null
  created_at: Date
  updated_at: Date
  completed_at: Date | null
}

// ModelMetadata is canonical here. Re-exported via the @/types barrel.
// Downstream code MUST import from @/types, not redeclare locally.
export interface ModelMetadata {
  implementation_id: string
  model_name: string
  prompt_version: string
}
```

### EmpresaTable (trigger-owned profile_updated_at)

```typescript
export interface EmpresaTable {
  id: EmpresaId
  nombre: string
  nit: string
  // Trigger-owned. ColumnType<select, insert, update> = <Date, never, never>
  // readable but FORBIDDEN at insert/update. The Postgres trigger
  // set_empresa_profile_updated_at() is the only legitimate writer (REQ-011, RN-014).
  profile_updated_at: ColumnType<Date, never, never>
  created_at: Date
  updated_at: Date
}
```

### RequisitoTable

```typescript
export interface RequisitoTable {
  id: RequisitoId
  analisis_id: AnalisisId
  segmento_id: SegmentoId
  // Immutable post-INSERT per RN-016. ColumnType<select, insert, update> = <R, R, never>:
  // readable and writable on INSERT, but FORBIDDEN on UPDATE.
  // Recategorization MUST go through orchestrator-level cache invalidation + re-extraction.
  categoria: ColumnType<RequisitoCategoria, RequisitoCategoria, never>
  descripcion: string
  cumple: boolean | null
  semaforo: SemaforoColor
  justificacion: string | null
  is_habilitante: boolean
  is_habilitante_source: IsHabilitanteSource
  citation_segment_id: SegmentoId
  citation_quote: string
  citation_verified: ColumnType<boolean, boolean | undefined, boolean>
  created_at: Date
}
```

### SegmentoTable & PromptCacheTable

```typescript
export interface SegmentoTable {
  id: SegmentoId
  pliego_id: PliegoId
  categoria: SegmentoCategoria   // includes 'general' (RN-007)
  contenido: string
  orden: number
  page_range_start: number
  page_range_end: number
  heading_normalized: string | null
  heading_original: string | null
  is_synthetic: ColumnType<boolean, boolean | undefined, boolean>
  created_at: Date
}

export interface PromptCacheTable {
  id: PromptCacheId
  pliego_id: PliegoId
  empresa_id: EmpresaId
  hash: string
  prompt_tokens: number
  cached_at: Date
  expires_at: Date
}
```

### EmpresaMemberTable

```typescript
export interface EmpresaMemberTable {
  id: string
  empresa_id: EmpresaId
  user_id: string
  role: EmpresaMemberRole
  created_at: Date
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

### Column Name Contract

Every field name in Kysely table types must exactly match its Postgres column name (snake_case). The Zod schema field names must match as well — enforced by the typecheck gate in T4.

### Design Rationale

`db.ts` is pure type declarations — no Kysely instance, no DB connection. The Kysely client is initialized in `src/lib/db.ts` (a downstream feature). Separating types from the client means domain types are importable in server-only code, client components, and test utilities without pulling in a DB connection.

## Dependencies

Requires T2 — branded ID types, enum types, and entity schemas must exist before this file can import them.

## Done When

- [ ] `src/types/db.ts` exports `Database` interface with all 9 table entries
- [ ] Row, `New*`, and `*Update` types exported for each table via `Insertable<T>` and `Updateable<T>`
- [ ] `ProcesoTable` has no `deleted_at` field (TC-003b parity)
- [ ] `PliegoTable` and `AnexoProcesoTable` have nullable `deleted_at`; `PliegoTable.tipo` is `PliegoTipo`; `AnexoProcesoTable.tipo` is `AnexoProcesoTipo`
- [ ] `AnalisisTable.pliego_ids` is `ColumnType<string[], string[], string[]>`
- [ ] `SegmentoTable` has `page_range_start: number`, `page_range_end: number`, `heading_normalized: string | null`, `heading_original: string | null`, `is_synthetic: ColumnType<boolean, boolean | undefined, boolean>`
- [ ] `PromptCacheTable` has `pliego_id` and `empresa_id`
- [ ] `RequisitoTable` carries `citation_segment_id`, `citation_quote`, `citation_verified`, `is_habilitante: boolean`, `is_habilitante_source: IsHabilitanteSource`
- [ ] `RequisitoTable.categoria` is `ColumnType<RequisitoCategoria, RequisitoCategoria, never>` — type-test asserts `db.updateTable('requisito').set({ categoria: 'tecnico' })` fails to compile (TC-012)
- [ ] `EmpresaTable.profile_updated_at` is `ColumnType<Date, never, never>` — type-test asserts both `db.insertInto('empresa').values({ ..., profile_updated_at: new Date() })` and `db.updateTable('empresa').set({ profile_updated_at: new Date() })` fail to compile (TC-010 Kysely-side)
- [ ] `ModelMetadata` interface exported
- [ ] `tsc --noEmit` in strict mode produces zero errors
