# TDD Contract: domain-model

Markdown TDD guide for `nybo-run`. The Executor Agent reads this file and writes failing tests
before implementing each task (Red phase), then implements (Green), then refactors (Refactor).

**Test framework:** vitest (standard for Next.js/TypeScript projects)
**Test file root:** `src/__tests__/domain/`

---

## Task T1: Type Primitives

### Behavior: Branded ID prevents cross-entity assignment (REQ-001)

**Given** `EmpresaId` and `PliegoId` are distinct branded string types
**When** a value of type `PliegoId` is assigned to a variable typed as `EmpresaId`
**Then** TypeScript emits a compile error (type brand mismatch)

**Test file:** `src/__tests__/domain/primitives.test-d.ts` (type-level test with `expectTypeOf`)
**Framework:** vitest (type tests via `vitest/type-testing`)

---

### Behavior: Enum const objects have the correct values (REQ-001, RN-001, RN-007, RN-012)

**Given** the `AnalisisEstado`, `ModalidadContratacion`, `PliegoTipo`, `AnexoProcesoTipo` const objects are imported from `primitives`
**When** their values are checked
**Then** `AnalisisEstado` contains exactly: `pending`, `extracting`, `analyzing`, `completed`, `failed`
**And** `ModalidadContratacion` contains exactly: `licitacion_publica`, `seleccion_abreviada`, `minima_cuantia`, `concurso_meritos`, `contratacion_directa`
**And** `PliegoTipo` contains exactly: `pliego_condiciones`, `pliego_definitivo` (narrow per RN-012)
**And** `AnexoProcesoTipo` contains exactly: `anexo_tecnico`, `estudio_previo`, `resolucion`, `otro`

**Test file:** `src/__tests__/domain/primitives.test.ts`
**Framework:** vitest

---

## Task T2: Zod Schemas

### Behavior: AnalisisEstado enum rejects unknown value (REQ-004, RN-001) — TC-001

**Given** a valid `AnalisisSchema` base object
**When** `AnalisisSchema.parse({ ...valid, estado: 'cancelled' })` is called
**Then** a `ZodError` is thrown with an invalid_enum_value issue on `estado`

**Test file:** `src/__tests__/domain/analisis.test.ts`
**Framework:** vitest

---

### Behavior: Requisito.cumple accepts null, true, and false (REQ-003, RN-002) — TC-002

**Given** a valid `RequisitoSchema` base object (with `cumple` omitted)
**When** parsed three times with `cumple: null`, `cumple: true`, `cumple: false`
**Then** all three parse calls succeed and return the value as provided

**Test file:** `src/__tests__/domain/requisito.test.ts`
**Framework:** vitest

---

### Behavior: Pliego soft-delete field is nullable (REQ-005, RN-004) — TC-003a

**Given** a valid `PliegoSchema` base object
**When** parsed with `deleted_at: null`
**Then** parse succeeds and `deleted_at` is `null`

**When** parsed without a `deleted_at` key
**Then** parse succeeds and `deleted_at` defaults to `null`

**Test file:** `src/__tests__/domain/pliego.test.ts`
**Framework:** vitest

---

### Behavior: Proceso schema has no deleted_at field (REQ-005, RN-004) — TC-003b

**Given** the `ProcesoSchema` Zod object
**When** `ProcesoSchema.shape` is inspected
**Then** the `deleted_at` key is absent

**Test file:** `src/__tests__/domain/proceso.test.ts`
**Framework:** vitest

---

### Behavior: Pliego file_hash must be exactly 64 characters (REQ-005, RN-003)

**Given** a valid `PliegoSchema` base object
**When** parsed with `file_hash: 'abc'` (too short)
**Then** a `ZodError` is thrown

**When** parsed with `file_hash: 'a'.repeat(64)`
**Then** parse succeeds

**Test file:** `src/__tests__/domain/pliego.test.ts`
**Framework:** vitest

---

### Behavior: Proceso modalidad rejects unknown value (REQ-001, REQ-002)

**Given** a valid `ProcesoSchema` base object
**When** parsed with `modalidad: 'invalid_modalidad'`
**Then** a `ZodError` is thrown

**Test file:** `src/__tests__/domain/proceso.test.ts`
**Framework:** vitest

---

### Behavior: Analisis.pliego_ids is an array of UUIDs (REQ-010, RN-009)

**Given** a valid `AnalisisSchema` base object
**When** parsed with `pliego_ids: ['<valid uuid>']`
**Then** parse succeeds and returns the array unchanged

**When** parsed with `pliego_ids: ['not-a-uuid']`
**Then** a `ZodError` is thrown

