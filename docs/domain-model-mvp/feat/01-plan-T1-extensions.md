# T1: Enable Extensions (pgvector, uuid-ossp)

## Scope

- `supabase/migrations/20260504000001_extensions.sql` — Enable required Postgres extensions

## Changes

### Enable pgvector and uuid-ossp

- `CREATE EXTENSION IF NOT EXISTS vector;` — required for `vector(1536)` column on `procesos_index`
- `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` — provides `uuid_generate_v4()` as a safe fallback; `gen_random_uuid()` is available in Postgres 13+ and is preferred
- Both extensions MUST be enabled before any DDL that references vector types or uuid defaults
- Extensions are idempotent (`IF NOT EXISTS`) — safe to re-apply

### Design Rationale (Single Responsibility)

This task is scoped to extension enablement only. Mixing extension DDL with table DDL makes rollbacks ambiguous and prevents clean separation in CI pipelines that test individual migration steps.

## Dependencies

None — foundational task.

## Done When

- [ ] `supabase/migrations/20260504000001_extensions.sql` exists
- [ ] `CREATE EXTENSION IF NOT EXISTS vector` statement is present
- [ ] `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` statement is present
- [ ] Migration applies cleanly on a fresh Supabase project (`supabase db push` with no errors)
- [ ] `SELECT * FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp')` returns 2 rows after migration
