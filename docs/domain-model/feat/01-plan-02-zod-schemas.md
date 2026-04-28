# T2: Zod Schemas + TypeScript Types

## Scope

- `src/types/domain/empresa.ts` — EmpresaSchema + Empresa type (incl. `profile_updated_at`)
- `src/types/domain/proceso.ts` — ProcesoSchema + Proceso type
- `src/types/domain/pliego.ts` — PliegoSchema + Pliego type (narrow tipo enum)
- `src/types/domain/anexo-proceso.ts` — AnexoProcesoSchema + AnexoProceso type (anexo tipo enum)
- `src/types/domain/segmento.ts` — SegmentoSchema + Segmento type
- `src/types/domain/analisis.ts` — AnalisisSchema + Analisis type (with `pliego_ids[]` and 3 telemetry fields)
- `src/types/domain/requisito.ts` — RequisitoSchema + Requisito type (with 3 citation fields)
- `src/types/domain/prompt-cache.ts` — PromptCacheSchema + PromptCache type
- `src/types/domain/extraction-payload.ts` — **NEW (rev 4).** `RequisitoExtractionPayloadSchema` + `RequisitoExtractionPayload` type (LLM-output contract; distinct from `RequisitoSchema` per RN-015)
- `src/types/domain/semaforo.ts` — **NEW (rev 5).** Pure type definitions: `Semaforo`, `SemaforoStats`, `RequisitoCategoria` (re-exported from primitives for convenience), `IsHabilitanteSource` (re-exported from primitives) — REQ-021. No Zod schema; no runtime code.
- `src/types/domain/habilitante-patterns.ts` — **NEW (rev 5).** Runtime constants `HABILITANTE_HEADING_PATTERNS: readonly RegExp[]` and `HABILITANTE_PATTERNS_VERSION: 'v1.0.0' as const` — REQ-022. No types; no Zod.

## Changes

### Schema Pattern (apply to all 7 files)

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
profile_updated_at: z.coerce.date()                 — auto-maintained by trigger (REQ-015, RN-014)
created_at: z.coerce.date()
updated_at: z.coerce.date()
```

The Zod schema accepts `profile_updated_at` for read-side parsing (Postgres returns it). The Kysely shape (T5) blocks app-side writes via `ColumnType<Date, never, never>`.

### ProcesoSchema

```
id: z.string().uuid() → ProcesoId
secop_process_number: z.string().min(1).max(100)   — e.g. LP-001-2025
entidad_contratante: z.string().min(1).max(500)
objeto: z.string().min(1)
modalidad: z.enum([...ModalidadContratacion values...])
valor_estimado: z.number().nonnegative().nullable().default(null)
cronograma: z.record(z.string(), z.unknown()).nullable().default(null)   — jsonb
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
uploaded_by_empresa_id: z.string().uuid().nullable().default(null)  — informational FK
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

Same shape as `PliegoSchema` but distinct schema, distinct enum, distinct table. Sharing a "DocumentBase" mixin is tempting but prohibited (RN-012): the rename is precisely about keeping these two entities visibly distinct in code, not just at the table layer.

### SegmentoSchema