**Test file:** `src/__tests__/domain/analisis.test.ts`
**Framework:** vitest

---

### Behavior: SegmentoSchema accepts the `general` categoría (REQ-001, REQ-002, RN-007) — TC-010

**Given** a valid `SegmentoSchema` base object
**When** parsed with `categoria: 'general'`, `is_synthetic: true`, `heading_normalized: null`, `heading_original: null`, `page_range_start: 1`, `page_range_end: 1`
**Then** parse succeeds and `categoria` is `'general'`

**Test file:** `src/__tests__/domain/segmento.test.ts`
**Framework:** vitest

---

### Behavior: SegmentoSchema `.refine()` rejects synthetic-with-heading (REQ-012, RN-010) — TC-014

**Given** a `SegmentoSchema` value with `is_synthetic: true`, `heading_normalized: 'capacidad juridica'`, `heading_original: 'CAPACIDAD JURÍDICA'`
**When** `SegmentoSchema.parse(value)` is called
**Then** a `ZodError` is thrown — invalid combo rejected at parse time without DB roundtrip

**Test file:** `src/__tests__/domain/segmento.test.ts`
**Framework:** vitest

---

### Behavior: SegmentoSchema `.refine()` rejects non-synthetic-without-heading (REQ-012, RN-010)

**Given** a `SegmentoSchema` value with `is_synthetic: false`, `heading_normalized: null`, `heading_original: null`
**When** parsed
**Then** a `ZodError` is thrown

**Test file:** `src/__tests__/domain/segmento.test.ts`
**Framework:** vitest

---

### Behavior: SegmentoSchema `.refine()` rejects both-or-neither violation (REQ-012, RN-010)

**Given** a `SegmentoSchema` value with `heading_normalized: 'foo'`, `heading_original: null` (mixed nullability)
**When** parsed
**Then** a `ZodError` is thrown

**Test file:** `src/__tests__/domain/segmento.test.ts`
**Framework:** vitest

---

### Behavior: SegmentoSchema `.refine()` rejects invalid page range (REQ-012, RN-011)

**Given** a `SegmentoSchema` value with `page_range_start: 5`, `page_range_end: 3`
**When** parsed
**Then** a `ZodError` is thrown

**Given** a value with `page_range_start: 0`
**When** parsed
**Then** a `ZodError` is thrown (min: 1)

**Test file:** `src/__tests__/domain/segmento.test.ts`
**Framework:** vitest

---

### Behavior: PliegoSchema rejects anexo tipo values (REQ-001, RN-012) — TC-015

**Given** a valid `PliegoSchema` base object
**When** `PliegoSchema.parse({ ..., tipo: 'anexo_tecnico' })` is called
**Then** a `ZodError` is thrown — `anexo_tecnico` is not in the narrow `pliego_tipo` enum

**Given** a valid `AnexoProcesoSchema` base object
**When** `AnexoProcesoSchema.parse({ ..., tipo: 'pliego_condiciones' })` is called
**Then** a `ZodError` is thrown — pliego values are not in `anexo_proceso_tipo`

**Test file:** `src/__tests__/domain/pliego.test.ts` and `src/__tests__/domain/anexo-proceso.test.ts`
**Framework:** vitest

---

### Behavior: AnexoProcesoSchema soft-delete and file_hash parity with Pliego (REQ-005, RN-003, RN-004)

**Given** a valid `AnexoProcesoSchema` base object
**When** parsed with `deleted_at: null`
**Then** parse succeeds and `deleted_at` is `null`

**When** parsed with `file_hash: 'abc'`
**Then** a `ZodError` is thrown (must be 64 chars)

**Test file:** `src/__tests__/domain/anexo-proceso.test.ts`
**Framework:** vitest

---

## Task T3: Postgres Migration

### Behavior: Duplicate pliego.file_hash is rejected (REQ-006, RN-003) — TC-004

**Given** the migration has been applied to a local Supabase test instance
**And** a pliego row exists with `file_hash = 'a'.repeat(64)`
**When** a second insert is attempted with the same `file_hash` (different proceso_id, different empresa)
**Then** Postgres throws a unique constraint violation error

**When** an insert into `anexo_proceso` is attempted with the same `file_hash`
**Then** the insert succeeds — independent dedup space (RN-003)

**Test file:** `src/__tests__/domain/migration.test.ts` (integration — requires local Supabase)
**Framework:** vitest (with `@supabase/supabase-js` service role client)

---

### Behavior: Duplicate anexo_proceso.file_hash is rejected (REQ-005, RN-003) — TC-018

