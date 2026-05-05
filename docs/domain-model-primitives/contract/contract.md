# TDD Contract: domain-model-primitives

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

### Behavior: RequisitoCategoria has exactly 4 values and excludes `general` (REQ-001, RN-017)

**Given** the `RequisitoCategoria` union type
**When** `'general'` is tested for assignability
**Then** TypeScript compilation fails — `'general'` is not assignable to `RequisitoCategoria`

**When** each of `'juridico'`, `'financiero'`, `'tecnico'`, `'experiencia'` is tested
**Then** all four are assignable

**Test file:** `src/__tests__/domain/primitives.test-d.ts`
**Framework:** vitest (type tests)

---

## Task T2: Zod Schemas

### Behavior: AnalisisEstado enum rejects unknown value (REQ-004, RN-001) — TC-001

**Given** a valid `AnalisisSchema` base object
**When** `AnalisisSchema.parse({ ...valid, estado: 'cancelled' })` is called
**Then** a `ZodError` is thrown with an `invalid_enum_value` issue on `estado`

**Test file:** `src/__tests__/domain/analisis.test.ts`
**Framework:** vitest

---

### Behavior: Requisito.cumple accepts null, true, and false (REQ-003, RN-002) — TC-002

**Given** a valid `RequisitoSchema` base object
**When** parsed three times with `cumple: null`, `cumple: true`, `cumple: false`
**Then** all three parse calls succeed

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

### Behavior: PliegoSchema rejects anexo tipo values (REQ-001, RN-012) — TC-008

**Given** a valid `PliegoSchema` base object
**When** `PliegoSchema.parse({ ..., tipo: 'anexo_tecnico' })` is called
**Then** a `ZodError` is thrown

**Given** a valid `AnexoProcesoSchema` base object
**When** `AnexoProcesoSchema.parse({ ..., tipo: 'pliego_condiciones' })` is called
**Then** a `ZodError` is thrown

**Test file:** `src/__tests__/domain/pliego.test.ts` and `src/__tests__/domain/anexo-proceso.test.ts`
**Framework:** vitest

---

### Behavior: SegmentoSchema accepts the `general` categoría (REQ-002, RN-007) — TC-006

**Given** a valid `SegmentoSchema` base object
**When** parsed with `categoria: 'general'`, `is_synthetic: true`, `heading_normalized: null`, `heading_original: null`, `page_range_start: 1`, `page_range_end: 1`
**Then** parse succeeds and `categoria` is `'general'`

**Test file:** `src/__tests__/domain/segmento.test.ts`
**Framework:** vitest

---

### Behavior: SegmentoSchema `.refine()` rejects invalid heading/synthetic combos (REQ-006, RN-010) — TC-007

**Given** a `SegmentoSchema` value with `is_synthetic: true`, `heading_normalized: 'capacidad juridica'`, `heading_original: 'CAPACIDAD JURÍDICA'`
**When** `SegmentoSchema.parse(value)` is called
**Then** a `ZodError` is thrown

**Given** a value with `is_synthetic: false`, `heading_normalized: null`, `heading_original: null`
**When** parsed
**Then** a `ZodError` is thrown

**Given** a value with `heading_normalized: 'foo'`, `heading_original: null` (mixed nullability)
**When** parsed
**Then** a `ZodError` is thrown

**Test file:** `src/__tests__/domain/segmento.test.ts`
**Framework:** vitest

---

### Behavior: SegmentoSchema `.refine()` rejects invalid page range (REQ-006, RN-011)

**Given** a `SegmentoSchema` value with `page_range_start: 5`, `page_range_end: 3`
**When** parsed
**Then** a `ZodError` is thrown

**Given** a value with `page_range_start: 0`
**When** parsed
**Then** a `ZodError` is thrown (min: 1)

**Test file:** `src/__tests__/domain/segmento.test.ts`
**Framework:** vitest

---

### Behavior: RequisitoSchema rejects `categoria: 'general'` (REQ-008, RN-017) — TC-011

**Given** a valid `RequisitoSchema` value
**When** parsed with `categoria: 'general'`
**Then** a `ZodError` is thrown

**When** parsed with each of `'juridico'`, `'financiero'`, `'tecnico'`, `'experiencia'`
**Then** all four parse successfully

**Test file:** `src/__tests__/domain/requisito.test.ts`
**Framework:** vitest

---

### Behavior: RequisitoSchema accepts is_habilitante + is_habilitante_source (REQ-009, RN-018) — TC-013

