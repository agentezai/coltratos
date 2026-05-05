# T2: Zod Schemas + TypeScript Types

## Scope

- `src/types/domain/empresa.ts` — EmpresaSchema + Empresa type (incl. `profile_updated_at`)
- `src/types/domain/proceso.ts` — ProcesoSchema + Proceso type
- `src/types/domain/pliego.ts` — PliegoSchema + Pliego type (narrow tipo enum)
- `src/types/domain/anexo-proceso.ts` — AnexoProcesoSchema + AnexoProceso type (anexo tipo enum)
- `src/types/domain/segmento.ts` — SegmentoSchema + Segmento type
- `src/types/domain/analisis.ts` — AnalisisSchema + Analisis type (with `pliego_ids[]` and telemetry fields)
- `src/types/domain/requisito.ts` — RequisitoSchema + Requisito type (with citation triple + is_habilitante fields)
- `src/types/domain/prompt-cache.ts` — PromptCacheSchema + PromptCache type

## Changes

### Schema Pattern (apply to all files)

Each file follows this structure:
1. Import branded IDs and enum consts from `./primitives`
2. Import `z` from `zod`
3. Define `<Entity>Schema = z.object({ ... })`
4. Export `type <Entity> = z.infer<typeof <Entity>Schema>`
5. Export the schema as a named export

### EmpresaSchema

```
id: z.string().uuid() → EmpresaId (via .transform(branded<EmpresaId>))
nombre: z.string().min(1).max(255)
nit: z.string().regex(/^\d{9,10}-\d$/) — Colombian NIT format
profile_updated_at: z.coerce.date()   — auto-maintained by trigger (REQ-011, RN-014)
created_at: z.coerce.date()
updated_at: z.coerce.date()
```

The Zod schema accepts `profile_updated_at` for read-side parsing (Postgres returns it). The Kysely shape (T3) blocks app-side writes via `ColumnType<Date, never, never>`.

### ProcesoSchema

```
id: z.string().uuid() → ProcesoId
secop_process_number: z.string().min(1).max(100)
entidad_contratante: z.string().min(1).max(500)
objeto: z.string().min(1)
modalidad: z.enum([...ModalidadContratacion values...])
valor_estimado: z.number().nonnegative().nullable().default(null)
cronograma: z.record(z.string(), z.unknown()).nullable().default(null)
created_at: z.coerce.date()
```

No `deleted_at` field — public procurement processes are permanent records (RN-004).

### PliegoSchema

```
id: z.string().uuid() → PliegoId
proceso_id: z.string().uuid() → ProcesoId
tipo: z.enum([...PliegoTipo values...])   — narrow: pliego_condiciones | pliego_definitivo
file_path: z.string().min(1)
file_hash: z.string().length(64)   — SHA-256 hex, exactly 64 chars
uploaded_by_empresa_id: z.string().uuid().nullable().default(null)
page_count: z.number().int().nonnegative().nullable().default(null)
deleted_at: z.coerce.date().nullable().default(null)
created_at: z.coerce.date()
```

### AnexoProcesoSchema

```
id: z.string().uuid() → AnexoProcesoId
proceso_id: z.string().uuid() → ProcesoId
tipo: z.enum([...AnexoProcesoTipo values...])   — anexo_tecnico | estudio_previo | resolucion | otro
file_path: z.string().min(1)
file_hash: z.string().length(64)
uploaded_by_empresa_id: z.string().uuid().nullable().default(null)
page_count: z.number().int().nonnegative().nullable().default(null)
deleted_at: z.coerce.date().nullable().default(null)
created_at: z.coerce.date()
```

Same shape as `PliegoSchema` but distinct schema, distinct enum, distinct table. Sharing a "DocumentBase" mixin is prohibited (RN-012): the separation must be visible in code, not just at the table layer.

### SegmentoSchema

```
id: z.string().uuid() → SegmentoId
pliego_id: z.string().uuid() → PliegoId
categoria: z.enum([...SegmentoCategoria values...])  — incl. 'general'
contenido: z.string().min(1)
orden: z.number().int().nonnegative()
page_range_start: z.number().int().min(1)
page_range_end:   z.number().int().min(1)
heading_normalized: z.string().nullable()
heading_original:   z.string().nullable()
is_synthetic: z.boolean()
created_at: z.coerce.date()
```