**Given** the migration is applied
**And** an `anexo_proceso` row exists with `file_hash = 'b'.repeat(64)`
**When** a second insert into `anexo_proceso` is attempted with the same `file_hash`
**Then** Postgres throws a unique constraint violation error

**When** an insert into `pliego` is attempted with that same `file_hash`
**Then** the insert succeeds — independent dedup space

**Test file:** `src/__tests__/domain/migration.test.ts`
**Framework:** vitest (integration)

---

### Behavior: pliego_tipo enum rejects anexo values; anexo_proceso_tipo enum rejects pliego values (REQ-006, RN-012) — TC-015

**Given** the migration has been applied
**When** an insert into `pliego` is attempted with `tipo = 'anexo_tecnico'`
**Then** Postgres rejects the insert with an invalid_text_representation error (value not in `pliego_tipo` enum)

**When** an insert into `anexo_proceso` is attempted with `tipo = 'anexo_tecnico'`
**Then** the insert succeeds

**When** an insert into `anexo_proceso` is attempted with `tipo = 'pliego_condiciones'`
**Then** Postgres rejects with an invalid_text_representation error

**Test file:** `src/__tests__/domain/migration.test.ts`
**Framework:** vitest (integration)

---

### Behavior: anexo_proceso_tipo enum has exactly 4 values (REQ-006, RN-012) — TC-016

**Given** the migration has been applied
**When** querying `SELECT enum_range(NULL::anexo_proceso_tipo)`
**Then** the result contains exactly `{anexo_tecnico, estudio_previo, resolucion, otro}`

**Test file:** `src/__tests__/domain/migration.test.ts`
**Framework:** vitest (integration)

---

### Behavior: Proceso has no deleted_at column (REQ-005, RN-004)

**Given** the migration has been applied
**When** querying `information_schema.columns WHERE table_name = 'proceso' AND column_name = 'deleted_at'`
**Then** zero rows are returned

**Test file:** `src/__tests__/domain/migration.test.ts`
**Framework:** vitest (integration)

---

### Behavior: requisito.cumple column allows NULL in Postgres (REQ-006, RN-002)

**Given** the migration has been applied
**When** a requisito row is inserted with `cumple = NULL`
**Then** the insert succeeds and the row is stored with `cumple IS NULL`

**Test file:** `src/__tests__/domain/migration.test.ts`
**Framework:** vitest (integration)

---

### Behavior: prompt_cache (pliego_id, empresa_id) is unique (REQ-006, RN-005)

**Given** the migration has been applied
**And** a prompt_cache row exists for `(pliego D, empresa A)`
**When** a second insert is attempted for the same `(pliego D, empresa A)` pair
**Then** Postgres throws a unique constraint violation error

**When** a second insert is attempted for `(pliego D, empresa B)` (different empresa)
**Then** the insert succeeds

**Test file:** `src/__tests__/domain/migration.test.ts`
**Framework:** vitest (integration)

---

### Behavior: segmento heading both-or-neither CHECK (REQ-006, RN-010) — TC-011

**Given** the migration has been applied
**When** a `segmento` row is inserted with `heading_normalized = 'capacidad juridica'` AND `heading_original IS NULL`
**Then** Postgres rejects the insert with a CHECK constraint violation (constraint name `segmento_heading_both_or_neither`)

**When** the inverse — `heading_normalized IS NULL` AND `heading_original = 'CAPACIDAD JURÍDICA'` — is attempted
**Then** Postgres also rejects with the same CHECK violation

**Test file:** `src/__tests__/domain/migration.test.ts`
**Framework:** vitest (integration)

---

### Behavior: segmento synthetic ⇔ null-heading CHECK (REQ-006, RN-010) — TC-012

**Given** the migration has been applied
**When** a `segmento` row is inserted with `is_synthetic = true` AND both heading columns non-null
**Then** Postgres rejects with a CHECK violation (constraint name `segmento_synthetic_iff_null_heading`)

**When** a row is inserted with `is_synthetic = false` AND both heading columns NULL
**Then** Postgres also rejects with the same CHECK violation

**Test file:** `src/__tests__/domain/migration.test.ts`
**Framework:** vitest (integration)

---

### Behavior: segmento page_range CHECK (REQ-006, RN-011) — TC-013

**Given** the migration has been applied
**When** a `segmento` row is inserted with `page_range_start = 5, page_range_end = 3`
**Then** Postgres rejects with a CHECK violation (constraint name `segmento_page_range_valid`)

**When** a row is inserted with `page_range_start = 0`
**Then** Postgres also rejects with the same CHECK violation

**Test file:** `src/__tests__/domain/migration.test.ts`
**Framework:** vitest (integration)

---

### Behavior: segmento_categoria Postgres enum includes `general` (REQ-006, RN-007)