**Given** a `RequisitoSchema` value with `is_habilitante: true`, `is_habilitante_source: 'structural'`
**When** parsed
**Then** parse succeeds

**When** parsed with `is_habilitante_source: 'auto'`
**Then** a `ZodError` is thrown

**Test file:** `src/__tests__/domain/requisito.test.ts`
**Framework:** vitest

---

### Behavior: EmpresaSchema carries profile_updated_at (REQ-011, RN-014) — TC-010 (read-side)

**Given** an `EmpresaSchema` value with `profile_updated_at: new Date()`
**When** parsed
**Then** parse succeeds and `profile_updated_at` is a `Date`

**Test file:** `src/__tests__/domain/empresa.test.ts`
**Framework:** vitest

---

### Behavior: AnalisisSchema accepts nullable telemetry fields (REQ-010)

**Given** an `AnalisisSchema` value with `cost_usd: null`, `model_metadata: null`, `prompt_version: null`, `semaforo_rules_version: null`
**When** parsed
**Then** parse succeeds; all four resolve to `null`

**Test file:** `src/__tests__/domain/analisis.test.ts`
**Framework:** vitest

---

## Task T3: Kysely Types

### Behavior: Kysely Database interface compiles without errors (REQ-012) — TC-004

**Given** `src/types/db.ts` exports a `Database` interface referencing all 9 table types
**When** `npm run typecheck` runs in strict mode
**Then** zero TypeScript errors are emitted

**Test file:** CI step (tsc)
**Framework:** tsc

---

### Behavior: Kysely query resolves to correct TypeScript type (REQ-012)

**Given** a `Kysely<Database>` instance
**When** `.selectFrom('proceso').selectAll().execute()` is called
**Then** TypeScript resolves the return type to `Promise<Selectable<ProcesoTable>[]>` without errors

**Test file:** `src/__tests__/domain/db.test-d.ts` (type-level)
**Framework:** vitest (type tests)

---

### Behavior: EmpresaTable.profile_updated_at forbids direct writes (REQ-011, RN-014) — TC-010 (Kysely-side)

**Given** the Kysely `EmpresaTable.profile_updated_at` typed as `ColumnType<Date, never, never>`
**When** code attempts `db.insertInto('empresa').values({ ..., profile_updated_at: new Date() })`
**Then** TypeScript compilation fails

**When** code attempts `db.updateTable('empresa').set({ profile_updated_at: new Date() })`
**Then** TypeScript compilation also fails

**Test file:** `src/__tests__/domain/db.test-d.ts`
**Framework:** vitest (type tests)

---

### Behavior: RequisitoTable.categoria is insert-only at compile time (REQ-008, RN-016) — TC-012

**Given** the Kysely `RequisitoTable.categoria` typed as `ColumnType<RequisitoCategoria, RequisitoCategoria, never>`
**When** code attempts `db.updateTable('requisito').set({ categoria: 'tecnico' })`
**Then** TypeScript compilation fails — update side is `never`

**When** code attempts `db.insertInto('requisito').values({ ..., categoria: 'juridico' })`
**Then** TypeScript compiles

**Test file:** `src/__tests__/domain/db.test-d.ts`
**Framework:** vitest (type tests)

---

## Task T4: Barrel Exports + Typecheck Gate

### Behavior: All named exports resolve from `@/types` (REQ-013) — TC-005

**Given** `src/types/index.ts` is the import path
**When** `import { ProcesoSchema, type Proceso, PliegoSchema, type Pliego, AnexoProcesoSchema, type AnexoProceso, type Database } from '@/types'` is evaluated
**Then** all named exports resolve without TypeScript errors

**Test file:** `src/__tests__/domain/barrel.test-d.ts` (type-level)
**Framework:** vitest (type tests)

---

### Behavior: Legacy Documento export is not present (REQ-013, RN-012)

**Given** `src/types/index.ts`
**When** `import { DocumentoSchema } from '@/types'` is attempted
**Then** TypeScript emits a compile error (export not found — entity renamed to Pliego)

**Test file:** `src/__tests__/domain/barrel.test-d.ts`
**Framework:** vitest (type tests)

---

### Behavior: Full typecheck passes in strict mode (NFR-01)

**Given** all domain type files and the Kysely interface are written
**When** `npm run typecheck` runs in strict mode
**Then** zero TypeScript errors are emitted and the process exits with code 0 in under 10s

**Test file:** CI step
**Framework:** tsc
