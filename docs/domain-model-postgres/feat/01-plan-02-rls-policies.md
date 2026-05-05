# T2: RLS Policies

## Scope

- `supabase/migrations/20260428000002_auth_rls_and_trigger.sql` — Per-table RLS enabling + bifurcated policies (appended to or shipped with T1 migration)

## Changes

### Enable RLS on All 9 Tables

```sql
ALTER TABLE empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE proceso ENABLE ROW LEVEL SECURITY;
ALTER TABLE pliego ENABLE ROW LEVEL SECURITY;
ALTER TABLE anexo_proceso ENABLE ROW LEVEL SECURITY;
ALTER TABLE segmento ENABLE ROW LEVEL SECURITY;
ALTER TABLE analisis ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisito ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_cache ENABLE ROW LEVEL SECURITY;
```

### Public-Read Tables (Proceso, Pliego, AnexoProceso, Segmento)

`Proceso`, `Pliego`, and `AnexoProceso` are public procurement records. Any authenticated user can read them regardless of empresa membership. `Segmento` follows the same rule because segmentos are sections of public pliegos.

```sql
-- proceso: public-read for any authenticated user
CREATE POLICY proceso_select_authenticated ON proceso
  FOR SELECT TO authenticated USING (true);

CREATE POLICY proceso_insert_authenticated ON proceso
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY proceso_update_authenticated ON proceso
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- pliego: filter deleted_at on SELECT
CREATE POLICY pliego_select_authenticated ON pliego
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY pliego_insert_authenticated ON pliego
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY pliego_update_authenticated ON pliego
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- anexo_proceso: identical pattern to pliego
CREATE POLICY anexo_proceso_select_authenticated ON anexo_proceso
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY anexo_proceso_insert_authenticated ON anexo_proceso
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY anexo_proceso_update_authenticated ON anexo_proceso
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- segmento: public-read; segmentos belong to public pliegos
CREATE POLICY segmento_select_authenticated ON segmento
  FOR SELECT TO authenticated USING (true);

CREATE POLICY segmento_insert_authenticated ON segmento
  FOR INSERT TO authenticated WITH CHECK (true);
```

### Empresa-Scoped Tables (Analisis, Requisito, PromptCache)

These tables hold competitive intelligence — empresa A's eligibility verdict must be invisible to empresa B.

```sql
-- analisis: scoped by empresa_member join
CREATE POLICY analisis_select_member ON analisis
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM empresa_member WHERE empresa_id = analisis.empresa_id));

CREATE POLICY analisis_insert_member ON analisis
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM empresa_member WHERE empresa_id = analisis.empresa_id));

CREATE POLICY analisis_update_member ON analisis
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM empresa_member WHERE empresa_id = analisis.empresa_id))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM empresa_member WHERE empresa_id = analisis.empresa_id));

-- requisito: scoped via parent analisis
CREATE POLICY requisito_select_member ON requisito
  FOR SELECT TO authenticated
  USING (auth.uid() IN (
    SELECT em.user_id FROM empresa_member em
    JOIN analisis a ON a.empresa_id = em.empresa_id
    WHERE a.id = requisito.analisis_id
  ));

CREATE POLICY requisito_insert_member ON requisito
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT em.user_id FROM empresa_member em
    JOIN analisis a ON a.empresa_id = em.empresa_id
    WHERE a.id = requisito.analisis_id
  ));

-- prompt_cache: empresa_id directly available
CREATE POLICY prompt_cache_select_member ON prompt_cache
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM empresa_member WHERE empresa_id = prompt_cache.empresa_id));

CREATE POLICY prompt_cache_insert_member ON prompt_cache
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM empresa_member WHERE empresa_id = prompt_cache.empresa_id));
```

### Empresa & Empresa-Member Tables

```sql
-- empresa: SELECT only if user is a member
CREATE POLICY empresa_select_member ON empresa
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM empresa_member WHERE empresa_id = empresa.id));

-- empresa_member: own rows + rows in empresas where user is owner
CREATE POLICY empresa_member_select ON empresa_member
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM empresa_member em
      WHERE em.empresa_id = empresa_member.empresa_id AND em.role = 'owner'
    )
  );
```

### Hard-Delete Prevention on Pliego and AnexoProceso

```sql
CREATE POLICY pliego_no_hard_delete ON pliego
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

CREATE POLICY anexo_proceso_no_hard_delete ON anexo_proceso
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);
```

DELETE always fails for authenticated users on `pliego` and `anexo_proceso`. Service processes use service role for soft-delete (`UPDATE deleted_at`). `Proceso` does not need hard-delete prevention — it has no `deleted_at` and deletion is not part of the model (RN-004).

### Design Rationale

RLS lives in a separate migration from DDL so that table structure and access control can be reviewed and rolled back independently. The bifurcation between public and empresa-scoped tables is the security model's cornerstone — public records cannot leak competitive intelligence because no empresa-private data lives in them.

## Dependencies

Requires T1 — tables must exist before RLS can be enabled on them.

## Done When

- [ ] RLS enabled on all 9 tables
- [ ] `proceso`, `pliego`, `anexo_proceso`, `segmento` have public-read policies (`USING (true)` for `authenticated`; `pliego`/`anexo_proceso` filter `deleted_at IS NULL`)
- [ ] `analisis`, `requisito`, `prompt_cache` join `empresa_member` for tenant scoping
- [ ] Hard-delete restrictive policies on `pliego` and `anexo_proceso`
- [ ] `supabase db push` applies both migrations without errors
- [ ] TC-006 passes: cross-tenant `analisis` SELECT returns zero rows for the wrong empresa
- [ ] TC-008 passes: `proceso` SELECT returns the same row to users of two different empresas
- [ ] TC-009 passes: empresa B cannot see empresa A's `analisis` for the same proceso
- [ ] TC-017 passes: `anexo_proceso` SELECT returns the same row to users of two different empresas