**Given** the migration has been applied
**When** querying `SELECT enum_range(NULL::segmento_categoria)`
**Then** the result contains exactly `{juridico, financiero, tecnico, experiencia, general}`

**Test file:** `src/__tests__/domain/migration.test.ts`
**Framework:** vitest (integration)

---

## Task T4: RLS Policies

### Behavior: Authenticated user cannot read another empresa's analisis (REQ-007, RN-005, RN-006) — TC-006

**Given** empresa A and empresa B both have one análisis for the same proceso
**And** user A is authenticated as a member of empresa A only
**When** user A executes `SELECT * FROM analisis` via the Supabase JS client
**Then** only empresa A's analisis is returned; empresa B's row is not present in the result set

**Test file:** `src/__tests__/domain/rls.test.ts` (integration — requires local Supabase with two test users)
**Framework:** vitest (integration)

---

### Behavior: Proceso is publicly readable across empresas (REQ-011, RN-008) — TC-008

**Given** a proceso row P1 exists
**And** user A (empresa A) and user B (empresa B) are both authenticated
**When** each runs `SELECT * FROM proceso WHERE id = P1.id`
**Then** both queries return the same row

**Test file:** `src/__tests__/domain/rls.test.ts`
**Framework:** vitest (integration)

---

### Behavior: Empresa B cannot see empresa A's analisis for the same proceso (REQ-007, RN-006) — TC-009

**Given** proceso P1 exists; empresa A has analisis A1 for P1; empresa B has analisis A2 for P1
**And** user B is authenticated as a member of empresa B only
**When** user B executes `SELECT * FROM analisis WHERE proceso_id = P1.id`
**Then** only A2 is returned; A1 is invisible

**Test file:** `src/__tests__/domain/rls.test.ts`
**Framework:** vitest (integration)

---

### Behavior: Hard delete on pliego is rejected by RLS (REQ-007, RN-004)

**Given** an authenticated user and an existing pliego D1
**When** `DELETE FROM pliego WHERE id = D1.id` is executed via the Supabase JS client
**Then** the operation is rejected (zero rows deleted, or permission denied error)

**Given** an existing anexo_proceso row
**When** `DELETE FROM anexo_proceso WHERE id = ...` is executed
**Then** the operation is also rejected (parallel hard-delete policy)

**Test file:** `src/__tests__/domain/rls.test.ts`
**Framework:** vitest (integration)

---

### Behavior: AnexoProceso is publicly readable across empresas (REQ-011, RN-008) — TC-017

**Given** an `anexo_proceso` row A1 exists
**And** user A (empresa A) and user B (empresa B) are both authenticated
**When** each runs `SELECT * FROM anexo_proceso WHERE id = A1.id`
**Then** both queries return the same row

**Test file:** `src/__tests__/domain/rls.test.ts`
**Framework:** vitest (integration)

---

## Task T5: Kysely Types

### Behavior: Kysely query resolves to correct TypeScript type (REQ-008) — TC-005

**Given** a `Kysely<Database>` instance
**When** `.selectFrom('proceso').selectAll().execute()` is called
**Then** TypeScript resolves the return type to `Promise<Selectable<ProcesoTable>[]>` without errors

**When** the same is done for `pliego`, `analisis`, `prompt_cache`
**Then** each resolves to its corresponding `Selectable<*Table>[]`

**Test file:** `src/__tests__/domain/db.test-d.ts` (type-level)
**Framework:** vitest (type tests)

---

### Behavior: Legacy table reference produces compile error (REQ-008)

**Given** the `Database` interface
**When** code attempts `.selectFrom('documento')` (renamed to `pliego` in revision 3)
**Then** TypeScript emits a compile error

**Test file:** `src/__tests__/domain/db.test-d.ts`
**Framework:** vitest (type tests)

---

### Behavior: SegmentoTable exposes new columns with correct types (REQ-008, RN-010, RN-011)

**Given** the `SegmentoTable` interface
**When** a value is constructed
**Then** `page_range_start: number`, `page_range_end: number`, `heading_normalized: string | null`, `heading_original: string | null`, `is_synthetic: ColumnType<boolean, boolean | undefined, boolean>` are all assignable; constructing without `is_synthetic` is valid for `NewSegmento` (Insertable narrows the optional side)

**Test file:** `src/__tests__/domain/db.test-d.ts`
**Framework:** vitest (type tests)

---

## Task T6: Barrel Exports

### Behavior: All named exports resolve from `@/types` (REQ-009) — TC-007