```
id: z.string().uuid() → SegmentoId
pliego_id: z.string().uuid() → PliegoId        — FK to pliego (was documento_id)
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

Three `.refine()` validators on the schema enforce the invariants at parse time (REQ-012, mirroring the DB CHECKs):

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

These are app-layer rejection ahead of any DB roundtrip. Defense in depth: the Postgres CHECK constraints catch direct-SQL bypass, and the Zod refines catch bad inputs before they hit the network.

### AnalisisSchema

```
id: z.string().uuid() → AnalisisId
proceso_id: z.string().uuid() → ProcesoId
empresa_id: z.string().uuid() → EmpresaId
pliego_ids: z.array(z.string().uuid())            — uuid[]; v1 always length=1 (the analyzed Pliego)
estado: z.enum([...AnalisisEstado values...])
semaforo: z.enum([...SemaforoColor values...]).nullable().default(null)
error_message: z.string().nullable().default(null)
cost_usd: z.number().nonnegative().nullable().default(null)              — populated post-extraction (REQ-014)
model_metadata: z.object({                                                 — populated post-extraction (REQ-014)
  implementation_id: z.string(),
  model_name: z.string(),
  prompt_version: z.string(),
}).nullable().default(null)
prompt_version: z.string().nullable().default(null)                        — denormalized from model_metadata for indexable queries
semaforo_rules_version: z.string().nullable().default(null)                — populated post-aggregation (REQ-020)
created_at: z.coerce.date()
updated_at: z.coerce.date()
completed_at: z.coerce.date().nullable().default(null)
```

### RequisitoSchema

```
id: z.string().uuid() → RequisitoId
analisis_id: z.string().uuid() → AnalisisId
segmento_id: z.string().uuid() → SegmentoId
categoria: z.enum([...RequisitoCategoria values...])  — narrow: juridico|financiero|tecnico|experiencia (REQ-018, RN-017). NOT SegmentoCategoria — `general` is rejected at parse time. Set at INSERT, never on UPDATE per RN-016.
descripcion: z.string().min(1)
cumple: z.boolean().nullable()   — null = sin información (RN-002)
semaforo: z.enum([...SemaforoColor values...])
justificacion: z.string().nullable().default(null)
is_habilitante: z.boolean()                                           — knockout-rule input (REQ-019, semaforo RN-014)
is_habilitante_source: z.enum([...IsHabilitanteSource values...])     — 'structural'|'llm'|'manual' (REQ-019, RN-018)
citation_segment_id: z.string().uuid() → SegmentoId                   — required FK (REQ-013, RN-013)
citation_quote: z.string().min(1).max(200)                            — verbatim quote, length-bounded
citation_verified: z.boolean()                                        — verifier verdict (downstream)
created_at: z.coerce.date()
```

### PromptCacheSchema

```
id: z.string().uuid() → PromptCacheId
pliego_id: z.string().uuid() → PliegoId         — FK to pliego (was documento_id)
empresa_id: z.string().uuid() → EmpresaId        — part of (pliego_id, empresa_id) cache key
hash: z.string().length(64)
prompt_tokens: z.number().int().positive()
cached_at: z.coerce.date()
expires_at: z.coerce.date()
```

### RequisitoExtractionPayloadSchema (REQ-016, RN-015, RN-017)

Distinct from `RequisitoSchema`. This is the LLM-output contract — what the extractor parses raw model JSON against. Lives at `src/types/domain/extraction-payload.ts`.

```
categoria: z.enum([...SegmentoCategoria values...]).refine(v => v !== 'general', {
  message: 'general-categoria payloads are not extractable; segments with categoria=general MUST be filtered upstream per pdf-ingestion RN-012',
  path: ['categoria'],
})                                                       — wide enum at the type level for symmetry with SegmentoCategoria, but the .refine() narrows to RequisitoCategoria at parse time. Per RN-017, a payload with categoria='general' raises ZodError → ExtractorSchemaValidationError.
descripcion: z.string().min(1)
cumple: z.boolean().nullable()
semaforo: z.enum([...SemaforoColor values...])
justificacion: z.string().nullable().default(null)
is_habilitante: z.boolean()                              — REQ-016, REQ-019
is_habilitante_source: z.enum([...IsHabilitanteSource values...])   — REQ-016, REQ-019, RN-018
citation_segment_id: z.string().uuid()                   — referenced segment must exist in extractor input
citation_quote: z.string().min(1).max(200)               — verbatim quote
```

Deliberately omits: `id`, `analisis_id`, `created_at`, `citation_verified`. The orchestrator augments these post-extraction and persists via `RequisitoSchema`. A wrapper `RequisitoExtractionPayloadArraySchema = z.object({ requisitos: z.array(RequisitoExtractionPayloadSchema) })` is the convenient parse target for the LLM's batch output.

**Narrowing-rule ownership.** The `categoria === 'general'` rejection lives **on this schema** (in the payload validator, not in the orchestrator) so the LLM-output boundary itself enforces the upstream-filter contract. A `general` payload is structurally an extraction failure, surfaced as `ExtractorSchemaValidationError` per requisitos-extraction's typed error hierarchy.

### `src/types/domain/semaforo.ts` (NEW — REQ-021)

Pure type definitions, zero runtime, zero Zod. Defined as TypeScript interfaces and unions:

```typescript
import type { SemaforoColor, RequisitoCategoria, IsHabilitanteSource } from './primitives'
import type { Requisito } from './requisito'

export type { RequisitoCategoria, IsHabilitanteSource }   // re-export from primitives for one-stop import

export interface SemaforoStats {
  total: number
  cumple: number
  noCumple: number
  sinInfo: number
  cumplePct: number
}

export interface Semaforo {
  overall: SemaforoColor
  byCategoria: Record<RequisitoCategoria, SemaforoColor>
  blockers: Requisito[]
  stats: SemaforoStats
}
```

This file is the canonical home for the `Semaforo` aggregation shape consumed by `lib/semaforo/aggregateSemaforo` and any FE component rendering verdicts. Note: `RequisitoCategoria` and `IsHabilitanteSource` are **declared** in `primitives.ts` (REQ-001, T1) and re-exported here for ergonomic imports — consumers can `import { type Semaforo, type RequisitoCategoria } from '@/types'` without reaching into primitives.

### `src/types/domain/habilitante-patterns.ts` (NEW — REQ-022)

Runtime constants. No Zod, no types beyond `as const`:

```typescript
export const HABILITANTE_HEADING_PATTERNS: readonly RegExp[] = [
  /\brequisitos\s+habilitantes\b/,
  /\bcapacidad\s+juridica\b/,
  /\bcapacidad\s+financiera\b/,
  /\bcapacidad\s+tecnica\b/,
  /\bexperiencia\s+(minima|acreditada|requerida)\b/,
] as const

