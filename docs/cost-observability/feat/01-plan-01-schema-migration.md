# T1: Schema Migration — domain-model-mvp rev 2

## Scope

- `supabase/migrations/2026050500000_telemetry_tables.sql` — new migration adding the three telemetry tables
- `src/types/telemetry.ts` — TypeScript types for `analysis_events`, `embedding_events`, `search_events` rows

## Changes

### New migration: telemetry tables

- Create `analysis_events` table:
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE`
  - `event_type text NOT NULL CHECK (event_type IN ('extraction', 'repair_retry', 'ocr_fallback', 'matching', 'ingestion'))`
  - `stage text NOT NULL CHECK (stage IN ('ingestion', 'extraction', 'matching'))`
  - `started_at timestamptz`
  - `completed_at timestamptz`
  - `input_tokens int`
  - `output_tokens int`
  - `cached_tokens int`
  - `uncached_tokens int`
  - `cost_usd numeric(10,6)`
  - `model text`
  - `metadata jsonb NOT NULL DEFAULT '{}'`
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - No UPDATE path — enforced by convention; no trigger needed at MVP scale
- Create `embedding_events` table:
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `company_id uuid REFERENCES companies(id) ON DELETE SET NULL` — nullable (sync calls have no company)
  - `use_case text NOT NULL CHECK (use_case IN ('sync', 'search_query'))`
  - `input_tokens int NOT NULL`
  - `cost_usd numeric(10,6) NOT NULL`
  - `model text NOT NULL`
  - `created_at timestamptz NOT NULL DEFAULT now()`
- Create `search_events` table:
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE`
  - `query_text text NOT NULL`
  - `filters jsonb NOT NULL DEFAULT '{}'`
  - `result_count int NOT NULL DEFAULT 0`
  - `clicked_ids uuid[] NOT NULL DEFAULT '{}'`
  - `created_at timestamptz NOT NULL DEFAULT now()`
- Apply `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all three tables at creation time (per ADR-003).
- RLS policy for `analysis_events`: read scoped via join to `analyses.company_id = get_my_company_id()`. Write via service-role only (pipeline uses service-role client).
- RLS policy for `embedding_events`: pilot reads blocked entirely (`USING (false)` for `anon`/`authenticated` role); admin reads via service-role client.
- RLS policy for `search_events`: read scoped by `company_id = get_my_company_id()`. Write via service-role only.
- Add indexes: `btree` on `analysis_events(analysis_id)`, `analysis_events(created_at)`, `embedding_events(created_at)`, `search_events(company_id)`, `search_events(created_at)`.

### TypeScript types

- Add to `src/types/telemetry.ts`:
  - `AnalysisEventRow` — column-level TypeScript type matching `analysis_events`
  - `EmbeddingEventRow` — column-level type matching `embedding_events`
  - `SearchEventRow` — column-level type matching `search_events`
  - `AnalysisEventInsert` — input type for inserts (omits `id`, `created_at`)
  - `EmbeddingEventInsert`, `SearchEventInsert` — same pattern
- Export from `src/types/index.ts` (or barrel).

### Design Rationale (Single Responsibility)

Schema and types are isolated in T1 so downstream tasks (T2–T6) can import stable types without
waiting for wiring or dashboard implementation.

## Dependencies

None — foundational task.

## Done When

- [ ] Migration file exists at `supabase/migrations/2026050500000_telemetry_tables.sql`
- [ ] `supabase db push` applies the migration cleanly on a fresh project without error
- [ ] `analysis_events`, `embedding_events`, `search_events` tables exist with all specified columns and CHECK constraints
- [ ] RLS is enabled on all three tables; `analysis_events` read policy joins through `analyses.company_id`
- [ ] TypeScript types compile without errors
- [ ] `btree` indexes on FK and `created_at` columns are created
