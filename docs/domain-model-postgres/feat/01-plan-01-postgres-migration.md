# T1: Postgres Migration

## Scope

- `supabase/migrations/20260428000002_auth_rls_and_trigger.sql` — DDL for all 9 tables, enums, constraints, trigger, and indexes

## Changes

### Table Creation Order

FK dependencies require this order:
1. `empresa`
2. `empresa_member` (FK → empresa, auth.users)
3. `proceso` (no FKs — standalone public record)
4. `pliego` (FK → proceso, empresa [uploaded_by_empresa_id nullable])
5. `anexo_proceso` (FK → proceso, empresa [uploaded_by_empresa_id nullable]) — independent of pliego
6. `segmento` (FK → pliego)
7. `analisis` (FK → proceso, empresa)
8. `requisito` (FK → analisis, segmento)
9. `prompt_cache` (FK → pliego, empresa)

### Custom Enum Types (Postgres)

```sql
CREATE TYPE analisis_estado AS ENUM ('pending','extracting','analyzing','completed','failed');
CREATE TYPE segmento_categoria AS ENUM ('juridico','financiero','tecnico','experiencia','general');
CREATE TYPE semaforo_color AS ENUM ('verde','amarillo','rojo');
CREATE TYPE modalidad_contratacion AS ENUM (
  'licitacion_publica','seleccion_abreviada','minima_cuantia',
  'concurso_meritos','contratacion_directa'
);
CREATE TYPE pliego_tipo AS ENUM (
  'pliego_condiciones','pliego_definitivo'
);
CREATE TYPE anexo_proceso_tipo AS ENUM (
  'anexo_tecnico','estudio_previo','resolucion','otro'
);
CREATE TYPE empresa_member_role AS ENUM ('owner','member');
```

### Key Table Constraints

- `empresa.nit`: UNIQUE
- `proceso.secop_process_number`: UNIQUE — one canonical row per public process
- `pliego.file_hash`: UNIQUE within `pliego` (RN-003 — independent dedup space from `anexo_proceso`)
- `pliego.file_hash`: CHECK(`length(file_hash) = 64`) — SHA-256 hex
- `pliego.tipo`: `pliego_tipo` enum (narrow — only `pliego_condiciones`/`pliego_definitivo`)
- `pliego.uploaded_by_empresa_id`: nullable FK — informational, not an ownership claim
- `pliego.deleted_at`: nullable timestamp — soft-delete only (RN-004)
- `anexo_proceso.file_hash`: UNIQUE within `anexo_proceso` (independent dedup space)
- `anexo_proceso.file_hash`: CHECK(`length(file_hash) = 64`)
- `anexo_proceso.tipo`: `anexo_proceso_tipo` enum
- `anexo_proceso.uploaded_by_empresa_id`: nullable FK
- `anexo_proceso.deleted_at`: nullable timestamp — soft-delete only (RN-004)
- `proceso`: no `deleted_at` column — public procurement processes are permanent (RN-004)
- `analisis.pliego_ids`: `uuid[]` — no length constraint; v1 always length=1
- `requisito.cumple`: nullable boolean — no NOT NULL constraint (RN-002)
- `segmento.page_range_start`, `segmento.page_range_end`: `INT NOT NULL` — 1-indexed inclusive (RN-011)
- `segmento.heading_normalized`, `segmento.heading_original`: `TEXT NULL` — both null on synthetic segments (RN-010)
- `segmento.is_synthetic`: `BOOLEAN NOT NULL DEFAULT false`
- `requisito.citation_segment_id`: `UUID NOT NULL REFERENCES segmento(id)` (REQ-007, RN-013)
- `requisito.citation_quote`: `TEXT NOT NULL` with `CHECK (length(citation_quote) <= 200)` (REQ-007)
- `requisito.citation_verified`: `BOOLEAN NOT NULL DEFAULT false`
- `requisito.categoria`: `TEXT NOT NULL` with `CHECK (categoria IN ('juridico','financiero','tecnico','experiencia'))` (REQ-008, RN-016, RN-017)
- `requisito.is_habilitante`: `BOOLEAN NOT NULL` (REQ-009)
- `requisito.is_habilitante_source`: `TEXT NOT NULL` with `CHECK (is_habilitante_source IN ('structural','llm','manual'))` (REQ-009, RN-018)
- `analisis.cost_usd`: `NUMERIC(10,6) NULL`
- `analisis.model_metadata`: `JSONB NULL`
- `analisis.prompt_version`: `TEXT NULL` — denormalized from model_metadata for indexable queries
- `analisis.semaforo_rules_version`: `TEXT NULL` (REQ-010)
- `empresa.profile_updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (REQ-011, RN-014)
- All PK columns: `uuid DEFAULT gen_random_uuid()`
- All timestamp columns: `timestamptz DEFAULT now()`

### `segmento` CHECK Constraints (RN-010, RN-011)

```sql
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
```

Two heading constraints fire independently so error messages are precise. Together they enforce the RN-010 triple-equivalence: `is_synthetic ⇔ heading_normalized IS NULL ⇔ heading_original IS NULL`.

### `requisito` CHECK Constraints (RN-013, RN-017, RN-018)

```sql
CONSTRAINT requisito_citation_quote_length CHECK (
  length(citation_quote) <= 200
),
CONSTRAINT requisito_categoria_narrow CHECK (
  categoria IN ('juridico','financiero','tecnico','experiencia')
),
CONSTRAINT requisito_is_habilitante_source_valid CHECK (
  is_habilitante_source IN ('structural','llm','manual')
)
```

`requisito.categoria` uses TEXT + CHECK rather than a separate Postgres enum — the four values match the first four `segmento_categoria` values and a parallel enum would require casts on every cross-table join.

### `empresa.profile_updated_at` Trigger (RN-014)

```sql
CREATE OR REPLACE FUNCTION set_empresa_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Bump only when a watched column actually changed.
  -- Excluding profile_updated_at and updated_at from the dirty-check avoids
  -- self-recursion and spurious bumps from generic touch-updates.
  IF (
    NEW.nombre IS DISTINCT FROM OLD.nombre
    OR NEW.nit    IS DISTINCT FROM OLD.nit
  ) THEN
    NEW.profile_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER empresa_profile_updated_at_trigger
  BEFORE UPDATE ON empresa
  FOR EACH ROW
  EXECUTE FUNCTION set_empresa_profile_updated_at();