Three `.refine()` validators enforce the invariants at parse time (REQ-006, mirroring the DB CHECKs):

```typescript
.refine(s => s.page_range_start <= s.page_range_end, {
  message: 'page_range_start must be <= page_range_end',
  path: ['page_range_end'],
})
.refine(
  s => (s.heading_normalized === null) === (s.heading_original === null),
  { message: 'heading_normalized and heading_original must be both null or both non-null', path: ['heading_normalized'] },
)
.refine(
  s => (s.is_synthetic === true) === (s.heading_normalized === null),
  { message: 'is_synthetic === true must coincide with heading_normalized === null', path: ['is_synthetic'] },
)
```

### AnalisisSchema

```
id: z.string().uuid() → AnalisisId
proceso_id: z.string().uuid() → ProcesoId
empresa_id: z.string().uuid() → EmpresaId
pliego_ids: z.array(z.string().uuid())      — uuid[]; v1 always length=1
estado: z.enum([...AnalisisEstado values...])
semaforo: z.enum([...SemaforoColor values...]).nullable().default(null)
error_message: z.string().nullable().default(null)
cost_usd: z.number().nonnegative().nullable().default(null)
model_metadata: z.object({
  implementation_id: z.string(),
  model_name: z.string(),
  prompt_version: z.string(),
}).nullable().default(null)
prompt_version: z.string().nullable().default(null)
semaforo_rules_version: z.string().nullable().default(null)  — REQ-010
created_at: z.coerce.date()
updated_at: z.coerce.date()
completed_at: z.coerce.date().nullable().default(null)
```

### RequisitoSchema

```
id: z.string().uuid() → RequisitoId
analisis_id: z.string().uuid() → AnalisisId
segmento_id: z.string().uuid() → SegmentoId
categoria: z.enum([...RequisitoCategoria values...])   — narrow (REQ-008, RN-017): no 'general'
descripcion: z.string().min(1)
cumple: z.boolean().nullable()   — null = sin información (RN-002)
semaforo: z.enum([...SemaforoColor values...])
justificacion: z.string().nullable().default(null)
is_habilitante: z.boolean()                                    — REQ-009
is_habilitante_source: z.enum([...IsHabilitanteSource values...])   — REQ-009
citation_segment_id: z.string().uuid() → SegmentoId            — required FK (REQ-007)
citation_quote: z.string().min(1).max(200)                     — verbatim quote, length-bounded
citation_verified: z.boolean()
created_at: z.coerce.date()
```

### PromptCacheSchema

```
id: z.string().uuid() → PromptCacheId
pliego_id: z.string().uuid() → PliegoId
empresa_id: z.string().uuid() → EmpresaId
hash: z.string().length(64)
prompt_tokens: z.number().int().positive()
cached_at: z.coerce.date()
expires_at: z.coerce.date()
```

## Dependencies

Requires T1 — branded ID types and enum consts must exist before schemas can reference them.

## Done When

- [ ] All 8 entity files exist under `src/types/domain/`
- [ ] Each file exports both the Zod schema and the inferred TypeScript type
- [ ] `RequisitoSchema.parse({ ..., categoria: 'general' })` throws `ZodError` (TC-011)
- [ ] `RequisitoSchema` accepts `cumple: null`, `true`, `false` (TC-002)
- [ ] `RequisitoSchema` carries `is_habilitante`, `is_habilitante_source` (3 valid values), citation triple (TC-013, REQ-007)
- [ ] `AnalisisSchema` carries nullable `semaforo_rules_version`, `cost_usd`, `model_metadata`, `prompt_version` (TC-014, REQ-010)
- [ ] `EmpresaSchema` carries `profile_updated_at: z.coerce.date()` (TC-010 read-side, REQ-011)
- [ ] `SegmentoSchema` accepts `categoria: 'general'` (TC-006)
- [ ] `SegmentoSchema` `.refine()` validators reject all three invalid combos (TC-007, REQ-006)
- [ ] `PliegoSchema` `tipo` rejects `'anexo_tecnico'`; `AnexoProcesoSchema` `tipo` rejects `'pliego_condiciones'` (TC-008)
- [ ] `PliegoSchema` and `AnexoProcesoSchema` validate `file_hash` as exactly 64 chars
- [ ] `ProcesoSchema` has no `deleted_at` field (TC-003b)
- [ ] `tsc --noEmit` on all 8 files produces zero errors
