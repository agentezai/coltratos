# domain-model-postgres — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| DB Admin | Developer or CI pipeline applying Supabase migrations |
| Authenticated User | End user (empresa owner or member) querying data via Supabase client |

---

## User Stories

### US-03 — Apply a versioned Postgres migration

**As a** DB Admin
**I want** a single SQL migration file that creates all domain tables with correct constraints
**So that** I can reproduce the schema in any environment with one command

### US-04 — Guarantee tenant isolation without application code

**As an** Authenticated User
**I want** the database to automatically scope my queries to my empresa
**So that** I cannot accidentally (or maliciously) read another empresa's data

---

## Use Case Scenarios

### UC-01 — Run database migration (US-03)

**Preconditions:** Supabase CLI is installed; a Supabase project is linked

#### Main Scenario

1. DB Admin runs `supabase db push` or `supabase migration up`.
2. Migration `20260425000000_domain_model.sql` is applied.
3. All 9 tables are created: `empresa`, `empresa_member`, `proceso`, `pliego`, `anexo_proceso`, `segmento`, `analisis`, `requisito`, `prompt_cache`.
4. FK constraints, unique indexes (`proceso.secop_process_number` global; `pliego.file_hash` within `pliego`; `anexo_proceso.file_hash` within `anexo_proceso` — independent dedup spaces; `prompt_cache (pliego_id, empresa_id)` composite unique), and CHECK constraints (enum columns, narrow `requisito.categoria`, citation quote length, segmento triple-equivalence, page-range bounds, `is_habilitante_source` enum) are created.
5. Trigger `set_empresa_profile_updated_at()` is installed on `empresa`.
6. RLS policies are applied to all 9 tables.
7. Migration runs idempotently on a fresh database in under 5s.

#### Alternative Scenarios

**1a. Migration already applied**
Supabase migration tracker skips the file; no-op.

#### Error Scenarios

**1e. Conflicting table exists**
Migration fails with Postgres error. DB Admin inspects and resolves the conflict manually.

**Postconditions:** All domain tables exist with correct schema; subsequent migrations can reference these tables as a foundation.

---

### UC-02 — Enforce tenant isolation on empresa-private tables (US-04)

**Preconditions:** RLS migration applied; user is authenticated via Supabase Auth

> **Important:** RLS is **bifurcated**. Public procurement records — `proceso`, `pliego`, `anexo_proceso`, `segmento` — are readable by **any** `authenticated` user regardless of empresa membership. Only `analisis`, `requisito`, and `prompt_cache` carry empresa-scoped policies.

#### Main Scenario

1. Authenticated user (member of empresa A) queries `SELECT * FROM analisis` via Supabase JS client.
2. Supabase passes `auth.uid()` to the RLS policy.
3. Policy joins `empresa_member` (`empresa_id`, `user_id`) to determine which empresas `auth.uid()` belongs to.
4. Only rows where `analisis.empresa_id` matches one of the user's empresas are returned.
5. Empresa B's `analisis` rows are never included, even when both empresas analyzed the same `proceso`.
6. Same gating applies to `requisito` (joined through `analisis_id → analisis.empresa_id`) and `prompt_cache` (filtered on `empresa_id` directly).

#### Alternative Scenarios

**2a. Service role query**
Internal pipelines using the service role key bypass RLS. No user-facing code uses the service role.

**2b. User belongs to multiple empresas**
RLS returns `analisis` rows from all empresas the user is a member of. Application layer filters by active empresa session.

**2c. Query against a public table**
`SELECT * FROM proceso` (or `pliego`, `anexo_proceso`, `segmento`) returns **all** rows regardless of empresa membership — public tables grant SELECT to the `authenticated` role with no `empresa_member` join. Competing empresas can independently inspect the same public procurement record.

#### Error Scenarios

**2e. RLS policy misconfigured**
Cross-tenant rows appear in test assertions on `analisis`/`requisito`/`prompt_cache` — TC-004 and TC-007 catch this before production deployment.

**Postconditions:** Every authenticated query against empresa-scoped tables returns only rows belonging to the user's empresa(s). Queries against public tables return all rows for any authenticated user.

---

## UX/UI References

No UI in this spec. See [spec.md](./spec.md) for architecture details.
