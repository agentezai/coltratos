# T3: Postgres Migration

## Scope

- `supabase/migrations/20260425000000_domain_model.sql` — DDL for all 9 tables

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
- `anexo_proceso.tipo`: `anexo_proceso_tipo` enum (`anexo_tecnico`/`estudio_previo`/`resolucion`/`otro`)
- `anexo_proceso.uploaded_by_empresa_id`: nullable FK
- `anexo_proceso.deleted_at`: nullable timestamp — soft-delete only (RN-004)
- `proceso`: no `deleted_at` column — public procurement processes are permanent (RN-004)
- `analisis.pliego_ids`: `uuid[]` — no length constraint; v1 always length=1
- `requisito.cumple`: nullable boolean — no NOT NULL constraint (RN-002)
- `segmento.page_range_start`, `segmento.page_range_end`: `INT NOT NULL` — 1-indexed inclusive (RN-011)
- `segmento.heading_normalized`, `segmento.heading_original`: `TEXT NULL` — nullable; both null on synthetic segments (RN-010)
- `segmento.is_synthetic`: `BOOLEAN NOT NULL DEFAULT false` — explicit intent flag (RN-010)
- `requisito.citation_segment_id`: `UUID NOT NULL REFERENCES segmento(id)` — required citation source (REQ-013, RN-013)
- `requisito.citation_quote`: `TEXT NOT NULL` with `CHECK (length(citation_quote) <= 200)` — verbatim quote, length-bounded (REQ-013)
- `requisito.citation_verified`: `BOOLEAN NOT NULL DEFAULT false` — verifier verdict (REQ-013)
- `requisito.categoria`: `TEXT NOT NULL` with `CHECK (categoria IN ('juridico','financiero','tecnico','experiencia'))` — narrow enum, denormalized from segmento (REQ-018, RN-016, RN-017). Set at INSERT, never on UPDATE — enforcement is Kysely-side via `ColumnType<RequisitoCategoria, RequisitoCategoria, never>`; the DB does not need a trigger because no application code path UPDATEs this column.
- `requisito.is_habilitante`: `BOOLEAN NOT NULL` — knockout-rule input for semaforo-aggregation (REQ-019, semaforo RN-014)
- `requisito.is_habilitante_source`: `TEXT NOT NULL` with `CHECK (is_habilitante_source IN ('structural','llm','manual'))` — tier marker (REQ-019, RN-018)
- `analisis.cost_usd`: `NUMERIC(10,6) NULL` — populated post-extraction (REQ-014)
- `analisis.model_metadata`: `JSONB NULL` — populated post-extraction (REQ-014)
- `analisis.prompt_version`: `TEXT NULL` — denormalized from `model_metadata.prompt_version` for indexable queries
- `analisis.semaforo_rules_version`: `TEXT NULL` — populated post-aggregation by the orchestrator with `SEMAFORO_RULES_VERSION` (REQ-020). Nullable for analyses created before aggregation runs.
- `empresa.profile_updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` — auto-maintained by trigger (REQ-015, RN-014)
- All PK columns: `uuid DEFAULT gen_random_uuid()`
- All timestamp columns: `timestamptz DEFAULT now()`

### `segmento` CHECK constraints (RN-010, RN-011)

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

The two heading constraints are independent — each fires on its own violation — so error messages are precise. They jointly enforce the RN-010 triple-equivalence: `is_synthetic ⇔ heading_normalized IS NULL ⇔ heading_original IS NULL`.

### `requisito` CHECK constraints (RN-013, RN-017, RN-018)

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

The `requisito_categoria_narrow` CHECK is the DB-layer counterpart to RN-017 (narrow `RequisitoCategoria` vs wide `SegmentoCategoria`). Unlike `segmento.categoria` which uses the `segmento_categoria` enum (wide, includes `'general'`), `requisito.categoria` uses TEXT + CHECK rather than a separate `requisito_categoria` Postgres enum. Rationale: the four values are the same as the first four `segmento_categoria` values, and a parallel enum would force every cross-table query to cast between them. TEXT + CHECK keeps the comparison structurally simple (`requisito.categoria = segmento.categoria` works without casts) while preserving the narrow constraint.

The `requisito_is_habilitante_source_valid` CHECK enforces the three-tier vocabulary at the DB layer; `is_habilitante_source` is similarly TEXT + CHECK rather than a Postgres enum because the value set is small and unlikely to grow.

### `empresa.profile_updated_at` trigger (RN-014)

