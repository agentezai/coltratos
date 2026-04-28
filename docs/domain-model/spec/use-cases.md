# domain-model — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Engineer | Developer building a downstream feature who imports domain types and schemas |
| DB Admin | Developer or CI pipeline applying Supabase migrations |
| Authenticated User | End user (empresa owner or member) querying data via Supabase client |
| System | Automated processes (extraction pipeline, analysis runner) writing domain records |

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

### US-03 — Apply a versioned Postgres migration

**As a** DB Admin
**I want** a single SQL migration file that creates all domain tables with correct constraints
**So that** I can reproduce the schema in any environment with one command

### US-04 — Guarantee tenant isolation without application code

**As an** Authenticated User
**I want** the database to automatically scope my queries to my empresa
**So that** I cannot accidentally (or maliciously) read another empresa's data

### US-05 — Write typed DB queries with Kysely

**As an** Engineer
**I want** a `Database` interface that maps every table name to its row and insert types
**So that** Kysely queries are fully typed without manual casts

---

## Use Case Scenarios

### UC-01 — Define & validate domain entities (US-01, US-02)

**Preconditions:** `domain-model` is installed; `src/types/index.ts` is importable

#### Main Scenario

1. Engineer adds `import { PliegoSchema, type Pliego } from '@/types'` to a service file.
2. Engineer calls `PliegoSchema.parse(rawInput)` on untrusted data.
3. Zod validates all fields including `hash` (non-empty string), `estado` (enum), and `deleted_at` (nullable date).
4. If valid, the inferred `Pliego` type is returned; the engineer uses it without additional casting.
5. `npm run typecheck` passes — the `Pliego` type matches the Kysely row type exactly.

#### Alternative Scenarios

**1a. Invalid input**
Zod throws a `ZodError`; the service layer catches it and returns a 400 response. No downstream processing occurs.

**1b. Engineer imports from a domain sub-path**
They import from `@/types/domain/pliego` directly. The same schema is returned; the barrel is the canonical entry point but sub-paths are valid.

#### Error Scenarios

**1e. Schema field mismatch**
If a Postgres column is added without updating the Zod schema, `npm run typecheck` fails at the Kysely interface boundary — this is the intended safety net.

**Postconditions:** Runtime data is validated and typed; invalid data never reaches business logic.

---

### UC-02 — Run database migration (US-03)

**Preconditions:** Supabase CLI is installed; a Supabase project is linked

#### Main Scenario

1. DB Admin runs `supabase db push` or `supabase migration up`.
2. Migration `20260425000000_domain_model.sql` is applied.
3. All 9 tables are created: `empresa`, `empresa_member`, `proceso`, `pliego`, `anexo_proceso`, `segmento`, `analisis`, `requisito`, `prompt_cache`.
4. FK constraints, unique indexes (`proceso.secop_process_number` global; `pliego.file_hash` global within `pliego`; `anexo_proceso.file_hash` global within `anexo_proceso` — independent dedup spaces per RN-003; `prompt_cache (pliego_id, empresa_id)` composite unique), and CHECK constraints (enum columns, narrow `requisito.categoria`, citation quote length, segmento triple-equivalence, page-range bounds, `is_habilitante_source` enum) are created.
5. Migration runs idempotently on a fresh database in under 5s.

#### Alternative Scenarios

**2a. Migration already applied**
Supabase migration tracker skips the file; no-op.

#### Error Scenarios

**2e. Conflicting table exists**
Migration fails with Postgres error. DB Admin inspects and resolves the conflict manually.

**Postconditions:** All domain tables exist with correct schema; subsequent migrations can reference these tables as a foundation.

---

### UC-03 — Enforce tenant isolation on empresa-private tables (US-04)

**Preconditions:** RLS migration applied; user is authenticated via Supabase Auth

> **Important:** RLS in this project is **bifurcated** (REQ-007 / RN-008). Public procurement records — `proceso`, `pliego`, `anexo_proceso`, `segmento` — are readable by **any** `authenticated` user regardless of empresa membership. Only `analisis`, `requisito`, and `prompt_cache` carry empresa-scoped policies. This use case targets the empresa-scoped tier; the public tier is verified by TC-008 and TC-017.

