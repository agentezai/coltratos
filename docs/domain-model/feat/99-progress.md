# Progress Tracker

**Status:** Not Started

**Current Task:** T1: Type Primitives

---

## Task Checklist

### T1: Type Primitives
- [ ] Implement Task 1: Define 8 branded ID types (`EmpresaId`, `ProcesoId`, `PliegoId`, `AnexoProcesoId`, `SegmentoId`, `AnalisisId`, `RequisitoId`, `PromptCacheId`), enum const objects (`AnalisisEstado`, `SegmentoCategoria` — incl. `general`, `RequisitoCategoria` — narrow 4 values, `SemaforoColor`, `IsHabilitanteSource` — 3 values, `ModalidadContratacion`, `PliegoTipo` — narrow to 2 values, `AnexoProcesoTipo` — 4 values, `EmpresaMemberRole`), and write ADR-001/002/003/008 to `.nybo/foundation/adrs/`
- [ ] Verify Task 1: `tsc --noEmit --strict` on `primitives.ts` exits 0; all enum values ASCII; `SegmentoCategoria` includes `general`; `RequisitoCategoria` excludes `general` (compile-time check); `PliegoTipo` is narrow; `IsHabilitanteSource` has 3 values; four ADR files exist

### T2: Zod Schemas + Domain Files
- [ ] Implement Task 2: Write Zod schemas for all 8 entity files plus `extraction-payload.ts` in `src/types/domain/` (`empresa` incl. `profile_updated_at`, `proceso`, `pliego`, `anexo-proceso`, `segmento`, `analisis` incl. 4 telemetry/version fields, `requisito` incl. `categoria` narrow + `is_habilitante` + `is_habilitante_source` + 3 citation fields, `prompt-cache`, `extraction-payload` carrying `RequisitoExtractionPayloadSchema` with general-categoria `.refine()` rejection). Create new files `src/types/domain/semaforo.ts` (types-only: `Semaforo`/`SemaforoStats`/`RequisitoCategoria`/`IsHabilitanteSource`) and `src/types/domain/habilitante-patterns.ts` (constants: `HABILITANTE_HEADING_PATTERNS` + `HABILITANTE_PATTERNS_VERSION`). `SegmentoSchema` keeps 3 `.refine()` validators.
- [ ] Verify Task 2: TC-001, TC-002, TC-003a, TC-003b, TC-010, TC-014, TC-015, TC-019, TC-020, TC-021, TC-022 (read-side), TC-025, TC-026, TC-027, TC-028 pass; `file_hash` length validation passes for both Pliego and AnexoProceso; `citation_quote` length validation rejects >200; `RequisitoSchema` rejects `categoria='general'`; `RequisitoExtractionPayloadSchema` rejects `categoria='general'` via `.refine()`; `tsc --noEmit --strict` exits 0

### T3: Postgres Migration
- [ ] Implement Task 3: Write `supabase/migrations/20260425000000_domain_model.sql` with all 9 tables (incl. `pliego` and `anexo_proceso`), 7 enum types (`pliego_tipo` narrow + `anexo_proceso_tipo` + `segmento_categoria` incl. `general` + others), FK constraints, independent UNIQUE on `pliego.file_hash` and `anexo_proceso.file_hash`; `segmento.pliego_id` FK; `segmento` 5 columns + 3 CHECK constraints; `analisis.pliego_ids` + `analisis.cost_usd`/`model_metadata`/`prompt_version`/`semaforo_rules_version`; `requisito` 3 citation columns + `categoria TEXT NOT NULL` + `is_habilitante BOOLEAN NOT NULL` + `is_habilitante_source TEXT NOT NULL` + 3 CHECK constraints (`requisito_citation_quote_length`, `requisito_categoria_narrow`, `requisito_is_habilitante_source_valid`); `empresa.profile_updated_at` + `set_empresa_profile_updated_at()` trigger; `prompt_cache.pliego_id`
- [ ] Verify Task 3: `supabase db push` applies cleanly; TC-004, TC-011–TC-013, TC-015, TC-016, TC-018, TC-023, TC-024, TC-029 all pass; `\d+ segmento` shows the 3 CHECK constraints; `\d+ requisito` shows 4 CHECKs (citation_quote_length + categoria_narrow + is_habilitante_source_valid + the FK constraints); `\d+ empresa` shows the trigger; `\d+ proceso` confirms no `deleted_at`; `\d+ pliego` and `\d+ anexo_proceso` show independent UNIQUE on file_hash

