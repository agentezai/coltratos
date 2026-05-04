# domain-model-primitives — Progress

## Tasks

- [x] T1: Type Primitives — branded IDs, enum const objects, 4 ADR files
  - `src/types/domain/primitives.ts` — 8 branded IDs, 9 enum consts + union types, `branded` helper
  - ADR-001, ADR-002, ADR-003, ADR-008 written to `.nybo/foundation/adrs/`
  - Tests: 10 unit (primitives.test.ts) + 8 type (primitives.test-d.ts) — all pass
- [x] T2: Zod Schemas — 8 entity schema files
  - empresa, proceso, pliego, anexo-proceso, segmento, analisis, requisito, prompt-cache
  - Tests: 43 unit — all pass (note: Zod v4 requires RFC-compliant UUIDs in test data)
- [x] T3: Kysely Types — Database interface (9 tables)
  - `src/types/db.ts` — 9 tables, ModelMetadata, Row/New/Update types for all
  - Type tests: 12 pass (Selectable, ColumnType immutability, ModelMetadata shape)
  - Fix: Kysely removes ColumnType<S,never,never> fields from Insertable/Updateable (toBeNever() inapplicable)
- [x] T4: Barrel + Typecheck Gate — src/types/index.ts
  - `src/types/index.ts` — exports primitives, 8 Zod schemas, 8 TS types, Database + Kysely helpers
  - Fixed stale `@ts-expect-error` in `tests/bootstrap.test.ts` (barrel now exists)
  - Type tests: 28 pass; unit tests: 89/89 pass
  - Typecheck: 0 errors, 2s (NFR-01 ✓)
