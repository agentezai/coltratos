# T3: RLS + Empresa Provisioning Migration

## Scope

- `supabase/migrations/<timestamp>_auth_rls_and_trigger.sql` — New migration

## Changes

### Enable RLS on all tables

```sql
ALTER TABLE public.empresa           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_member    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proceso           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pliego            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anexo_proceso     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segmento          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analisis          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisito         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_cache      ENABLE ROW LEVEL SECURITY;
```

### Empresa-private table policies (`analisis`, `requisito`, `prompt_cache`)

For each of the three empresa-private tables, create four policies using the membership predicate:

```sql
-- Pattern repeated for analisis, requisito, prompt_cache
CREATE POLICY "<table>_select" ON public.<table>
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.empresa_member em
    WHERE em.empresa_id = <table>.empresa_id
      AND em.user_id = auth.uid()
  ));

CREATE POLICY "<table>_insert" ON public.<table>
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.empresa_member em
    WHERE em.empresa_id = <table>.empresa_id
      AND em.user_id = auth.uid()
  ));

CREATE POLICY "<table>_update" ON public.<table>
  FOR UPDATE TO authenticated
  USING (EXISTS (...)) WITH CHECK (EXISTS (...));

CREATE POLICY "<table>_delete" ON public.<table>
  FOR DELETE TO authenticated
  USING (EXISTS (...));
```

### Public table policies (`proceso`, `pliego`, `anexo_proceso`, `segmento`)

```sql
-- Pattern repeated for all four public tables
CREATE POLICY "<table>_select_authenticated" ON public.<table>
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "<table>_insert_authenticated" ON public.<table>
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "<table>_update_authenticated" ON public.<table>
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
```

### Empresa + empresa_member policies

```sql
-- empresa: readable by authenticated; INSERT only via trigger (supabase_auth_admin)
CREATE POLICY "empresa_select" ON public.empresa
  FOR SELECT TO authenticated USING (true);

-- empresa_member: members can read their own membership
CREATE POLICY "empresa_member_select" ON public.empresa_member
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

### Empresa provisioning trigger

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_empresa_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.empresa (id, created_at)
    VALUES (v_empresa_id, now());

  INSERT INTO public.empresa_member (empresa_id, user_id, role)
    VALUES (v_empresa_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

> `SECURITY DEFINER` lets the function insert into `empresa` with elevated privileges. `SET search_path = public` prevents search-path injection.

### Design Rationale (Defense in Depth)

The trigger uses `SECURITY DEFINER` so that INSERT on `empresa` can be restricted to the trigger context — no application code or anon-key client can insert empresa rows directly. Combined with RLS, this means empresa creation is exclusively atomic with auth-user creation.

## Dependencies

None — pure SQL. Runs after the domain-model migration that created the tables.

## Done When

- [ ] Migration file exists in `supabase/migrations/` with correct timestamp prefix
- [ ] `supabase db reset` applies the migration without errors on local stack
- [ ] `handle_new_user` function and `on_auth_user_created` trigger exist in the local DB
- [ ] TC-001: signup creates empresa + empresa_member rows (integration test passes)
- [ ] TC-007: cross-tenant SELECT on analisis returns only own rows (integration test passes)
- [ ] TC-008: cross-tenant SELECT on requisito returns only own rows (integration test passes)
- [ ] TC-009: proceso SELECT returns row regardless of which empresa inserted it (integration test passes)