### T4: RLS Policies
- [ ] Implement Task 4: Write `supabase/migrations/20260425000001_rls_domain_model.sql` with bifurcated policies — public-read for `proceso`/`pliego`/`anexo_proceso`/`segmento`; `empresa_member` join for `analisis`/`requisito`/`prompt_cache`; hard-delete restrictive policies on `pliego` and `anexo_proceso`
- [ ] Verify Task 4: TC-006, TC-008, TC-009, TC-017 pass; hard-delete on `pliego` and `anexo_proceso` blocked; soft-delete via UPDATE succeeds

### T5: Kysely Database Interface
- [ ] Implement Task 5: Write `src/types/db.ts` with `Database` interface, row/`New*`/`*Update` types for all 9 tables. `SegmentoTable.pliego_id`; `AnalisisTable.pliego_ids` + 4 fields (`cost_usd`/`model_metadata: ModelMetadata|null`/`prompt_version`/`semaforo_rules_version`); `RequisitoTable.categoria: ColumnType<RequisitoCategoria, RequisitoCategoria, never>` (immutability — RN-016), `RequisitoTable.is_habilitante: boolean`, `RequisitoTable.is_habilitante_source: IsHabilitanteSource`, plus the 3 citation fields; `EmpresaTable.profile_updated_at: ColumnType<Date, never, never>`; `PromptCacheTable.pliego_id`. Declare canonical `ModelMetadata` interface here (re-exported via barrel; downstream `lib/extraction/types.ts` imports, never redeclares).
- [ ] Verify Task 5: TC-005, TC-030 (type-side) pass; `db.updateTable('requisito').set({ categoria: ... })` fails to compile; `db.insertInto('requisito').values({ categoria: 'juridico', ... })` compiles; `db.insertInto('empresa').values({ ..., profile_updated_at: ... })` and `db.updateTable('empresa').set({ profile_updated_at: ... })` both fail to compile (TC-022 type-side); `selectFrom('documento')` produces compile error; `NewSegmento` accepts an object without `is_synthetic`; `NewRequisito` accepts an object without `citation_verified`.

### T6: Barrel Exports + Typecheck Gate
- [ ] Implement Task 6: Write `src/types/index.ts` barrel exporting `Proceso*`, `Pliego*`, `AnexoProceso*`, all schemas (incl. `RequisitoExtractionPayloadSchema`/`RequisitoExtractionPayloadArraySchema`/`type RequisitoExtractionPayload`), the new Semaforo types (`Semaforo`/`SemaforoStats`/`RequisitoCategoria`/`IsHabilitanteSource`) and the habilitante runtime constants (`HABILITANTE_HEADING_PATTERNS`/`HABILITANTE_PATTERNS_VERSION`). Create `src/types/logger.ts` with `ExtractorLogger` interface (pure type, zero runtime). Re-export `ExtractorLogger` and `ModelMetadata` from the barrel. Configure `@/types` path alias in `tsconfig.json`. Legacy `Documento*` exports MUST NOT exist.
- [ ] Verify Task 6: TC-007, TC-031 pass; `npm run typecheck` exits 0 in strict mode in under 10s; `import { DocumentoSchema } from '@/types'` produces a TypeScript error; `import { type ExtractorLogger, RequisitoExtractionPayloadSchema, type RequisitoExtractionPayload, type Semaforo, type RequisitoCategoria, HABILITANTE_HEADING_PATTERNS } from '@/types'` resolves.

---

## Completion Summary

_Updated when all tasks are done._
