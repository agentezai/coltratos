# T7: Indexes — btree, GIN, ivfflat

## Scope

- `supabase/migrations/20260504000007_indexes.sql` — CREATE INDEX statements for all tables

## Changes

### btree indexes on FK columns

Speed up joins and RLS policy evaluation (each policy calls `get_my_company_id()` which queries `users.company_id`):

- `CREATE INDEX ON users (company_id);`
- `CREATE INDEX ON company_profiles (company_id);`
- `CREATE INDEX ON pliego_uploads (uploaded_by_company_id);`
- `CREATE INDEX ON pliego_uploads (proceso_id);`
- `CREATE INDEX ON analyses (company_id);`
- `CREATE INDEX ON analyses (proceso_id);`
- `CREATE INDEX ON analyses (pliego_upload_id);`
- `CREATE INDEX ON requisitos (analysis_id);`
- `CREATE INDEX ON verdicts (requisito_id);`

### btree indexes on lookup and ordering columns

- `CREATE INDEX ON pliego_uploads (file_sha256);` — hash-collision detection and dedup lookups
- `CREATE INDEX ON analyses (company_id, created_at DESC);` — dashboard queries sorted by most-recent

### GIN indexes on JSONB columns

- `CREATE INDEX ON procesos USING GIN (datos_gov_snapshot);` — `@>` containment queries on datos.gov.co snapshot
- `CREATE INDEX ON analyses USING GIN (proceso_metadata_snapshot);` — same pattern for historical replay queries

### ivfflat index on embedding

```sql
CREATE INDEX ON procesos_index USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

- `lists = 100` is appropriate for ≤50k rows (√50000 ≈ 224; 100 is conservative and fast to build)
- Cosine distance aligns with OpenAI `text-embedding-3-small` recommendation
- ivfflat requires the pgvector extension (T1) and the `vector_cosine_ops` operator class
- Supabase accepts empty-table ivfflat indexes at creation time

## Design Rationale

All indexes are additive — no schema changes. btree on FK columns prevents sequential scans during RLS policy evaluation (the `get_my_company_id()` subquery touches `users.company_id` on every tenant-scoped read). GIN on JSONB enables `@>` containment queries on snapshots without full-row deserialization. ivfflat on embedding is required for sub-second ANN similarity search at discovery scale (≤50k rows, NFR-03).

## Dependencies

Requires T1 (pgvector extension for `vector_cosine_ops`), T2–T5 (all tables must exist before creating indexes on them).

## Done When

- [ ] `supabase/migrations/20260504000007_indexes.sql` exists
- [ ] `EXPLAIN ANALYZE` on `SELECT * FROM analyses WHERE company_id = $1 ORDER BY created_at DESC` shows index scan, not seq scan
- [ ] `SELECT indexname FROM pg_indexes WHERE tablename = 'procesos_index' AND indexname LIKE '%embedding%'` returns a row
- [ ] GIN index present on `procesos.datos_gov_snapshot`: `SELECT indexname FROM pg_indexes WHERE tablename = 'procesos' AND indexdef LIKE '%gin%'`
- [ ] GIN index present on `analyses.proceso_metadata_snapshot`
- [ ] Migration applies cleanly after T1–T5
