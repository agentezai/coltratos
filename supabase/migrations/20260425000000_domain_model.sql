-- domain-model-postgres T1: DDL for all 9 tables, enums, constraints, trigger, indexes.
-- Column names mirror Zod schema field names exactly (NFR-02, snake_case throughout).
-- RLS policies live in the next migration (20260428000002_auth_rls_and_trigger.sql).

-- ============================================================
-- 1. Custom Postgres enum types
-- ============================================================

CREATE TYPE analisis_estado AS ENUM (
  'pending', 'extracting', 'analyzing', 'completed', 'failed'
);

CREATE TYPE segmento_categoria AS ENUM (
  'juridico', 'financiero', 'tecnico', 'experiencia', 'general'
);

CREATE TYPE semaforo_color AS ENUM (
  'verde', 'amarillo', 'rojo'
);

CREATE TYPE modalidad_contratacion AS ENUM (
  'licitacion_publica', 'seleccion_abreviada', 'minima_cuantia',
  'concurso_meritos', 'contratacion_directa'
);

-- Narrow enum: only documents with requisitos habilitantes (ADR-008)
CREATE TYPE pliego_tipo AS ENUM (
  'pliego_condiciones', 'pliego_definitivo'
);

-- Non-pliego proceso documents
CREATE TYPE anexo_proceso_tipo AS ENUM (
  'anexo_tecnico', 'estudio_previo', 'resolucion', 'otro'
);

CREATE TYPE empresa_member_role AS ENUM (
  'owner', 'member'
);

-- ============================================================
-- 2. Tables (creation order respects FK dependencies)
-- ============================================================

-- 2.1 empresa
CREATE TABLE public.empresa (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              TEXT NOT NULL,
  nit                 TEXT NOT NULL UNIQUE,
  profile_updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 empresa_member (FK → empresa, auth.users)
CREATE TABLE public.empresa_member (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        empresa_member_role NOT NULL DEFAULT 'member',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, user_id)
);

-- 2.3 proceso (standalone public procurement record; no deleted_at per RN-004)
CREATE TABLE public.proceso (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secop_process_number  TEXT NOT NULL UNIQUE,
  entidad_contratante   TEXT NOT NULL,
  objeto                TEXT NOT NULL,
  modalidad             modalidad_contratacion NOT NULL,
  valor_estimado        NUMERIC(18,2) NULL,
  cronograma            JSONB NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 pliego (FK → proceso, empresa; soft-delete via deleted_at per RN-004)
CREATE TABLE public.pliego (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id              UUID NOT NULL REFERENCES public.proceso(id) ON DELETE RESTRICT,
  tipo                    pliego_tipo NOT NULL,
  file_path               TEXT NOT NULL,
  file_hash               TEXT NOT NULL UNIQUE,
  uploaded_by_empresa_id  UUID NULL REFERENCES public.empresa(id) ON DELETE SET NULL,
  page_count              INT NULL,
  deleted_at              TIMESTAMPTZ NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pliego_file_hash_length CHECK (length(file_hash) = 64)
);

-- 2.5 anexo_proceso (FK → proceso, empresa; independent dedup space from pliego per RN-003)
CREATE TABLE public.anexo_proceso (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id              UUID NOT NULL REFERENCES public.proceso(id) ON DELETE RESTRICT,
  tipo                    anexo_proceso_tipo NOT NULL,
  file_path               TEXT NOT NULL,
  file_hash               TEXT NOT NULL UNIQUE,
  uploaded_by_empresa_id  UUID NULL REFERENCES public.empresa(id) ON DELETE SET NULL,
  page_count              INT NULL,
  deleted_at              TIMESTAMPTZ NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT anexo_proceso_file_hash_length CHECK (length(file_hash) = 64)
);

-- 2.6 segmento (FK → pliego; triple-equivalence constraints per RN-005, RN-006)
CREATE TABLE public.segmento (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pliego_id           UUID NOT NULL REFERENCES public.pliego(id) ON DELETE CASCADE,
  categoria           segmento_categoria NOT NULL,
  contenido           TEXT NOT NULL,
  orden               INT NOT NULL,
  page_range_start    INT NOT NULL,
  page_range_end      INT NOT NULL,
  heading_normalized  TEXT NULL,
  heading_original    TEXT NULL,
  is_synthetic        BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT segmento_page_range_valid CHECK (
    page_range_start >= 1 AND page_range_start <= page_range_end
  ),
  CONSTRAINT segmento_heading_both_or_neither CHECK (
    (heading_normalized IS NULL AND heading_original IS NULL)
    OR (heading_normalized IS NOT NULL AND heading_original IS NOT NULL)
  ),
  CONSTRAINT segmento_synthetic_iff_null_heading CHECK (
    (is_synthetic = true  AND heading_normalized IS NULL)
    OR (is_synthetic = false AND heading_normalized IS NOT NULL)
  )
);

-- 2.7 analisis (FK → proceso, empresa; tenant-scoped)
CREATE TABLE public.analisis (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id            UUID NOT NULL REFERENCES public.proceso(id) ON DELETE RESTRICT,
  empresa_id            UUID NOT NULL REFERENCES public.empresa(id) ON DELETE RESTRICT,
  pliego_ids            UUID[] NOT NULL,
  estado                analisis_estado NOT NULL DEFAULT 'pending',
  semaforo              semaforo_color NULL,
  error_message         TEXT NULL,
  cost_usd              NUMERIC(10,6) NULL,
  model_metadata        JSONB NULL,
  prompt_version        TEXT NULL,
  semaforo_rules_version TEXT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at          TIMESTAMPTZ NULL
);

-- 2.8 requisito (FK → analisis, segmento; citation contract per RN-013)
-- categoria uses TEXT + CHECK rather than enum to avoid cross-table cast friction (ADR-note)
CREATE TABLE public.requisito (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analisis_id           UUID NOT NULL REFERENCES public.analisis(id) ON DELETE CASCADE,
  segmento_id           UUID NOT NULL REFERENCES public.segmento(id) ON DELETE RESTRICT,
  categoria             TEXT NOT NULL,
  descripcion           TEXT NOT NULL,
  cumple                BOOLEAN NULL,
  semaforo              semaforo_color NOT NULL,
  justificacion         TEXT NULL,
  is_habilitante        BOOLEAN NOT NULL,
  is_habilitante_source TEXT NOT NULL,
  citation_segment_id   UUID NOT NULL REFERENCES public.segmento(id) ON DELETE RESTRICT,
  citation_quote        TEXT NOT NULL,
  citation_verified     BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT requisito_citation_quote_length CHECK (
    length(citation_quote) <= 200
  ),
  CONSTRAINT requisito_categoria_narrow CHECK (
    categoria IN ('juridico', 'financiero', 'tecnico', 'experiencia')
  ),
  CONSTRAINT requisito_is_habilitante_source_valid CHECK (
    is_habilitante_source IN ('structural', 'llm', 'manual')
  )
);

-- 2.9 prompt_cache (FK → pliego, empresa)
CREATE TABLE public.prompt_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pliego_id     UUID NOT NULL REFERENCES public.pliego(id) ON DELETE CASCADE,
  empresa_id    UUID NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  hash          TEXT NOT NULL,
  prompt_tokens INT NOT NULL,
  cached_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL
);

