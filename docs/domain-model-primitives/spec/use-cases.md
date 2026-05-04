# domain-model-primitives — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Engineer | Developer building a downstream feature who imports domain types and schemas |

---

## User Stories

### US-01 — Import runtime-validated domain schemas

**As an** Engineer
**I want** to import a Zod schema for any domain entity
**So that** I can parse and validate data at runtime without writing my own validation logic

### US-02 — Use TypeScript types from a single source

**As an** Engineer
**I want** TypeScript types inferred from the same Zod schemas
**So that** compile-time types and runtime validation never drift apart

### US-05 — Write typed DB queries with Kysely

**As an** Engineer
**I want** a `Database` interface that maps every table name to its row and insert types
**So that** Kysely queries are fully typed without manual casts

---

## Use Case Scenarios

### UC-01 — Define & validate domain entities (US-01, US-02)

**Preconditions:** `domain-model-primitives` is implemented; `src/types/index.ts` is importable

#### Main Scenario

1. Engineer adds `import { PliegoSchema, type Pliego } from '@/types'` to a service file.
2. Engineer calls `PliegoSchema.parse(rawInput)` on untrusted data.
3. Zod validates all fields including `file_hash` (non-empty string), `tipo` (enum restricted to `pliego_condiciones | pliego_definitivo`), and `deleted_at` (nullable date).
4. If valid, the inferred `Pliego` type is returned; the engineer uses it without additional casting.
5. `npm run typecheck` passes — the `Pliego` type matches the Kysely row type exactly.

#### Alternative Scenarios

**1a. Invalid input**
Zod throws a `ZodError`; the service layer catches it and returns a 400 response. No downstream processing occurs.

**1b. Invalid `tipo` value**
`PliegoSchema.parse({ ..., tipo: 'anexo_tecnico' })` throws a `ZodError` — `anexo_tecnico` is not in the narrow `PliegoTipo` enum.

#### Error Scenarios

**1e. Schema field mismatch**
If a Postgres column is added without updating the Zod schema, `npm run typecheck` fails at the Kysely interface boundary — this is the intended safety net.

**Postconditions:** Runtime data is validated and typed; invalid data never reaches business logic.

---

### UC-02 — Query with type safety (US-05)

**Preconditions:** Kysely is installed; `src/types/db.ts` is imported

#### Main Scenario

1. Engineer creates a Kysely query: `db.selectFrom('analisis').where('empresa_id', '=', id).selectAll().execute()`.
2. Kysely resolves the return type to `Selectable<AnalisisTable>[]` via the `Database` interface.
3. TypeScript enforces that `empresa_id` is a valid column name on `AnalisisTable` and that `id` is the correct `EmpresaId` branded type.
4. No `as` casts are needed; autocomplete works for all column names.

#### Alternative Scenarios

**2a. Query against a public table**
`db.selectFrom('pliego').where('proceso_id', '=', procesoId).selectAll().execute()` resolves to `Selectable<PliegoTable>[]`. Writing `.where('empresa_id', '=', id)` against `pliego` fails at compile time — `PliegoTable` has no `empresa_id` column.

#### Error Scenarios

**2e. Column name typo**
TypeScript compilation fails with "Property does not exist on type 'AnalisisTable'". Error caught at build time.

**2f. Attempting to UPDATE `requisito.categoria`**
TypeScript compilation fails — `categoria` is typed as `ColumnType<RequisitoCategoria, RequisitoCategoria, never>` (RN-016), so the update side resolves to `never`. Recategorization must go through the orchestrator's invalidate-and-re-extract path.

**2g. Attempting to INSERT or UPDATE `empresa.profile_updated_at`**
TypeScript compilation fails — column is `ColumnType<Date, never, never>`; only the Postgres trigger may write it.

**Postconditions:** DB queries are type-safe; runtime type errors from column name mismatches are impossible. Compile-time enforcement covers immutability invariants on `requisito.categoria` and `empresa.profile_updated_at`.

---

## UX/UI References

No UI in this spec. See [spec.md](./spec.md) for architecture details.