#### Main Scenario

1. Authenticated user (member of empresa A) queries `SELECT * FROM analisis` via Supabase JS client.
2. Supabase passes `auth.uid()` to the RLS policy.
3. Policy joins `empresa_member` (`empresa_id`, `user_id`) to determine which empresas `auth.uid()` belongs to.
4. Only rows where `analisis.empresa_id` matches one of the user's empresas are returned.
5. Empresa B's `analisis` rows are never included in the result set, even when both empresas have analyzed the same `proceso` (multiple empresas may independently analyze the same public proceso per RN-008; their verdicts remain private competitive intelligence).
6. The same RLS gating applies to `SELECT * FROM requisito` (joined through `analisis_id → analisis.empresa_id`) and `SELECT * FROM prompt_cache` (filtered on `empresa_id` directly).

#### Alternative Scenarios

**3a. Service role query**
System processes using the service role key bypass RLS. This is intentional for internal pipelines (e.g. the future `analisis-orchestration` server-side path); no user-facing code uses the service role.

**3b. User belongs to multiple empresas**
RLS returns `analisis` rows from all empresas the user is a member of. The application layer filters by the active empresa session.

**3c. Query against a public table**
A `SELECT * FROM proceso` (or `pliego`, `anexo_proceso`, `segmento`) by the same user returns **all** rows regardless of empresa membership — public tables grant `SELECT` to the `authenticated` role with no `empresa_member` join (REQ-011, RN-008). This is the intended behavior; competing empresas can independently inspect the same public procurement record.

#### Error Scenarios

**3e. RLS policy misconfigured**
Cross-tenant rows would appear in test assertions on `analisis`/`requisito`/`prompt_cache` — TC-006 and TC-009 catch this before production deployment.

**Postconditions:** Every authenticated query against an **empresa-scoped table** (`analisis`, `requisito`, `prompt_cache`) returns only rows whose `empresa_id` (directly or via join) belongs to the user's empresa(s). Queries against **public tables** (`proceso`, `pliego`, `anexo_proceso`, `segmento`) return all rows for any authenticated user.

---

### UC-04 — Query with type safety (US-05)

**Preconditions:** Kysely is installed; `src/types/db.ts` is imported

#### Main Scenario

1. Engineer creates a Kysely query against an empresa-scoped table: `db.selectFrom('analisis').where('empresa_id', '=', id).selectAll().execute()`.
2. Kysely resolves the return type to `Selectable<AnalisisTable>[]` via the `Database` interface.
3. TypeScript enforces that `empresa_id` is a valid column name on `AnalisisTable` and that `id` is the correct UUID type.
4. No `as` casts are needed; autocomplete works for all column names.

#### Alternative Scenarios

**4a. Query against a public table**
`db.selectFrom('pliego').where('proceso_id', '=', procesoId).selectAll().execute()` resolves to `Selectable<PliegoTable>[]`. Note: `PliegoTable` has no `empresa_id` column (only the informational `uploaded_by_empresa_id`); writing `.where('empresa_id', '=', id)` against `pliego` would fail at compile time.

#### Error Scenarios

**4e. Column name typo**
TypeScript compilation fails with "Property 'empresa_idd' does not exist on type 'AnalisisTable'". Error is caught at build time.

**4f. Attempting to UPDATE `requisito.categoria`**
TypeScript compilation fails — `categoria` is typed as `ColumnType<RequisitoCategoria, RequisitoCategoria, never>` per RN-016, so the update side resolves to `never`. Recategorization must go through the orchestrator's invalidate-and-re-extract path (TC-030).

**Postconditions:** DB queries are type-safe; runtime type errors from column name mismatches are impossible. Compile-time enforcement extends to immutability invariants on `requisito.categoria` and `empresa.profile_updated_at`.

---

## UX/UI References

No UI in this spec. See [spec.md](./spec.md) for architecture diagrams.