```sql
CREATE OR REPLACE FUNCTION set_empresa_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Bump only when a watched (non-timestamp) column actually changed.
  -- Excluding profile_updated_at from the dirty-check avoids self-recursion;
  -- excluding updated_at avoids spurious bumps from generic touch-updates.
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

The dirty-check is **explicit per-column** (not `ROW(NEW.*) IS DISTINCT FROM ROW(OLD.*)`) so adding a column later requires an explicit decision: should an edit to that column invalidate the prompt cache? The answer is yes for any column rendered into the cached prompt prefix, no for purely-internal columns. As of revision 4 the watched set is `{nombre, nit}`; future PRs adding profile fields (financial ratios, technical capacity, experience) MUST extend this dirty-check.

### prompt_cache uniqueness

```sql
CREATE UNIQUE INDEX idx_prompt_cache_pliego_empresa
  ON prompt_cache(pliego_id, empresa_id);
```

Cache key is SHA-256 of pliego content + prompt version, scoped per (pliego, empresa) pair.

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

### Design Rationale (Single Responsibility)

Migration is purely DDL + the one trigger function that owns `empresa.profile_updated_at`. No seed data. RLS policies are in a separate migration file (T4) so they can be reviewed independently and rolled back without touching table definitions. The trigger is co-located with the table definition (rather than in T4 with policies) because it's a structural invariant, not a security boundary — it would have to ship with the table for `profile_updated_at` to be useful at all.

## Dependencies

None — can run in parallel with T1 and T2.

## Done When

- [ ] Migration file exists at `supabase/migrations/20260425000000_domain_model.sql`
- [ ] All 9 tables created with correct column types, nullability, and defaults (incl. `pliego` and `anexo_proceso`)
- [ ] All 7 custom enum types defined: `analisis_estado`, `segmento_categoria` (incl. `'general'`), `semaforo_color`, `modalidad_contratacion`, `pliego_tipo` (narrow), `anexo_proceso_tipo`, `empresa_member_role`
- [ ] `proceso` has no `deleted_at` column; `pliego` and `anexo_proceso` have nullable `deleted_at`
- [ ] UNIQUE constraints on `pliego.file_hash` and `anexo_proceso.file_hash` (independent — TC-018)
- [ ] `analisis.pliego_ids` is `uuid[]`
- [ ] `segmento` has `page_range_start`, `page_range_end` (INT NOT NULL), `heading_normalized`, `heading_original` (TEXT NULL), `is_synthetic` (BOOL NOT NULL DEFAULT false)
- [ ] `segmento` carries the three CHECK constraints (page-range bounds; heading both-or-neither; synthetic ⇔ null heading)
- [ ] `requisito` carries `citation_segment_id` (FK to `segmento(id)`), `citation_quote` (TEXT NOT NULL), `citation_verified` (BOOLEAN NOT NULL DEFAULT false), and the `requisito_citation_quote_length` CHECK constraint
- [ ] `analisis` carries `cost_usd NUMERIC(10,6) NULL`, `model_metadata JSONB NULL`, `prompt_version TEXT NULL`
- [ ] `empresa` carries `profile_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` and the `empresa_profile_updated_at_trigger` is installed
- [ ] All indexes created including `(pliego_id, empresa_id)` unique on `prompt_cache`
- [ ] `requisito` carries `categoria TEXT NOT NULL` + `requisito_categoria_narrow` CHECK (REQ-018), `is_habilitante BOOLEAN NOT NULL` (REQ-019), and `is_habilitante_source TEXT NOT NULL` + `requisito_is_habilitante_source_valid` CHECK (REQ-019)
- [ ] `analisis` carries `semaforo_rules_version TEXT NULL` (REQ-020)
- [ ] TC-029 passes: `requisito` insert with `categoria = 'general'` rejected; `is_habilitante_source = 'auto'` rejected
- [ ] `supabase db push` applies the migration to a local Supabase instance without errors
- [ ] TC-004 passes: duplicate `file_hash` insert on `pliego` is rejected by Postgres; the same hash inserted into `anexo_proceso` succeeds (independent space)
- [ ] TC-011, TC-012, TC-013 pass: each `segmento` CHECK constraint correctly rejects its invalid combination
- [ ] TC-015 passes: insert into `pliego` with `tipo = 'anexo_tecnico'` rejected by Postgres enum; insert into `anexo_proceso` with same value succeeds
- [ ] TC-016 passes: `enum_range(NULL::anexo_proceso_tipo)` returns exactly the 4 anexo values
- [ ] TC-018 passes: AnexoProceso file_hash UNIQUE rejection within table; cross-table parallel insert into pliego succeeds
- [ ] TC-023 passes: `requisito` insert with `citation_quote` length 201 rejected by CHECK constraint
- [ ] TC-024 passes: trigger auto-bumps `empresa.profile_updated_at` on `UPDATE empresa SET nombre = ...`; no-op `UPDATE empresa SET profile_updated_at = profile_updated_at` does NOT bump
