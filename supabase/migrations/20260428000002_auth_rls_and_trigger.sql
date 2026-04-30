-- auth-and-tenancy: Enable RLS on all domain-model tables and define
-- bifurcated policies (empresa-private vs public-readable).
-- Depends on: domain-model migration (tables must exist first).

-- ============================================================
-- 1. Enable RLS on every table
-- ============================================================
ALTER TABLE public.empresa        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proceso        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pliego         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anexo_proceso  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segmento       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analisis       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisito      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_cache   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Empresa-private tables: analisis, requisito, prompt_cache
-- Predicate: user must be a member of the row's empresa.
-- ============================================================

-- analisis
CREATE POLICY "analisis_select" ON public.analisis
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.empresa_member em
    WHERE em.empresa_id = analisis.empresa_id
      AND em.user_id = auth.uid()
  ));

CREATE POLICY "analisis_insert" ON public.analisis
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.empresa_member em
    WHERE em.empresa_id = analisis.empresa_id
      AND em.user_id = auth.uid()
  ));

CREATE POLICY "analisis_update" ON public.analisis
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.empresa_member em
    WHERE em.empresa_id = analisis.empresa_id
      AND em.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.empresa_member em
    WHERE em.empresa_id = analisis.empresa_id
      AND em.user_id = auth.uid()
  ));

CREATE POLICY "analisis_delete" ON public.analisis
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.empresa_member em
    WHERE em.empresa_id = analisis.empresa_id
      AND em.user_id = auth.uid()
  ));

-- requisito
CREATE POLICY "requisito_select" ON public.requisito
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.analisis a
    JOIN public.empresa_member em ON em.empresa_id = a.empresa_id
    WHERE a.id = requisito.analisis_id
      AND em.user_id = auth.uid()
  ));

CREATE POLICY "requisito_insert" ON public.requisito
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.analisis a
    JOIN public.empresa_member em ON em.empresa_id = a.empresa_id
    WHERE a.id = requisito.analisis_id
      AND em.user_id = auth.uid()
  ));

CREATE POLICY "requisito_update" ON public.requisito
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.analisis a
    JOIN public.empresa_member em ON em.empresa_id = a.empresa_id
    WHERE a.id = requisito.analisis_id
      AND em.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.analisis a
    JOIN public.empresa_member em ON em.empresa_id = a.empresa_id
    WHERE a.id = requisito.analisis_id
      AND em.user_id = auth.uid()
  ));

CREATE POLICY "requisito_delete" ON public.requisito
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.analisis a
    JOIN public.empresa_member em ON em.empresa_id = a.empresa_id
    WHERE a.id = requisito.analisis_id
      AND em.user_id = auth.uid()
  ));

-- prompt_cache
CREATE POLICY "prompt_cache_select" ON public.prompt_cache
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.empresa_member em
    WHERE em.empresa_id = prompt_cache.empresa_id
      AND em.user_id = auth.uid()
  ));

CREATE POLICY "prompt_cache_insert" ON public.prompt_cache
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.empresa_member em
    WHERE em.empresa_id = prompt_cache.empresa_id
      AND em.user_id = auth.uid()
  ));

CREATE POLICY "prompt_cache_update" ON public.prompt_cache
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.empresa_member em
    WHERE em.empresa_id = prompt_cache.empresa_id
      AND em.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.empresa_member em
    WHERE em.empresa_id = prompt_cache.empresa_id
      AND em.user_id = auth.uid()
  ));

CREATE POLICY "prompt_cache_delete" ON public.prompt_cache
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.empresa_member em
    WHERE em.empresa_id = prompt_cache.empresa_id
      AND em.user_id = auth.uid()
  ));

-- ============================================================
-- 3. Public-readable tables: proceso, pliego, anexo_proceso, segmento
-- Any authenticated user can read/write (domain-model RN-008).
-- ============================================================

CREATE POLICY "proceso_select"  ON public.proceso  FOR SELECT TO authenticated USING (true);
CREATE POLICY "proceso_insert"  ON public.proceso  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "proceso_update"  ON public.proceso  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "pliego_select"   ON public.pliego   FOR SELECT TO authenticated USING (true);
CREATE POLICY "pliego_insert"   ON public.pliego   FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pliego_update"   ON public.pliego   FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anexo_proceso_select" ON public.anexo_proceso FOR SELECT TO authenticated USING (true);
CREATE POLICY "anexo_proceso_insert" ON public.anexo_proceso FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "anexo_proceso_update" ON public.anexo_proceso FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "segmento_select" ON public.segmento FOR SELECT TO authenticated USING (true);
CREATE POLICY "segmento_insert" ON public.segmento FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "segmento_update" ON public.segmento FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. Empresa and empresa_member: restricted access
-- ============================================================

-- empresa: any authenticated user can read; INSERT is trigger-only
CREATE POLICY "empresa_select" ON public.empresa
  FOR SELECT TO authenticated USING (true);

-- empresa_member: users can read their own membership records
CREATE POLICY "empresa_member_select" ON public.empresa_member
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 5. Empresa provisioning trigger
-- Fires after INSERT on auth.users; atomically creates empresa +
-- empresa_member(owner). SECURITY DEFINER allows INSERT on empresa
-- from the trigger context without exposing INSERT to anon clients.
-- SET search_path prevents search-path injection attacks.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