```

Dirty-check is explicit per-column (not `ROW(NEW.*) IS DISTINCT FROM ROW(OLD.*)`) so future additions to the empresa profile require an explicit decision: does this field invalidate the prompt cache? As of this revision the watched set is `{nombre, nit}`.

### Prompt Cache Unique Index

```sql
CREATE UNIQUE INDEX idx_prompt_cache_pliego_empresa
  ON prompt_cache(pliego_id, empresa_id);
```

### Indexes

```sql
-- Public record lookups
CREATE INDEX idx_proceso_secop_number ON proceso(secop_process_number);
CREATE INDEX idx_pliego_proceso_id ON pliego(proceso_id);
CREATE INDEX idx_pliego_tipo ON pliego(tipo);
CREATE INDEX idx_anexo_proceso_proceso_id ON anexo_proceso(proceso_id);
CREATE INDEX idx_anexo_proceso_tipo ON anexo_proceso(tipo);

-- Tenant queries
CREATE INDEX idx_analisis_proceso_id ON analisis(proceso_id);
CREATE INDEX idx_analisis_empresa_id ON analisis(empresa_id);
CREATE INDEX idx_requisito_analisis_id ON requisito(analisis_id);
CREATE INDEX idx_segmento_pliego_id ON segmento(pliego_id);
CREATE INDEX idx_empresa_member_user_id ON empresa_member(user_id);

-- Idempotency and deduplication (independent spaces per RN-003)
CREATE UNIQUE INDEX idx_pliego_file_hash ON pliego(file_hash);
CREATE UNIQUE INDEX idx_anexo_proceso_file_hash ON anexo_proceso(file_hash);
CREATE UNIQUE INDEX idx_proceso_secop_number_unique ON proceso(secop_process_number);

-- Soft-delete filter
CREATE INDEX idx_pliego_deleted_at ON pliego(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_anexo_proceso_deleted_at ON anexo_proceso(deleted_at) WHERE deleted_at IS NOT NULL;

-- Prompt cache TTL
CREATE INDEX idx_prompt_cache_expires_at ON prompt_cache(expires_at);
```

### Design Rationale

Migration is purely DDL + the trigger. No seed data. RLS policies are in a separate migration file (T2) so they can be reviewed independently and rolled back without touching table definitions. The trigger co-locates with the table definition because it is a structural invariant, not a security boundary — it must ship with the table for `profile_updated_at` to be useful at all.

## Dependencies

None — can run independently.

## Done When

- [ ] Migration file exists at the correct path under `supabase/migrations/`
- [ ] All 9 tables created with correct column types, nullability, and defaults
- [ ] All 7 custom enum types defined: `analisis_estado`, `segmento_categoria` (incl. `'general'`), `semaforo_color`, `modalidad_contratacion`, `pliego_tipo` (narrow), `anexo_proceso_tipo`, `empresa_member_role`
- [ ] `proceso` has no `deleted_at` column; `pliego` and `anexo_proceso` have nullable `deleted_at`
- [ ] UNIQUE constraints on `pliego.file_hash` and `anexo_proceso.file_hash` (independent dedup spaces)
- [ ] `analisis.pliego_ids` is `uuid[]`
- [ ] `segmento` carries 3 CHECK constraints (page-range, heading both-or-neither, synthetic ⟺ null heading)
- [ ] `requisito` carries `citation_segment_id` FK, `citation_quote` with length CHECK, `citation_verified` DEFAULT false
- [ ] `requisito` carries `requisito_categoria_narrow` CHECK, `is_habilitante BOOLEAN NOT NULL`, `requisito_is_habilitante_source_valid` CHECK
- [ ] `analisis` carries `cost_usd`, `model_metadata`, `prompt_version`, `semaforo_rules_version`
- [ ] `empresa` carries `profile_updated_at` and `empresa_profile_updated_at_trigger`
- [ ] All indexes created including `(pliego_id, empresa_id)` unique on `prompt_cache`
- [ ] `supabase db push` applies the migration to a local Supabase instance without errors
- [ ] TC-004, TC-011–013, TC-015–016, TC-018, TC-023–024, TC-029 pass
