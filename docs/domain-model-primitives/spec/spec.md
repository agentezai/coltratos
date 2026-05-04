# domain-model-primitives — Software Design Document

## Intention

Establishes the TypeScript layer of the COLTRATOS domain model: string-branded ID types, enum literals, Zod schemas for all 8 core entities, the Kysely `Database` interface, and the barrel export at `src/types/index.ts`. Every downstream feature (pdf-ingestion, requisitos-extraction, semaforo-aggregation) imports from this single source of truth. No SQL, no migrations, no RLS live here — those belong to `domain-model-postgres`.

## Use Cases

Detailed scenarios in [use-cases.md](./use-cases.md).

| Use Case | Description | User Stories |
|----------|-------------|-------------|
| [UC-01 — Define & validate domain entities](./use-cases.md#uc-01--define--validate-domain-entities-us-01-us-02) | Engineer imports Zod schemas to validate runtime data for any domain entity | US-01, US-02 |
| [UC-02 — Query with type safety](./use-cases.md#uc-02--query-with-type-safety-us-05) | Engineer uses the Kysely Database interface to write fully typed queries without casting | US-05 |

---

## Requirements

### Functional Requirements

| ID | Requirement | User Stories | Business Rules |
|----|-------------|-------------|----------------|
| REQ-001 | Define string-branded ID types (`ProcesoId`, `PliegoId`, `AnexoProcesoId`, `EmpresaId`, `SegmentoId`, `AnalisisId`, `RequisitoId`, `PromptCacheId`) and enum literals: `AnalisisEstado` (`pending \| extracting \| analyzing \| completed \| failed`), `SegmentoCategoria` (`juridico \| financiero \| tecnico \| experiencia \| general`), `SemaforoColor`, `ModalidadContratacion`, `PliegoTipo` (`pliego_condiciones \| pliego_definitivo` only), `AnexoProcesoTipo` (`anexo_tecnico \| estudio_previo \| resolucion \| otro`), `EmpresaMemberRole` | US-01, US-02 | RN-001, RN-007, RN-012 |
| REQ-002 | Define Zod schemas for all 8 core entities: `Empresa`, `Proceso`, `Pliego`, `AnexoProceso`, `Segmento`, `Analisis`, `Requisito`, `PromptCache`. `SegmentoSchema` includes `page_range_start` and `page_range_end` (both `int >= 1`), `heading_normalized: z.string().nullable()`, `heading_original: z.string().nullable()`, `is_synthetic: z.boolean()`. `PliegoSchema` and `AnexoProcesoSchema` share the same shape (proceso_id FK, tipo, file_path, file_hash, uploaded_by_empresa_id, page_count, deleted_at, created_at) but are distinct entities with distinct enums and tables | US-01, US-02 | RN-002, RN-003, RN-007, RN-010, RN-011, RN-012 |
| REQ-003 | `Requisito.cumple` must accept `true`, `false`, and `null` (null = sin información) | US-01 | RN-002 |
| REQ-004 | `Analisis.estado` must be constrained to the state machine enum: `pending \| extracting \| analyzing \| completed \| failed` | US-01 | RN-001 |
| REQ-005 | `Proceso.secop_process_number` is globally unique. `Pliego.file_hash` (SHA-256) is globally unique within the `pliego` table. `AnexoProceso.file_hash` (SHA-256) is globally unique within the `anexo_proceso` table — independent dedup space. Both `Pliego.deleted_at` and `AnexoProceso.deleted_at` enable soft-delete; `Proceso` has no `deleted_at` field | US-01 | RN-003, RN-004 |
| REQ-006 | `SegmentoSchema` includes three Zod `.refine()` validators: (a) `page_range_start <= page_range_end`; (b) heading both-or-neither nullability (`heading_normalized` and `heading_original` must both be null or both be non-null); (c) `is_synthetic === true ⇔ heading_normalized === null`. Defense in depth — invalid combos are rejected at parse time before any DB roundtrip | US-01 | RN-010, RN-011 |
| REQ-007 | `RequisitoSchema` carries three citation fields: `citation_segment_id` (UUID), `citation_quote` (string, max 200 chars validated via Zod `.max(200)`), `citation_verified: boolean` | US-01 | RN-002, RN-013 |
| REQ-008 | `RequisitoSchema` carries `categoria` typed as `RequisitoCategoria` — the narrow enum `juridico \| financiero \| tecnico \| experiencia` (does NOT include `general`). Kysely shape: `ColumnType<RequisitoCategoria, RequisitoCategoria, never>` (immutable post-INSERT per RN-016) | US-01 | RN-002, RN-016, RN-017 |
| REQ-009 | `RequisitoSchema` carries `is_habilitante: boolean` and `is_habilitante_source: z.enum(['structural','llm','manual'])` | US-01 | RN-018 |
| REQ-010 | `AnalisisSchema` carries `semaforo_rules_version: z.string().nullable()` and three telemetry fields: `cost_usd: z.number().nullable()`, `model_metadata: z.record(z.unknown()).nullable()`, `prompt_version: z.string().nullable()` | US-01 | RN-001 |
| REQ-011 | `EmpresaSchema` carries `profile_updated_at: z.date()`. Kysely shape: `ColumnType<Date, never, never>` — trigger-owned; application code is forbidden from inserting or updating it | US-01 | RN-014 |
| REQ-012 | Define a Kysely `Database` interface mapping each of the 9 table names to its row and insert types. `SegmentoTable` includes `pliego_id: PliegoId`, `page_range_start: number`, `page_range_end: number`, `heading_normalized: string \| null`, `heading_original: string \| null`, `is_synthetic: ColumnType<boolean, boolean \| undefined, boolean>`. `PliegoTable` and `AnexoProcesoTable` are sibling row shapes with distinct `tipo` types | US-05 | RN-010, RN-011, RN-012 |
| REQ-013 | Export all domain types, Zod schemas, and the Kysely interface from `src/types/index.ts`. Barrel exports `Pliego*` and `AnexoProceso*`; legacy `Documento*` exports must not exist | US-01, US-05 | — |
| REQ-014 | `Analisis.pliego_ids` is `uuid[]`. v1 always contains exactly one element. Column exists from day one so v2 multi-pliego analyses need no schema migration | US-01 | RN-009 |

### Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | `npm run typecheck` completes under 10s in strict mode across the full repo |
| NFR-02 | Consistency | Zod schema field names must exactly match Postgres column names (snake_case throughout) |
| NFR-03 | Maintainability | No entity defined in more than one place; TypeScript types always inferred from Zod via `z.infer<>` |

---

## Business Rules

| Rule | Description |
|------|-------------|
| RN-001 | `Analisis.estado` follows a forward-only state machine: `pending → extracting → analyzing → completed \| failed`. Schema enforces the enum; transition logic lives in the service layer. |
| RN-002 | `Requisito.cumple` is tri-state: `true` (meets), `false` (does not meet), `null` (sin información — evaluator could not determine). |
| RN-003 | `Pliego.file_hash` and `AnexoProceso.file_hash` are SHA-256 of the raw file bytes. Each entity has its own uniqueness contract — within-table dedup, independent dedup spaces. Cross-table case (same bytes uploaded as both a pliego and an anexo) is permitted and produces two rows. |
| RN-004 | `Pliego` and `AnexoProceso` carry `deleted_at: timestamptz \| null` for soft-delete. Hard deletes are prohibited. `Proceso` has no `deleted_at` field — public procurement processes cannot be soft-deleted. |
| RN-007 | `Segmento.categoria` accepts: `juridico \| financiero \| tecnico \| experiencia \| general`. The first four are Colombian SECOP II pliego categories; `general` is the fallback for content that does not belong to any recognized category. |
| RN-009 | `Analisis.pliego_ids` is `uuid[]`. v1 cardinality is always 1. No length constraint in the domain model — v2 may pass multiple pliegos without a schema migration. |
| RN-010 | **Heading triple-equivalence** on `Segmento` (Zod layer): three `.refine()` validators enforce `is_synthetic === true ⇔ heading_normalized === null ⇔ heading_original === null`. Consumers MUST branch on `is_synthetic` (intent), not on heading nullability (data shape). The DB layer enforces the same invariant via CHECK constraints. |
| RN-011 | **`segmento.page_range_*` semantics**: both are 1-indexed, both `>= 1`, `page_range_start <= page_range_end`. A single-page segment has `page_range_start = page_range_end`. Zod `.refine()` validates at parse time; DB CHECK constraint mirrors it. |
| RN-012 | **Pliego semantic tightness**: `PliegoTipo` enum is narrow (`pliego_condiciones`, `pliego_definitivo`). Non-pliego documents live in `AnexoProceso` with its own `AnexoProcesoTipo` enum. Consumers MUST import from `pliego` for requisito-bearing documents and `anexo_proceso` for everything else. |
| RN-013 | **Citation contract on `Requisito`**: every `Requisito` row MUST cite a single `Segmento` (via `citation_segment_id`). `citation_quote` is capped at 200 chars via Zod `.max(200)`. |
| RN-014 | **`empresa.profile_updated_at` is trigger-owned**: the Postgres trigger `set_empresa_profile_updated_at()` auto-maintains this column. Kysely `ColumnType<Date, never, never>` enforces at compile time that application code cannot insert or update it. Acts as a cache-invalidation signal for downstream extraction caches. |
| RN-016 | **`requisito.categoria` immutability**: set at INSERT, never UPDATEd. Enforced at compile time via Kysely `ColumnType<RequisitoCategoria, RequisitoCategoria, never>`. Recategorization requires orchestrator-level cache invalidation + DELETE + re-INSERT. |
| RN-017 | **Narrow `RequisitoCategoria` vs wide `SegmentoCategoria`**: `SegmentoCategoria` includes `general` (fallback for unrecognized content). `RequisitoCategoria` is `juridico \| financiero \| tecnico \| experiencia` only — requisitos are extracted ONLY from segments with a recognized procurement category. `RequisitoSchema` rejects `categoria: 'general'` with a `ZodError`. |
| RN-018 | **`is_habilitante_source` values**: `'structural'` (heading matched `HABILITANTE_HEADING_PATTERNS`, deterministic), `'llm'` (no structural pattern matched; LLM classified), `'manual'` (v1.1+ user override; v1 extractors never emit this). |

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

### TC-003 — Pliego/AnexoProceso soft-delete nullable; Proceso has no deleted_at (REQ-005, RN-004)

**Given** a `PliegoSchema` (and parallel test for `AnexoProcesoSchema`)
**When** parsed with `deleted_at: null` and with `deleted_at` absent
**Then** both parse successfully; `deleted_at` resolves to `null`

**Given** a `ProcesoSchema`
**When** inspecting its shape
**Then** it has no `deleted_at` key

### TC-004 — Kysely Database interface compiles without errors (REQ-012, NFR-01)

**Given** `src/types/db.ts` exports a `Database` interface referencing all 9 table types
**When** `npm run typecheck` runs in strict mode
**Then** zero TypeScript errors are emitted

### TC-005 — Barrel exports all types importable (REQ-013, NFR-03)

**Given** `src/types/index.ts` is the sole import path
**When** a consumer does `import { ProcesoSchema, type Proceso, PliegoSchema, type Pliego, AnexoProcesoSchema, type AnexoProceso, type Database } from '@/types'`
**Then** all named exports resolve without TypeScript errors

**When** `import { DocumentoSchema } from '@/types'` is attempted
**Then** TypeScript produces a compile error — legacy export removed

### TC-006 — SegmentoSchema accepts `general` categoria (REQ-001, REQ-002, RN-007)

**Given** a valid `SegmentoSchema` base object
**When** parsed with `categoria: 'general'`, `is_synthetic: true`, `heading_normalized: null`, `heading_original: null`, valid `page_range_*`
**Then** parse succeeds and `categoria` is `'general'`

### TC-007 — Zod `.refine()` rejects invalid heading/synthetic combos (REQ-006, RN-010)

**Given** a `SegmentoSchema` value with `is_synthetic: true`, `heading_normalized: 'capacidad juridica'`, `heading_original: 'CAPACIDAD JURÍDICA'`
**When** `SegmentoSchema.parse(value)` is called
**Then** a `ZodError` is thrown

**Given** a value with `is_synthetic: false`, both heading columns `null`
**When** parsed
**Then** also a `ZodError`

### TC-008 — pliego_tipo enum rejects anexo values (REQ-001, RN-012)

**Given** a `PliegoSchema`
**When** `PliegoSchema.parse({ ..., tipo: 'anexo_tecnico' })` is called
**Then** a `ZodError` is thrown

**When** the same data is validated against `AnexoProcesoSchema` with `tipo: 'anexo_tecnico'`
**Then** parse succeeds

### TC-009 — AnexoProcesoTipo enum has exactly 4 values (REQ-001, RN-012)

**Given** the `AnexoProcesoTipo` enum literal object
**When** its values are enumerated
**Then** it contains exactly `anexo_tecnico`, `estudio_previo`, `resolucion`, `otro` — `pliego_condiciones` and `pliego_definitivo` are absent

### TC-010 — EmpresaTable.profile_updated_at forbids direct writes (REQ-011, RN-014)

**Given** the Kysely `EmpresaTable.profile_updated_at` typed as `ColumnType<Date, never, never>`
**When** application code attempts `db.insertInto('empresa').values({ ..., profile_updated_at: new Date() })`
**Then** TypeScript compilation fails

**Given** an `EmpresaSchema` value with `profile_updated_at: new Date()`
**When** parsed
**Then** parse succeeds — schema allows reading the field, only Kysely blocks writes

### TC-011 — RequisitoSchema rejects `categoria: 'general'` (REQ-008, RN-017)

**Given** a valid `RequisitoSchema` value
**When** parsed with `categoria: 'general'`
**Then** a `ZodError` is thrown

**When** parsed with each of `'juridico'`, `'financiero'`, `'tecnico'`, `'experiencia'`
**Then** all four parse successfully

### TC-012 — Kysely RequisitoTable.categoria is insert-only (REQ-008, RN-016)

**Given** the Kysely `RequisitoTable` interface
**When** application code attempts `db.updateTable('requisito').set({ categoria: 'tecnico' })`
**Then** TypeScript compilation fails — update side is `never`

**When** application code attempts `db.insertInto('requisito').values({ ..., categoria: 'juridico' })`
**Then** TypeScript compiles

### TC-013 — RequisitoSchema accepts is_habilitante + is_habilitante_source (REQ-009, RN-018)

**Given** a `RequisitoSchema` value with `is_habilitante: true`, `is_habilitante_source: 'structural'`
**When** parsed
**Then** parse succeeds

**When** parsed with `is_habilitante_source: 'auto'`
**Then** a `ZodError` is thrown

### TC-014 — AnalisisSchema accepts nullable telemetry and semaforo_rules_version (REQ-010)

**Given** an `AnalisisSchema` value with `cost_usd: null`, `model_metadata: null`, `prompt_version: null`, `semaforo_rules_version: null`
**When** parsed
**Then** parse succeeds; all four resolve to `null`

---

## UX/UI

No UI. Developer-facing foundation feature. All contracts consumed by downstream features.

---

## Architecture

### Architecture Decision Records

| ADR | Title | Impact |
|-----|-------|--------|
| ADR-001 | Kysely as query builder | All DB row/insert types must conform to Kysely's `Selectable<T>` / `Insertable<T>` pattern |
| ADR-002 | Zod as runtime validator | TypeScript types always `z.infer<typeof Schema>` — no manual type duplication |

### Tradeoffs

| Tradeoff | We chose | Over | Rationale |
|----------|----------|------|-----------|
| Single source of truth | Zod-first (infer TS types) | Type-first (generate Zod) | Zod validates at runtime; TS types are a compile-time view of the same definition |
| DB type generation | Hand-authored Kysely interface | Introspection-generated types | Greenfield project; manual authoring is faster and more explicit |
| Narrow `RequisitoCategoria` vs wide `SegmentoCategoria` | Two distinct enum types | One shared enum | `general` is never a legitimate category for a requisito; the narrow type encodes the upstream filter once in the type system |
| `requisito.categoria` immutability | `ColumnType<R, R, never>` | Mutable column | Recategorization requires re-extraction; `never` on update side prevents incorrect `UPDATE requisito SET categoria = ...` at compile time |
| `empresa.profile_updated_at` ownership | `ColumnType<Date, never, never>` | Application-managed timestamp | Every UPDATE path bumps it (including direct SQL, admin tools, future services) — no application discipline required |

### Performance Goals & Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| `npm run typecheck` duration | < 10s strict mode | `time npm run typecheck` in CI |
| Zod parse latency (entity) | < 1ms per entity | vitest benchmark, 1000 iterations |

### Data Model

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| `empresa` | `id`, `nit` (UK), `profile_updated_at` | `nit` is the Colombian tax ID. `profile_updated_at: ColumnType<Date, never, never>` — trigger-owned (RN-014). |
| `empresa_member` | `empresa_id`, `user_id` | Junction table for empresa-scoped RLS; role: `owner \| member` |
| `proceso` | `secop_process_number` (UK) | Public procurement record; no `deleted_at` |
| `pliego` | `file_hash` (UK), `tipo` narrow enum, `deleted_at` | `tipo` ∈ {`pliego_condiciones`, `pliego_definitivo`}. Soft-delete only. |
| `anexo_proceso` | `file_hash` (UK), `tipo` anexo enum, `deleted_at` | `tipo` ∈ {`anexo_tecnico`, `estudio_previo`, `resolucion`, `otro`}. Independent dedup space from `pliego`. |
| `segmento` | `pliego_id`, `categoria`, `orden`, `page_range_*`, `heading_*`, `is_synthetic` | `categoria` includes `general` fallback (RN-007). Triple-equivalence via Zod `.refine()` (RN-010). |
| `analisis` | `proceso_id`, `empresa_id`, `pliego_ids[]`, `estado`, telemetry triple, `semaforo_rules_version` | Estado state machine; empresa-private. `pliego_ids` length=1 in v1 (RN-009). |
| `requisito` | `categoria` (narrow, immutable), `cumple` (nullable), `is_habilitante`, `is_habilitante_source`, citation triple | null = sin información. `categoria: ColumnType<RequisitoCategoria, RequisitoCategoria, never>` (RN-016). |
| `prompt_cache` | `(pliego_id, empresa_id)` composite UK | Cache key is SHA-256 of pliego content + prompt version, scoped per empresa |

### API / Data Contracts

No HTTP endpoints. All contracts are TypeScript/Zod types consumed by service layers.

### Service Integrations

| System | Direction | Data |
|--------|-----------|------|
| `domain-model-postgres` | Parallel dependency — column names must match exactly (NFR-02) | Zod field names mirror Postgres column names (snake_case) |
| Downstream services | Read | Kysely `Database` interface |
| API route validators | Read | Zod schemas for request/response validation |

---

## Revision Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-04-30 | Split from monolithic `domain-model` spec (rev 5, 2026-04-27). Archived at `docs/archive/domain-model/`. Extracted: branded IDs, enum literals, Zod schemas for 8 entities, Kysely interface, barrel export, citation/telemetry fields on Requisito/Analisis, `profile_updated_at` Kysely shape, `categoria` immutability, `is_habilitante*` fields. | Monolithic spec grew to 549 lines across 5 revisions; split into independently executable specs by implementation layer. |
