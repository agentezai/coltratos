# Verification Plan

## T1: Type Primitives

### Test Scenarios
- Import `EmpresaId`, `ProcesoId`, `PliegoId`, `AnexoProcesoId`, etc. from `primitives.ts` in an isolated TypeScript file — confirm no import errors
- Verify `AnalisisEstado` const object has exactly 5 values: `pending`, `extracting`, `analyzing`, `completed`, `failed`
- Verify `SegmentoCategoria` has exactly 5 values: `juridico`, `financiero`, `tecnico`, `experiencia`, `general` (ASCII, no accents)
- Verify `ModalidadContratacion` has exactly 5 values: `licitacion_publica`, `seleccion_abreviada`, `minima_cuantia`, `concurso_meritos`, `contratacion_directa`
- Verify `PliegoTipo` has exactly 2 values: `pliego_condiciones`, `pliego_definitivo` (narrow per RN-012)
- Verify `AnexoProcesoTipo` has exactly 4 values: `anexo_tecnico`, `estudio_previo`, `resolucion`, `otro`
- Confirm `branded<EmpresaId>('some-uuid')` returns the same string but typed as `EmpresaId`
- Confirm that assigning a `PliegoId` where an `EmpresaId` is expected produces a TypeScript error
- Confirm that assigning a `PliegoId` where an `AnexoProcesoId` is expected produces a TypeScript error (the brand split is a real type boundary)

### Gate Criteria
`tsc --noEmit --strict` on `primitives.ts` exits with code 0. All enum values are ASCII (no diacritics). Four ADR files exist under `.nybo/foundation/adrs/` (ADR-001, 002, 003, 008).

---

## T2: Zod Schemas

### Test Scenarios
- TC-001: `AnalisisSchema.parse({ ..., estado: 'cancelled' })` throws `ZodError`
- TC-002: `RequisitoSchema.parse({ ..., cumple: null })` succeeds; `.parse({ ..., cumple: true })` succeeds; `.parse({ ..., cumple: false })` succeeds
- TC-003a: `PliegoSchema.parse({ ..., deleted_at: null })` succeeds; `deleted_at` absent also succeeds (parallel test for `AnexoProcesoSchema`)
- TC-003b: `ProcesoSchema.shape` does NOT contain `deleted_at` key
- `PliegoSchema.parse({ ..., file_hash: 'abc' })` throws (file_hash must be 64 chars); same for `AnexoProcesoSchema`
- `PliegoSchema.parse({ ..., file_hash: 'a'.repeat(64) })` succeeds; same for `AnexoProcesoSchema`
- `AnalisisSchema.parse({ ..., pliego_ids: ['<uuid>'] })` succeeds with length=1
- `ProcesoSchema.parse({ ..., modalidad: 'invalid_modalidad' })` throws `ZodError`
- TC-015: `PliegoSchema.parse({ ..., tipo: 'anexo_tecnico' })` throws `ZodError`; `AnexoProcesoSchema.parse({ ..., tipo: 'pliego_condiciones' })` throws `ZodError`
- TC-010: `SegmentoSchema.parse({ ..., categoria: 'general', is_synthetic: true, heading_normalized: null, heading_original: null, page_range_start: 1, page_range_end: 1 })` succeeds
- TC-014: `SegmentoSchema.parse({ ..., is_synthetic: true, heading_normalized: 'capacidad juridica', heading_original: 'CAPACIDAD JURÍDICA' })` throws `ZodError` (synthetic-with-heading violation)
- TC-014: `SegmentoSchema.parse({ ..., is_synthetic: false, heading_normalized: null, heading_original: null })` throws `ZodError` (non-synthetic-without-heading violation)
- TC-014: `SegmentoSchema.parse({ ..., heading_normalized: 'foo', heading_original: null })` throws `ZodError` (both-or-neither violation)
- TC-014: `SegmentoSchema.parse({ ..., page_range_start: 5, page_range_end: 3 })` throws `ZodError` (page-range violation)
- TC-026: `RequisitoSchema.parse({ ..., categoria: 'general' })` throws `ZodError`; valid categorías parse successfully
- TC-027: `RequisitoExtractionPayloadSchema.parse({ ..., categoria: 'general' })` throws `ZodError` via `.refine()`
- TC-028: `RequisitoSchema` accepts `is_habilitante: true/false`; `is_habilitante_source` accepts only `'structural'|'llm'|'manual'`; rejects `'auto'`
- All 11 entity-tier files individually compile without errors (incl. new `semaforo.ts` and `habilitante-patterns.ts`)
- `import { type Semaforo, type RequisitoCategoria, HABILITANTE_HEADING_PATTERNS } from '@/types/domain/semaforo'` and from `@/types/domain/habilitante-patterns` resolve

