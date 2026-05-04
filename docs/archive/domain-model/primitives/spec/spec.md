# domain-model/primitives — Software Design Document

## Intention

This spec was split from the monolithic [domain-model spec](../../spec/spec.md) (revision 5, 2026-04-27). It owns the TypeScript layer of the domain model: string-branded ID types, enum literals, Zod schemas for all 8 core entities, the Kysely `Database` interface, and the barrel export at `src/types/index.ts`. This is the single source of truth that every downstream spec — pdf-ingestion, requisitos-extraction, semaforo-aggregation — imports at runtime. No SQL, no migrations, no RLS live here.

## Use Cases

Detailed scenarios in [../../spec/use-cases.md](../../spec/use-cases.md).

| Use Case | Description | User Stories |
|----------|-------------|-------------|
| [UC-01 — Define & validate domain entities](../../spec/use-cases.md#uc-01--define--validate-domain-entities-us-01-us-02) | Engineer imports Zod schemas to validate runtime data for any domain entity | US-01, US-02 |
| [UC-04 — Query with type safety](../../spec/use-cases.md#uc-04--query-with-type-safety-us-05) | Engineer uses the Kysely Database interface to write fully typed queries without casting | US-05 |

---

## Requirements

### Functional Requirements

| ID | Requirement | User Stories | Business Rules |
|----|-------------|-------------|----------------|
| REQ-001 | Define string-branded ID types (`ProcesoId`, `PliegoId`, `AnexoProcesoId`, `EmpresaId`, `SegmentoId`, `AnalisisId`, `RequisitoId`, `PromptCacheId`) and enum literals: `AnalisisEstado`, `SegmentoCategoria` (`juridico \| financiero \| tecnico \| experiencia \| general`), `SemaforoColor`, `ModalidadContratacion`, `PliegoTipo` (`pliego_condiciones \| pliego_definitivo` only), `AnexoProcesoTipo` (`anexo_tecnico \| estudio_previo \| resolucion \| otro`), `EmpresaMemberRole` | US-01, US-02 | RN-001, RN-007, RN-012 |
| REQ-002 | Define Zod schemas for all 8 core entities: `Empresa`, `Proceso`, `Pliego`, `AnexoProceso`, `Segmento`, `Analisis`, `Requisito`, `PromptCache`. `SegmentoSchema` includes `page_range_start` and `page_range_end` (both `int >= 1`), `heading_normalized: z.string().nullable()`, `heading_original: z.string().nullable()`, `is_synthetic: z.boolean()`. `PliegoSchema` and `AnexoProcesoSchema` share the same shape (proceso_id FK, tipo, file_path, file_hash, uploaded_by_empresa_id, page_count, deleted_at, created_at) but are distinct entities with distinct enums and tables | US-01, US-02 | RN-002, RN-003, RN-010, RN-011, RN-012 |
| REQ-003 | `Requisito.cumple` must accept `true`, `false`, and `null` (null = sin información) | US-01 | RN-002 |
| REQ-004 | `Analisis.estado` must be constrained to the state machine enum: `pending \| extracting \| analyzing \| completed \| failed` | US-01 | RN-001 |
| REQ-005 | `Proceso.secop_process_number` must be globally unique. `Pliego.file_hash` (SHA-256) must be globally unique within the `pliego` table. `AnexoProceso.file_hash` (SHA-256) must be globally unique within the `anexo_proceso` table — independent dedup space. Both `Pliego.deleted_at` and `AnexoProceso.deleted_at` enable soft-delete; `Proceso` has no `deleted_at` column. | US-01, US-03 | RN-003, RN-004 |
| REQ-008 | Define a Kysely `Database` interface mapping each of the 9 table names to its row and insert types. `SegmentoTable` includes `pliego_id: PliegoId`, `page_range_start: number`, `page_range_end: number`, `heading_normalized: string \| null`, `heading_original: string \| null`, `is_synthetic: ColumnType<boolean, boolean \| undefined, boolean>`. `PliegoTable` and `AnexoProcesoTable` are sibling row shapes with distinct `tipo` types. | US-05 | RN-010, RN-011, RN-012 |
| REQ-009 | Export all domain types, Zod schemas, and the Kysely interface from `src/types/index.ts`. The barrel exports `Pliego*` and `AnexoProceso*`; the legacy `Documento*` exports do not exist. | US-01, US-05 | — |
| REQ-010 | `Analisis.pliego_ids` is `uuid[]`. v1 always contains exactly one element. The column exists from day one so v2 multi-pliego analyses need no schema migration. | US-01 | RN-009 |
| REQ-012 | `SegmentoSchema` includes three Zod `.refine()` validators mirroring the database CHECK constraints: (a) `page_range_start <= page_range_end`; (b) heading both-or-neither nullability; (c) `is_synthetic === true ⇔ heading_normalized === null`. Defense in depth — invalid combos are rejected at parse time before any DB roundtrip | US-01, US-03 | RN-010, RN-011 |
| REQ-013 | `RequisitoSchema` carries three citation columns: `citation_segment_id` (UUID), `citation_quote TEXT` (≤200 chars, validated via Zod `.max(200)`), `citation_verified: boolean`. | US-01 | RN-002, RN-013 |
| REQ-018 | `RequisitoSchema` carries `categoria` typed as `RequisitoCategoria` — the narrow enum `juridico \| financiero \| tecnico \| experiencia` (does NOT include `general`). Kysely shape: `ColumnType<RequisitoCategoria, RequisitoCategoria, never>` (immutable post-INSERT per RN-016). | US-01 | RN-002, RN-016, RN-017 |
| REQ-019 | `RequisitoSchema` carries `is_habilitante: boolean` and `is_habilitante_source: z.enum(['structural','llm','manual'])`. | US-01 | RN-018 |
| REQ-020 | `AnalisisSchema` carries `semaforo_rules_version: z.string().nullable()`. | US-01 | RN-001 |

### Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | `npm run typecheck` completes under 10s in strict mode across the full repo |
| NFR-03 | Consistency | Zod schema field names must exactly match Postgres column names (snake_case throughout) |
| NFR-04 | Maintainability | No entity defined in more than one place; TypeScript types are always inferred from Zod via `z.infer<>` |

---

## Business Rules

| Rule | Description |
|------|-------------|
| RN-001 | `Analisis.estado` follows a forward-only state machine: `pending → extracting → analyzing → completed \| failed`. The schema enforces the enum; transition logic lives in the service layer. |
| RN-002 | `Requisito.cumple` is tri-state: `true` (meets), `false` (does not meet), `null` (sin información — evaluator could not determine). |
| RN-003 | `Pliego.file_hash` and `AnexoProceso.file_hash` are SHA-256 of the raw file bytes. Each table has its own UNIQUE constraint on `file_hash` — within-table dedup, independent dedup spaces between Pliego and AnexoProceso. Cross-table case (same bytes uploaded as both a pliego and an anexo) is permitted and produces two rows. |
| RN-004 | `Pliego` and `AnexoProceso` use soft-delete via `deleted_at timestamptz`. Hard deletes are prohibited. `Proceso` does NOT have a `deleted_at` column. |
| RN-007 | `Segmento.categoria` is constrained to: `juridico \| financiero \| tecnico \| experiencia \| general`. The first four are Colombian SECOP II pliego categories; `general` is the fallback for content that does not belong to any recognized category. |
| RN-009 | `Analisis.pliego_ids` is `uuid[]`. v1 cardinality is always 1. The domain model places no length constraint — v2 may pass multiple pliegos without a schema migration. |
| RN-010 | **Heading triple-equivalence** on `Segmento`: `is_synthetic === true` ⇔ `heading_normalized IS NULL` ⇔ `heading_original IS NULL`. Two CHECK constraints enforce this at the DB layer. Consumers MUST branch on `is_synthetic`, not on heading nullability. |
| RN-011 | **`segmento.page_range_*` semantics**: both are 1-indexed, both `>= 1`, with `page_range_start <= page_range_end`. A single-page segment has `page_range_start = page_range_end`. |
| RN-012 | **Pliego semantic tightness**: `pliego_tipo` enum is intentionally narrow (`pliego_condiciones`, `pliego_definitivo`). Non-pliego documents live in `AnexoProceso`. Consumers MUST query `pliego` for requisito-bearing documents and `anexo_proceso` for everything else. |
| RN-013 | **Citation contract on `requisito`**: every `requisito` row MUST cite a single `segmento` (FK via `citation_segment_id`). The `citation_quote` length cap (200 chars) is enforced at the application layer via `RequisitoSchema`. |
| RN-016 | **`requisito.categoria` immutability**: set at INSERT, never UPDATEd. Enforced at compile time via Kysely `ColumnType<RequisitoCategoria, RequisitoCategoria, never>`. Recategorization requires orchestrator-level cache invalidation + DELETE + re-INSERT. |
| RN-017 | **Narrow `RequisitoCategoria` vs wide `SegmentoCategoria`**: `SegmentoCategoria` includes `general`; `RequisitoCategoria` does not. Requisitos are extracted only from segments with a recognized procurement category. |

---

## Test Cases

### TC-001 — AnalisisEstado enum rejects unknown value (REQ-004, RN-001)

**Given** a Zod `AnalisisSchema` with an `estado` field
**When** `AnalisisSchema.parse({ ..., estado: "cancelled" })` is called
**Then** Zod throws a `ZodError` with an invalid enum value message

### TC-002 — Requisito.cumple accepts null, true, false (REQ-003, RN-002)

**Given** a valid `RequisitoSchema`
**When** parsed with `cumple: null`, `cumple: true`, and `cumple: false` separately
**Then** all three parse successfully without errors

### TC-003 — Pliego/AnexoProceso soft-delete field is nullable; Proceso has no deleted_at (REQ-005, RN-004)

**Given** a `PliegoSchema` (and parallel test for `AnexoProcesoSchema`)
**When** parsed with `deleted_at: null` and with `deleted_at` absent
**Then** both parse successfully; `deleted_at` resolves to `null`

**Given** a `ProcesoSchema`
**When** inspecting its shape
**Then** it has no `deleted_at` key

### TC-005 — Kysely Database interface compiles without errors (REQ-008, NFR-01)

**Given** `src/types/db.ts` exports a `Database` interface referencing all 9 table types
**When** `npm run typecheck` runs in strict mode
**Then** zero TypeScript errors are emitted

### TC-007 — Barrel exports all types importable (REQ-009, NFR-04)

**Given** `src/types/index.ts` is the sole import path
**When** a consumer does `import { ProcesoSchema, type Proceso, PliegoSchema, type Pliego, AnexoProcesoSchema, type AnexoProceso, type Database } from '@/types'`
**Then** all named exports resolve without TypeScript errors. Conversely, `import { DocumentoSchema } from '@/types'` produces a TypeScript error.

### TC-010 — SegmentoSchema accepts the `general` categoría (REQ-001, REQ-002, RN-007)

**Given** a valid `SegmentoSchema` base object
**When** parsed with `categoria: 'general'`, `is_synthetic: true`, `heading_normalized: null`, `heading_original: null`, valid `page_range_*`
**Then** parse succeeds and `categoria` is `'general'`

### TC-014 — Zod `.refine()` rejects invalid heading/synthetic combos at parse time (REQ-012, RN-010)

**Given** a `SegmentoSchema` value with `is_synthetic: true`, `heading_normalized: 'capacidad juridica'`, `heading_original: 'CAPACIDAD JURÍDICA'`
**When** `SegmentoSchema.parse(value)` is called
**Then** a `ZodError` is thrown

**Given** a value with `is_synthetic: false`, both heading columns `null`
**When** parsed
**Then** also a `ZodError`

### TC-015 — `pliego_tipo` enum is restricted to pliego-only values (REQ-001, RN-012)

**Given** a `PliegoSchema`
**When** `PliegoSchema.parse({ ..., tipo: 'anexo_tecnico' })` is called
**Then** a `ZodError` is thrown

**When** the same data is validated against `AnexoProcesoSchema` with `tipo: 'anexo_tecnico'`
**Then** parse succeeds

### TC-016 — `anexo_proceso_tipo` enum has exactly 4 values (REQ-001, RN-012)

**Given** the `AnexoProcesoTipo` enum literal object
**When** its values are enumerated
**Then** it contains exactly `anexo_tecnico`, `estudio_previo`, `resolucion`, `otro` and does not contain `pliego_condiciones` or `pliego_definitivo`

### TC-022 — EmpresaSchema parses with profile_updated_at; Kysely forbids direct writes (REQ-015, RN-014)

**Given** an `EmpresaSchema` value with `profile_updated_at: new Date()`
**When** parsed
**Then** parse succeeds; the inferred `Empresa` type carries `profile_updated_at: Date`

**Given** the Kysely `EmpresaTable.profile_updated_at` typed as `ColumnType<Date, never, never>`
**When** application code attempts `db.insertInto('empresa').values({ ..., profile_updated_at: new Date() })`
**Then** TypeScript compilation fails

### TC-026 — RequisitoSchema rejects `categoria: 'general'` (REQ-018, RN-017)

**Given** a valid `RequisitoSchema` value
**When** parsed with `categoria: 'general'`
**Then** a `ZodError` is thrown — `general` is not in the narrow `RequisitoCategoria` enum

**When** parsed with each of `'juridico'`, `'financiero'`, `'tecnico'`, `'experiencia'`
**Then** all four parse successfully

### TC-028 — RequisitoSchema accepts `is_habilitante` + `is_habilitante_source` (REQ-019, RN-018)

**Given** a `RequisitoSchema` value with `is_habilitante: true`, `is_habilitante_source: 'structural'`
**When** parsed
**Then** parse succeeds

**When** parsed with `is_habilitante_source: 'auto'`
**Then** a `ZodError` is thrown

### TC-030 — Kysely `RequisitoTable.categoria` is `ColumnType<RequisitoCategoria, RequisitoCategoria, never>` (REQ-018, RN-016)

**Given** the Kysely `RequisitoTable` interface
**When** application code attempts `db.updateTable('requisito').set({ categoria: 'tecnico' })`
**Then** TypeScript compilation fails — the update side is `never`

**When** application code attempts `db.insertInto('requisito').values({ ..., categoria: 'juridico' })`
**Then** TypeScript compiles

---

## UX/UI

No UI. This is a developer-facing foundation feature. All contracts are consumed by downstream specs.

---

## Architecture

### Architecture Decision Records

| ADR | Title | Impact on this feature |
|-----|-------|----------------------|
| ADR-001 | Kysely as query builder | All DB row/insert types must conform to Kysely's `Selectable<T>` / `Insertable<T>` pattern |
| ADR-002 | Zod as runtime validator | TypeScript types are always `z.infer<typeof Schema>` — no manual type duplication |

### Tradeoffs

| Tradeoff | We chose | Over | Rationale |
|----------|----------|------|-----------|
| Single source of truth | Zod-first (infer TS types) | Type-first (generate Zod) | Zod validates at runtime; TS types are a compile-time view of the same definition |
| DB type generation | Hand-authored Kysely interface | Introspection-generated types | Greenfield project has no existing DB; manual authoring is faster and more explicit |
| Narrow `RequisitoCategoria` vs wide `SegmentoCategoria` | Two distinct enum types | One shared enum | `general` is never a legitimate category for a requisito; the narrow type encodes the upstream filter once in the type system |
| `requisito.categoria` immutability | Kysely `ColumnType<R, R, never>` | Mutable column | Recategorization requires re-extraction; `never` on the update column prevents incorrect `UPDATE requisito SET categoria = ...` queries at compile time |

### Performance Goals & Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| `npm run typecheck` duration | < 10s strict mode | `time npm run typecheck` in CI |
| Zod parse latency (entity) | < 1ms per entity | vitest benchmark, 1000 iterations |

### Data Model

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| `empresa` | `id`, `nit` (UK), `profile_updated_at` | `nit` is the Colombian tax ID. `profile_updated_at: ColumnType<Date, never, never>` — trigger-owned; Kysely forbids direct writes (RN-014). |
| `empresa_member` | `empresa_id`, `user_id` | Junction table for empresa-scoped RLS; role: `owner \| member` |
| `proceso` | `secop_process_number` (UK) | Public record; no `deleted_at`; readable by all authenticated users |
| `pliego` | `file_hash` (UK), `tipo` (narrow enum), `deleted_at` | Restricted to documents with requisitos habilitantes (RN-012). `tipo` ∈ {`pliego_condiciones`, `pliego_definitivo`}. |
| `anexo_proceso` | `file_hash` (UK), `tipo` (anexo enum), `deleted_at` | Sibling of `pliego` for non-pliego documents. `tipo` ∈ {`anexo_tecnico`, `estudio_previo`, `resolucion`, `otro`}. |
| `segmento` | `pliego_id`, `categoria`, `orden`, `page_range_*`, `heading_*`, `is_synthetic` | `categoria` includes `general` fallback (RN-007). Triple-equivalence invariant via Zod `.refine()` (RN-010). |
| `analisis` | `proceso_id`, `empresa_id`, `pliego_ids[]`, `estado`, `semaforo_rules_version` | Estado state machine; empresa-private. `pliego_ids` length=1 in v1 (RN-009). |
| `requisito` | `categoria` (narrow, immutable), `cumple` (nullable bool), `is_habilitante`, `is_habilitante_source`, citation triple | null = sin información. `categoria` is `ColumnType<RequisitoCategoria, RequisitoCategoria, never>` (RN-016). |
| `prompt_cache` | `(pliego_id, empresa_id)` UK | Cache key is SHA-256 of pliego content + prompt version, scoped per empresa |

### API / Data Contracts

No HTTP endpoints. All contracts are TypeScript/Zod types consumed by service layers.

### Service Integrations

| System | Direction | Data |
|--------|-----------|------|
| [domain-model/postgres](../../postgres/spec/spec.md) | Parallel sibling — column names must match exactly (NFR-03) | Zod field names mirror Postgres column names snake_case |
| Downstream services | Read | Kysely `Database` interface |
| API route validators | Read | Zod schemas for request/response validation |

---

## Revision Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-04-30 | Split from [domain-model spec rev 5](../../spec/spec.md). Extracted REQ-001–REQ-005, REQ-008–REQ-010, REQ-012–REQ-013, REQ-018–REQ-020 (TypeScript/Zod layer only); corresponding TCs and BRs. | Monolithic spec exceeded 500 lines across 5 revisions; split into primitives / postgres / extraction-contracts to match implementation task boundaries. |
