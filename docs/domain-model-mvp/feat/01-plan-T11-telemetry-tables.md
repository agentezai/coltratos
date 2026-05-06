# T11: Create Telemetry Event Tables (analysis_events, embedding_events, search_events)

## Scope

- `supabase/migrations/20260505000011_telemetry_tables.sql` — DDL for the three append-only event tables required by cost-observability rev 2

## Changes

### analysis_events table (REQ-015, RN-019, RN-022)

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE` — CASCADE: if an analysis is ever removed, its events go with it; in practice analyses are retained indefinitely
- `event_type text NOT NULL CHECK (event_type IN ('extraction','repair_retry','ocr_fallback','matching'))` — controlled vocabulary per cost-observability REQ-001
- `stage text NOT NULL CHECK (stage IN ('ingestion','extraction','matching'))`
- `started_at timestamptz NOT NULL`
- `completed_at timestamptz NOT NULL`
- `input_tokens int NOT NULL DEFAULT 0`
- `output_tokens int NOT NULL DEFAULT 0`
- `cached_tokens int NOT NULL DEFAULT 0`
- `uncached_tokens int NOT NULL DEFAULT 0` — denormalized: `input_tokens - cached_tokens`; stored for query convenience
- `cost_usd numeric(10,6) NOT NULL DEFAULT 0` — computed by `TelemetryLogger` from `PRICING` constant at insert time
- `model text NOT NULL` — e.g. `'claude-sonnet-4-6'`, `'deterministic'` for matching stage
- `pliego_sha256 text` — nullable; denormalized from `pliego_uploads.file_sha256`. `analyses` and `pliego_uploads` remain authoritative — this column is a diagnostic convenience (RN-019 / cost-observability RN-010)
- `metadata jsonb NOT NULL DEFAULT '{}'` — escape hatch for future fields; do not promote fields here without a spec edit
- `created_at timestamptz NOT NULL DEFAULT now()`
- `ALTER TABLE analysis_events ENABLE ROW LEVEL SECURITY`

### embedding_events table (REQ-016, RN-019, RN-020, RN-022)

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `company_id uuid REFERENCES companies(id) ON DELETE SET NULL` — nullable: bulk sync calls have no company context (RN-020); ON DELETE SET NULL preserves event history if company is deleted
- `use_case text NOT NULL CHECK (use_case IN ('sync','search_query'))`
- `input_tokens int NOT NULL DEFAULT 0`
- `cost_usd numeric(10,6) NOT NULL DEFAULT 0`
- `model text NOT NULL` — e.g. `'text-embedding-3-small'`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `ALTER TABLE embedding_events ENABLE ROW LEVEL SECURITY`

### search_events table (REQ-017, RN-019, RN-021, RN-022)

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT` — NOT NULL: every search is user-scoped; RESTRICT: preserve event history
- `query_text text NOT NULL DEFAULT ''` — truncated to 500 chars by `TelemetryLogger` before insert (privacy / NFR-02 of cost-observability)
- `filters jsonb NOT NULL DEFAULT '{}'` — structured filter object (modalidad, cuantia_min/max, entidad, etc.)
- `result_count int NOT NULL DEFAULT 0`
- `clicked_ids uuid[] NOT NULL DEFAULT '{}'` — array of `proceso_id` values the user clicked from the result list; updated post-insert by the click-tracking endpoint via `array_append` (the sole permitted mutation on this table per RN-019)
- `created_at timestamptz NOT NULL DEFAULT now()`
- `ALTER TABLE search_events ENABLE ROW LEVEL SECURITY`

### RLS policies (REQ-019, RN-022)

All three tables: admin-only JWT SELECT; no INSERT/UPDATE/DELETE from client.

```sql
-- analysis_events
CREATE POLICY "admin_select_analysis_events" ON analysis_events
  FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- embedding_events
CREATE POLICY "admin_select_embedding_events" ON embedding_events
  FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- search_events
CREATE POLICY "admin_select_search_events" ON search_events
  FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
```

`TelemetryLogger` writes via service-role key (bypasses RLS). The click-tracking endpoint (`POST /api/search/click`) also uses service-role for the `array_append` UPDATE on `search_events.clicked_ids`.

### Design Rationale

Append-only tables are intentional: the event log is the audit trail for cost and quality data. Separating events from `analyses` (instead of adding more columns) keeps the analysis row slim and enables multiple events per analysis (extraction call + repair retry + matching stage). The admin-only RLS pattern (service-role writes, admin JWT reads, pilot JWT sees nothing) matches the cost-observability security boundary without requiring a new auth mechanism.

## Dependencies

Requires T2 (companies FK), T4 (analyses FK). Must complete before T6 (RLS policies) and T7 (telemetry indexes).

## Done When

- [ ] `supabase/migrations/20260505000011_telemetry_tables.sql` exists
- [ ] `analysis_events` table created; `event_type` CHECK constraint rejects `'inference'`; accepts `'extraction'`, `'repair_retry'`, `'ocr_fallback'`, `'matching'`
- [ ] `analysis_events.pliego_sha256` column is nullable; accepts NULL and a valid SHA-256 string
- [ ] `embedding_events` table created; `company_id` nullable; `use_case` CHECK constraint enforced
- [ ] `search_events` table created; `clicked_ids` defaults to `'{}'` on INSERT without explicit value
- [ ] `ENABLE ROW LEVEL SECURITY` on all three tables
- [ ] Admin SELECT policy on all three tables: `member` JWT sees zero rows; `admin` JWT sees rows
- [ ] Migration applies cleanly after T2 + T4
