# T3: Create Public Tables (procesos, procesos_index)

## Scope

- `supabase/migrations/20260504000003_public_tables.sql` — DDL for procesos and procesos_index

## Changes

### procesos table

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `numero_proceso text UNIQUE NOT NULL` — SECOP II process identifier; globally unique, format varies by modalidad and year (do NOT validate format)
- `entidad text NOT NULL` — Colombian state body publishing the Proceso
- `objeto_a_contratar text NOT NULL` — description of what is being contracted
- `modalidad text NOT NULL` — Licitación Pública, Selección Abreviada, Mínima Cuantía, etc.
- `valor_estimado numeric(18,2)` — nullable; not all Procesos publish an estimated value
- `fecha_apertura timestamptz` — nullable (may not be published)
- `fecha_cierre timestamptz` — nullable
- `datos_gov_snapshot jsonb NOT NULL` — full datos.gov.co API response at the time the Proceso was fetched; `'{}'` for manually-entered Procesos
- `proceso_lookup_status text NOT NULL CHECK (proceso_lookup_status IN ('verified','unverified','failed'))` — reflects whether the datos.gov.co lookup succeeded
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- **No `company_id`** — this table is shared infrastructure
- `ALTER TABLE procesos ENABLE ROW LEVEL SECURITY` — policy grants SELECT to `authenticated` (no empresa filter); INSERT/UPDATE to `authenticated` in v1

### procesos_index table

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `numero_proceso text UNIQUE NOT NULL` — maps to `procesos.numero_proceso` (not a FK — sync job may insert before `procesos` row exists)
- `entidad text NOT NULL`
- `objeto_a_contratar text NOT NULL`
- `modalidad text NOT NULL`
- `cuantia_proceso numeric(18,2)` — nullable
- `fecha_de_publicacion_del_proceso timestamptz`
- `fecha_limite_de_recepcion timestamptz`
- `embedding vector(1536)` — OpenAI `text-embedding-3-small` output; nullable (rows without embedding are valid but excluded from vector search)
- `synced_at timestamptz NOT NULL DEFAULT now()` — last sync timestamp
- **No `company_id`** — publicly readable by any authenticated user
- `ALTER TABLE procesos_index ENABLE ROW LEVEL SECURITY` — policy grants SELECT to `authenticated`; INSERT/UPDATE to service role only

### Design Rationale (Public Tables Isolation)

`procesos` and `procesos_index` are the only tables with no `company_id`. Isolating them in a separate migration makes the "public vs tenant-scoped" split explicit in the file structure and prevents accidentally adding a `company_id` column via a future merge conflict.

## Dependencies

Requires T1 — `vector(1536)` column type requires pgvector extension.

## Done When

- [ ] `supabase/migrations/20260504000003_public_tables.sql` exists
- [ ] `procesos` table created with all columns including `datos_gov_snapshot jsonb NOT NULL`
- [ ] `procesos.proceso_lookup_status` CHECK constraint present: `('verified','unverified','failed')`
- [ ] `procesos.numero_proceso` UNIQUE constraint present
- [ ] `procesos_index` table created with `embedding vector(1536)` column
- [ ] `procesos_index.numero_proceso` UNIQUE constraint present
- [ ] `ENABLE ROW LEVEL SECURITY` on both tables
- [ ] No `company_id` column on either table
- [ ] Migration applies cleanly after T1 (`supabase db push` no errors)
- [ ] `SELECT column_name FROM information_schema.columns WHERE table_name = 'procesos_index' AND column_name = 'embedding'` returns 1 row