### Gate Criteria
All unit tests (TC-001, TC-002, TC-003a, TC-003b, TC-010, TC-014, TC-026, TC-027, TC-028, plus hash and modalidad validation tests) pass. `tsc --noEmit --strict` across all domain files exits with code 0.

---

## T3: Postgres Migration

### Test Scenarios
- TC-004: Apply migration to local Supabase; insert two `pliego` rows with identical `file_hash` — second insert must fail with unique constraint violation. Insert into `anexo_proceso` with the same `file_hash` succeeds (independent space)
- Verify all 9 tables exist after migration (incl. `pliego` and `anexo_proceso`)
- Verify `requisito.cumple` column allows NULL
- Verify `pliego.deleted_at` and `anexo_proceso.deleted_at` columns are nullable
- Verify `proceso` has no `deleted_at` column (`information_schema.columns` query)
- Verify `analisis.estado` column is typed as the `analisis_estado` Postgres enum
- Verify `analisis.pliego_ids` column is typed as `uuid[]`
- Verify `proceso.secop_process_number` UNIQUE constraint exists
- Verify `prompt_cache (pliego_id, empresa_id)` UNIQUE constraint exists
- TC-015: insert into `pliego` with `tipo = 'anexo_tecnico'` rejected by enum; insert into `anexo_proceso` with same value succeeds
- TC-016: `enum_range(NULL::anexo_proceso_tipo)` returns exactly `{anexo_tecnico, estudio_previo, resolucion, otro}`
- TC-018: `anexo_proceso.file_hash` UNIQUE rejection within table; cross-table parallel insert into `pliego` succeeds
- Verify `segmento_categoria` Postgres enum includes `'general'` (`SELECT enum_range(NULL::segmento_categoria)`)
- Verify `segmento` has columns `page_range_start`, `page_range_end` (`int`, `NOT NULL`); `heading_normalized`, `heading_original` (`text`, nullable); `is_synthetic` (`boolean`, NOT NULL, default `false`)
- TC-011: insert into `segmento` with `heading_normalized = 'foo'` and `heading_original = NULL` → CHECK violation (both-or-neither)
- TC-012: insert with `is_synthetic = true` AND `heading_normalized = 'foo'` → CHECK violation (synthetic-with-heading)
- TC-012: insert with `is_synthetic = false` AND both heading columns NULL → CHECK violation (non-synthetic-without-heading)
- TC-013: insert with `page_range_start = 5, page_range_end = 3` → CHECK violation
- TC-013: insert with `page_range_start = 0` → CHECK violation
- TC-029: insert into `requisito` with `categoria = 'general'` → CHECK violation on `requisito_categoria_narrow`; insert with `is_habilitante_source = 'auto'` → CHECK violation on `requisito_is_habilitante_source_valid`
- Verify `requisito` carries `categoria TEXT NOT NULL`, `is_habilitante BOOLEAN NOT NULL`, `is_habilitante_source TEXT NOT NULL`
- Verify `analisis` carries `semaforo_rules_version TEXT NULL`

### Gate Criteria
`supabase db push` exits with code 0 against a local Supabase instance. TC-004, TC-011, TC-012, TC-013, TC-029 all pass. `psql \d+ pliego` shows the global `UNIQUE(file_hash)` constraint and nullable `deleted_at`. `\d+ proceso` shows no `deleted_at` column. `\d+ segmento` shows the three CHECK constraints. `\d+ requisito` shows the four CHECKs (`citation_quote_length`, `categoria_narrow`, `is_habilitante_source_valid`, plus the existing FK constraints).

---

## T4: RLS Policies