export const HABILITANTE_PATTERNS_VERSION = 'v1.0.0' as const
```

Patterns are authored against the NFD-normalized + lowercased form produced by [pdf-ingestion REQ-005](../../../pdf-ingestion/spec/spec.md) — they MUST NOT contain accented characters or uppercase letters. The `i` flag is intentionally absent: heading text reaching this layer has already been normalized.

The version constant is a cache-invalidation primitive — when the pattern list changes, downstream caches keyed on classifications produced by these patterns can compare versions and re-classify. Bumping the version is the contract for any pattern-list change.

### Design Rationale (OCP/SRP)

One file per entity: each schema is independently importable and independently evolvable. The branded transform (`.transform(branded<T>)`) is applied at the schema boundary so upstream code never handles raw strings for IDs.

## Dependencies

Requires T1 — branded ID types and enum consts must exist before schemas can reference them.

## Done When

- [ ] All 11 entity-tier files exist under `src/types/domain/` (incl. `pliego.ts`, `anexo-proceso.ts`, `extraction-payload.ts`, the new `semaforo.ts`, and the new `habilitante-patterns.ts`)
- [ ] Each entity Zod file exports both the Zod schema and the inferred TypeScript type; `semaforo.ts` is types-only; `habilitante-patterns.ts` is runtime-constants-only
- [ ] `RequisitoSchema` accepts `cumple: null`, `true`, `false`; carries `categoria` (narrow), `is_habilitante`, `is_habilitante_source`, `citation_segment_id`, `citation_quote` (max 200 chars), `citation_verified` (TC-019, TC-020, TC-026, TC-028)
- [ ] `RequisitoSchema.parse({ ..., categoria: 'general' })` throws `ZodError` (TC-026)
- [ ] `RequisitoExtractionPayloadSchema.parse({ ..., categoria: 'general' })` throws `ZodError` via the `.refine()` (TC-027)
- [ ] `AnalisisSchema` carries nullable `semaforo_rules_version`
- [ ] `src/types/domain/semaforo.ts` exports `Semaforo`, `SemaforoStats`, `RequisitoCategoria`, `IsHabilitanteSource`
- [ ] `src/types/domain/habilitante-patterns.ts` exports `HABILITANTE_HEADING_PATTERNS` (length ≥ 5) and `HABILITANTE_PATTERNS_VERSION === 'v1.0.0'`
- [ ] `PliegoSchema` and `AnexoProcesoSchema` each validate `file_hash` as exactly 64 hex characters
- [ ] `PliegoSchema` `tipo` enum is `pliego_condiciones`/`pliego_definitivo` only — rejects `anexo_tecnico` etc. (TC-015)
- [ ] `AnexoProcesoSchema` `tipo` enum has 4 values; rejects pliego values
- [ ] `PliegoSchema` and `AnexoProcesoSchema` have `deleted_at` nullable; `ProcesoSchema` has no `deleted_at` field
- [ ] `AnalisisSchema` rejects any `estado` value not in the state machine enum
- [ ] `AnalisisSchema` has `pliego_ids: z.array(z.string().uuid())` and accepts nullable `cost_usd`/`model_metadata`/`prompt_version` (TC-021)
- [ ] `EmpresaSchema` carries `profile_updated_at: z.coerce.date()` (TC-022 read-side)
- [ ] `SegmentoSchema` accepts `categoria: 'general'` (TC-010)
- [ ] `SegmentoSchema` has `page_range_start`, `page_range_end`, `heading_normalized` (nullable), `heading_original` (nullable), `is_synthetic`
- [ ] `SegmentoSchema` `.refine()` validators reject all three invalid combos: (a) start > end; (b) one heading null while the other is set; (c) `is_synthetic` true with non-null heading or false with null heading (TC-014)
- [ ] `RequisitoExtractionPayloadSchema` parses an LLM payload without `id`/`analisis_id`/`created_at`/`citation_verified`; `RequisitoSchema` rejects the same payload (TC-025)
- [ ] `tsc --noEmit` on all 9 files produces zero errors
- [ ] Unit tests pass: TC-001, TC-002, TC-003, TC-010, TC-014, TC-019, TC-020, TC-021, TC-022 (read-side), TC-025 from the TDD contract
