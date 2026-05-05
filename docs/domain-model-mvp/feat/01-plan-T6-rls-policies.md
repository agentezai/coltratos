# T6: RLS Policies for All Tenant Tables

## Scope

- `supabase/migrations/20260504000006_rls_policies.sql` — CREATE POLICY statements for all tables

## Changes

### Helper function (optional but recommended)

- Create `get_my_company_id()` function: `RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT company_id FROM users WHERE id = auth.uid() $$`
- Using a function avoids repeating the subquery in every policy and enables query planning to inline it
- Mark `SECURITY DEFINER` so the function runs with the definer's privileges — necessary because `users` itself has RLS

### companies policies

- `SELECT`: users can see their own company: `USING (id = get_my_company_id())`
- No INSERT policy (companies created by admin/onboarding via service role)
- No UPDATE policy in v1

### users policies

- `SELECT`: users can see themselves: `USING (id = auth.uid())`
- INSERT: onboarding flow via service role; no user-level INSERT policy in v1

### company_profiles policies

- `SELECT`: `USING (company_id = get_my_company_id())`
- `INSERT`: `WITH CHECK (company_id = get_my_company_id())`
- `UPDATE`: `USING (company_id = get_my_company_id())`

### procesos policies

- `SELECT`: `USING (auth.role() = 'authenticated')` — any authenticated user can read any Proceso
- `INSERT`: `WITH CHECK (auth.role() = 'authenticated')` — any authenticated user can create a Proceso (lookup flow)
- `UPDATE`: `WITH CHECK (auth.role() = 'authenticated')` — any authenticated user can update proceso metadata (re-lookup flow)

### procesos_index policies

- `SELECT`: `USING (auth.role() = 'authenticated')` — any authenticated user can query the discovery index
- No INSERT/UPDATE from client — sync job uses service role

### pliego_uploads policies

- `SELECT`: `USING (uploaded_by_company_id = get_my_company_id())`
- `INSERT`: `WITH CHECK (uploaded_by_company_id = get_my_company_id())`
- No UPDATE/DELETE from client in v1 (status changes via service role)

### analyses policies

- `SELECT`: `USING (company_id = get_my_company_id())`
- `INSERT`: `WITH CHECK (company_id = get_my_company_id())`
- No UPDATE from client — pipeline uses service role for estado transitions

### requisitos policies

- `SELECT`: join to analyses: `USING (EXISTS (SELECT 1 FROM analyses a WHERE a.id = analysis_id AND a.company_id = get_my_company_id()))`
- `INSERT`: `WITH CHECK (EXISTS (SELECT 1 FROM analyses a WHERE a.id = analysis_id AND a.company_id = get_my_company_id()))`

### verdicts policies

- `SELECT`: join chain via requisitos to analyses: `USING (EXISTS (SELECT 1 FROM requisitos r JOIN analyses a ON a.id = r.analysis_id WHERE r.id = requisito_id AND a.company_id = get_my_company_id()))`
- `INSERT`: same `WITH CHECK`

### Design Rationale (Policy Bifurcation per ADR-003)

Public tables (`procesos`, `procesos_index`) use role-only checks — no `company_id` join. Tenant tables use `get_my_company_id()` consistently. Deep-join policies on `requisitos` and `verdicts` are necessary because those tables have no direct `company_id` column — the tenant ownership chain is: `verdicts → requisitos → analyses.company_id`.

## Dependencies

Requires T2 (companies, users), T4 (pliego_uploads, analyses), T5 (requisitos, verdicts) to be created first.

## Done When

- [ ] `supabase/migrations/20260504000006_rls_policies.sql` exists
- [ ] `get_my_company_id()` function created
- [ ] Policies created for all 9 tables (companies, users, company_profiles, procesos, procesos_index, pliego_uploads, analyses, requisitos, verdicts)
- [ ] Cross-company read test passes: user of company A cannot read company B's `pliego_uploads` row
- [ ] Cross-company read test passes: user of company A cannot read company B's `analyses` row
- [ ] Cross-company read test passes: user of company A cannot read company B's `requisitos` or `verdicts`
- [ ] `procesos` SELECT returns same row to two users from different companies (shared table verified)
- [ ] Migration applies cleanly after T2 + T4 + T5