-- ============================================================
-- 3. empresa.profile_updated_at trigger (RN-014)
--    Fires BEFORE UPDATE; bumps only when watched columns change.
--    Dirty-check is explicit per-column to make future additions deliberate.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_empresa_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    NEW.nombre IS DISTINCT FROM OLD.nombre
    OR NEW.nit IS DISTINCT FROM OLD.nit
  ) THEN
    NEW.profile_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER empresa_profile_updated_at_trigger
  BEFORE UPDATE ON public.empresa
  FOR EACH ROW
  EXECUTE FUNCTION public.set_empresa_profile_updated_at();

-- ============================================================
-- 4. Indexes
-- ============================================================

-- Public record lookups
CREATE INDEX idx_proceso_secop_number       ON public.proceso(secop_process_number);
CREATE INDEX idx_pliego_proceso_id          ON public.pliego(proceso_id);
CREATE INDEX idx_pliego_tipo                ON public.pliego(tipo);
CREATE INDEX idx_anexo_proceso_proceso_id   ON public.anexo_proceso(proceso_id);
CREATE INDEX idx_anexo_proceso_tipo         ON public.anexo_proceso(tipo);

-- Tenant queries
CREATE INDEX idx_analisis_proceso_id        ON public.analisis(proceso_id);
CREATE INDEX idx_analisis_empresa_id        ON public.analisis(empresa_id);
CREATE INDEX idx_requisito_analisis_id      ON public.requisito(analisis_id);
CREATE INDEX idx_segmento_pliego_id         ON public.segmento(pliego_id);
CREATE INDEX idx_empresa_member_user_id     ON public.empresa_member(user_id);

-- Soft-delete filter indexes
CREATE INDEX idx_pliego_deleted_at          ON public.pliego(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_anexo_proceso_deleted_at   ON public.anexo_proceso(deleted_at) WHERE deleted_at IS NOT NULL;

-- Prompt cache dedup + TTL
CREATE UNIQUE INDEX idx_prompt_cache_pliego_empresa ON public.prompt_cache(pliego_id, empresa_id);
CREATE INDEX idx_prompt_cache_expires_at    ON public.prompt_cache(expires_at);