### Test Scenarios
- TC-006: Using two separate authenticated Supabase clients (user A in empresa A, user B in empresa B), insert one `analisis` per empresa for the same proceso. Each client runs `SELECT * FROM analisis` — each receives exactly one row (their own).
- TC-008: Insert one `proceso` row. User A and user B both run `SELECT * FROM proceso WHERE id = '...'` — both receive the same row.
- TC-009: User B runs `SELECT * FROM analisis WHERE proceso_id = '...'` — empresa A's analisis row is not present.
- TC-017: Insert one `anexo_proceso` row. User A and user B both run `SELECT * FROM anexo_proceso WHERE id = '...'` — both receive the same row (public-read parity).
- Verify `DELETE FROM pliego WHERE id = '...'` fails for authenticated users (hard-delete policy)
- Verify `DELETE FROM anexo_proceso WHERE id = '...'` also fails (hard-delete policy)
- Verify `UPDATE pliego SET deleted_at = now() WHERE id = '...'` succeeds (soft-delete allowed); same for `anexo_proceso`
- Verify unauthenticated SELECT returns zero rows on empresa-scoped tables (`analisis`, `requisito`, `prompt_cache`)
- Verify unauthenticated SELECT also returns zero rows on `proceso`, `pliego`, `anexo_proceso` (the `authenticated` role check excludes anon)

### Gate Criteria
TC-006, TC-008, TC-009 all pass. Hard-delete attempt on `documento` is rejected by RLS. Soft-delete via UPDATE succeeds. Unauthenticated access returns empty results across all tables.

---

## T5: Kysely Types

### Test Scenarios
- TC-005: Create a file that instantiates `Kysely<Database>` and writes a `.selectFrom('proceso').selectAll()` query — verify TypeScript resolves return type to `Selectable<ProcesoTable>[]`
- Same query for `pliego`, `anexo_proceso`, `analisis`, `prompt_cache`
- Attempt to use `.selectFrom('documento')` (legacy table name) — verify TypeScript compile error
- Attempt to access a nonexistent column (e.g., `pliego.documento_id`) — verify TypeScript compile error
- Verify `NewProceso` makes `id`, `created_at` optional (Kysely `Insertable` behavior)
- Verify `NewAnalisis.pliego_ids` is required and typed as `string[]`
- Verify `SegmentoTable` exposes `page_range_start: number`, `page_range_end: number`, `heading_normalized: string | null`, `heading_original: string | null`, `is_synthetic: ColumnType<boolean, boolean | undefined, boolean>`
- Verify `NewSegmento` makes `is_synthetic` optional (DB default applies) — type-test asserts assignability of an object without `is_synthetic`

### Gate Criteria
TC-005 passes. Type-safety test (nonexistent column) produces a compile error. `tsc --noEmit --strict` on `db.ts` exits with code 0.

---

## T6: Barrel Exports + Typecheck

### Test Scenarios
- TC-007: `import { ProcesoSchema, type Proceso, PliegoSchema, type Pliego, AnexoProcesoSchema, type AnexoProceso, type Database } from '@/types'` compiles without errors in a fresh consumer file
- Verify legacy import `import { DocumentoSchema } from '@/types'` produces a TypeScript error (entity renamed)
- All named exports in the barrel resolve — run `tsc --noEmit --strict` across the entire `src/` directory
- Verify `npm run typecheck` exits code 0 in under 10s

### Gate Criteria
TC-007 passes. `npm run typecheck` exits code 0 in strict mode. Duration under 10s measured via `time npm run typecheck`.

---

## End-to-End Verification

**Final acceptance test:**
1. Fresh clone of the repo; run `supabase db push` — all migrations apply without errors.
2. Run `npm run typecheck` — exits 0 in strict mode, under 10s.
3. Run `npm run test` — TC-001 through TC-018 all pass.
4. In a consumer file, write `import { ProcesoSchema, type Proceso, PliegoSchema, type Pliego, AnexoProcesoSchema, type AnexoProceso, type Database } from '@/types'` — TypeScript resolves with no errors.
5. Simulate cross-tenant query (TC-006) against local Supabase — empresa B's analisis is invisible to empresa A's user.
6. Simulate cross-empresa proceso read (TC-008) and anexo_proceso read (TC-017) — both empresas see the same row in each.
7. Attempt duplicate pliego upload (TC-004) — Postgres rejects with constraint violation on `file_hash`. Same hash succeeds in `anexo_proceso` (TC-018, independent dedup).
8. Attempt hard delete on pliego or anexo_proceso — RLS rejects with permission denied.
9. Attempt insert into `pliego` with `tipo = 'anexo_tecnico'` (TC-015) — Postgres enum rejection.

**Gate Criteria:** All 9 steps complete without errors. `npm run typecheck` and `npm run test` both exit 0. Cross-tenant isolation confirmed by TC-006 and TC-009; public-read parity confirmed by TC-008 and TC-017; entity-split semantics confirmed by TC-015 and TC-018.