**Given** the barrel `src/types/index.ts` is the import path
**When** `import { ProcesoSchema, type Proceso, PliegoSchema, type Pliego, AnexoProcesoSchema, type AnexoProceso, type Database } from '@/types'` is evaluated
**Then** all named exports resolve without TypeScript errors

**Test file:** `src/__tests__/domain/barrel.test-d.ts` (type-level)
**Framework:** vitest (type tests)

---

### Behavior: Legacy Documento export is not present (REQ-009, RN-012)

**Given** the barrel `src/types/index.ts`
**When** `import { DocumentoSchema } from '@/types'` is attempted
**Then** TypeScript emits a compile error (export not found — entity renamed to Pliego)

**Test file:** `src/__tests__/domain/barrel.test-d.ts`
**Framework:** vitest (type tests)

---

### Behavior: RequisitoSchema rejects narrow categoria violation (REQ-018, RN-017) — TC-026

**Given** a valid `RequisitoSchema` value
**When** parsed with `categoria: 'general'`
**Then** a `ZodError` is thrown — `general` is not in `RequisitoCategoria`

**When** parsed with `categoria: 'juridico'` (and any of the other three valid values)
**Then** parse succeeds

**Test file:** `src/__tests__/domain/requisito.test.ts`
**Framework:** vitest

---

### Behavior: RequisitoExtractionPayloadSchema rejects general-categoria payload (REQ-016, RN-017) — TC-027

**Given** a `RequisitoExtractionPayloadSchema` payload with otherwise-valid fields and `categoria: 'general'`
**When** `RequisitoExtractionPayloadSchema.parse(payload)` is called
**Then** a `ZodError` is thrown — the `.refine()` rejects `general` per RN-017

**Test file:** `src/__tests__/domain/extraction-payload.test.ts`
**Framework:** vitest

---

### Behavior: RequisitoSchema accepts is_habilitante + is_habilitante_source (REQ-019, RN-018) — TC-028

**Given** a `RequisitoSchema` value
**When** parsed with `is_habilitante: true, is_habilitante_source: 'structural'`
**Then** parse succeeds

**When** parsed with `is_habilitante_source` ∈ `{'structural','llm','manual'}`
**Then** all three parse successfully

**When** parsed with `is_habilitante_source: 'auto'`
**Then** a `ZodError` is thrown

**Test file:** `src/__tests__/domain/requisito.test.ts`
**Framework:** vitest

---

### Behavior: Postgres CHECK rejects narrow-categoria and is_habilitante_source violations (REQ-018, REQ-019) — TC-029

**Given** the migration is applied
**When** a `requisito` row is inserted with `categoria = 'general'`
**Then** Postgres rejects with a CHECK violation on `requisito_categoria_narrow`

**When** a `requisito` row is inserted with `is_habilitante_source = 'auto'`
**Then** Postgres rejects with a CHECK violation on `requisito_is_habilitante_source_valid`

**Test file:** `src/__tests__/domain/migration.test.ts`
**Framework:** vitest (integration)

---

### Behavior: RequisitoTable.categoria is immutable at the type level (REQ-018, RN-016) — TC-030

**Given** the Kysely `RequisitoTable` interface
**When** application code attempts `db.updateTable('requisito').set({ categoria: 'tecnico' })`
**Then** TypeScript compilation fails — the update side of `categoria` is `never`

**When** application code attempts `db.insertInto('requisito').values({ ..., categoria: 'juridico' })`
**Then** TypeScript compiles — INSERT is permitted; only UPDATE is blocked

**Test file:** `src/__tests__/domain/db.test-d.ts`
**Framework:** vitest (type tests)

---

### Behavior: Semaforo types and habilitante constants resolve from @/types (REQ-021, REQ-022) — TC-031

**Given** the barrel `src/types/index.ts`
**When** `import { type Semaforo, type SemaforoStats, type RequisitoCategoria, type IsHabilitanteSource, HABILITANTE_HEADING_PATTERNS, HABILITANTE_PATTERNS_VERSION } from '@/types'` is evaluated
**Then** all named exports resolve without TypeScript errors; `HABILITANTE_HEADING_PATTERNS` is a `readonly RegExp[]` of length ≥ 5; `HABILITANTE_PATTERNS_VERSION === 'v1.0.0'`

**Test file:** `src/__tests__/domain/barrel.test.ts`
**Framework:** vitest

---

### Behavior: Full typecheck passes in strict mode (NFR-01)

**Given** all domain type files and the Kysely interface are written
**When** `npm run typecheck` runs in strict mode
**Then** zero TypeScript errors are emitted and the process exits with code 0

**Test file:** CI step — not a vitest test. Verified by running `time npm run typecheck`.
**Framework:** tsc
