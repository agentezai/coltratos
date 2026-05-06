# Progress Tracker

**Status:** Not Started

**Current Task:** T1: Enable pgvector and uuid-ossp extensions

---

## Task Checklist

### T1: Enable pgvector and uuid-ossp extensions
- [ ] Implement T1: write `supabase/migrations/20260504000001_extensions.sql` with idempotent `CREATE EXTENSION IF NOT EXISTS` for both extensions
- [ ] Verify T1: migration applies cleanly; `SELECT extname FROM pg_extension WHERE extname IN ('vector','uuid-ossp')` returns both rows

### T2: Create tenant root tables
- [ ] Implement T2: write `supabase/migrations/20260504000002_tenant_root.sql` creating `companies`, `users`, `company_profiles` with PKs, FKs, CHECKs, and `ENABLE ROW LEVEL SECURITY`
- [ ] Verify T2: all three tables exist; `company_profiles.company_id` UNIQUE constraint enforced; insert with duplicate `nit` fails

### T3: Create public tables
- [ ] Implement T3: write `supabase/migrations/20260504000003_public_tables.sql` creating `procesos` and `procesos_index` with `embedding vector(1536)`; no `company_id` on either
- [ ] Verify T3: `procesos_index` accepts a `vector(1536)` insert; `procesos.numero_proceso` UNIQUE constraint enforced

### T4: Create audit and upload tables
- [ ] Implement T4: write `supabase/migrations/20260504000004_audit_tables.sql` creating `pliego_uploads` and `analyses` with all FKs, CHECKs, and observability columns (`input_tokens`, `output_tokens`, `cached_tokens`, `cost_usd`, `latency_ms`)
- [ ] Verify T4: `pliego_uploads.status` CHECK rejects `'deleted'`; `analyses.proceso_lookup_status` CHECK rejects `'pending'`; same SHA-256 from two companies both accepted

### T5: Create extraction tables
- [ ] Implement T5: write `supabase/migrations/20260504000005_extraction_tables.sql` creating `requisitos` and `verdicts` with CASCADE ON DELETE from `analyses`
- [ ] Verify T5: `requisitos.tipo` CHECK rejects `'experiencia'`; `verdicts.verdict` CHECK rejects `'green'`; delete on `analyses` cascades to both child tables

### T6: RLS policies for all tenant tables
- [ ] Implement T6: write `supabase/migrations/20260504000006_rls_policies.sql` with `get_my_company_id()` function and policies for all 9 tables
- [ ] Verify T6: user of company A cannot SELECT company B's `pliego_uploads`, `analyses`, `requisitos`, or `verdicts`; `procesos` SELECT returns same row to both companies

### T7: Indexes
- [ ] Implement T7: write `supabase/migrations/20260504000007_indexes.sql` with btree on FKs, GIN on JSONB columns, and ivfflat on `procesos_index.embedding`
- [ ] Verify T7: `pg_indexes` confirms ivfflat index on `procesos_index.embedding`; GIN indexes on `procesos.datos_gov_snapshot` and `analyses.proceso_metadata_snapshot`; `EXPLAIN` on company-scoped `analyses` query shows index scan

### T8: Seed migration
- [ ] Implement T8: write `supabase/migrations/20260504000008_seed.sql` inserting 2 companies, 2 users, 1 shared proceso, 1 procesos_index row, 2 pliego_uploads (same SHA-256), 2 analyses, 2 requisitos, 2 verdicts
- [ ] Verify T8: as user_a, `SELECT count(*) FROM analyses` = 1; `SELECT count(*) FROM pliego_uploads` = 1; `SELECT count(*) FROM procesos` = 1; both pliego_upload rows with identical SHA-256 persist

### T9: Add ingestion lifecycle columns to pliego_uploads
- [ ] Implement T9: write `supabase/migrations/20260504000009_pliego_uploads_ingestion.sql` adding `ingestion_status`, `ingestion_started_at`, `ingestion_completed_at`, `ingestion_failure_reason` with CHECK constraints; backfill existing rows to `ingestion_status = 'pending'`
- [ ] Verify T9: CHECK rejects `ingestion_status = 'queued'` and `ingestion_failure_reason = 'something_broke'`; accepts vocab values from RN-016; existing seed rows have `ingestion_status = 'pending'` after migration

### T10: Create pdf_pages table with composite PK and RLS
- [ ] Implement T10: write `supabase/migrations/20260504000010_pdf_pages.sql` creating `pdf_pages` with composite PK `(pliego_upload_id, page_number)`, FK CASCADE, CHECK on `extraction_method` and `confidence`, btree index on `pliego_upload_id`, RLS policy joining through `pliego_uploads.uploaded_by_company_id`, `ENABLE ROW LEVEL SECURITY`
- [ ] Verify T10: composite PK rejects duplicate `(pliego_upload_id, page_number)`; ON CONFLICT upsert succeeds; CASCADE delete removes pages; user_a sees only own company's pages; service-role inserts bypass RLS

### T11: Create telemetry event tables (analysis_events, embedding_events, search_events)
- [ ] Implement T11: write `supabase/migrations/20260505000011_telemetry_tables.sql` creating `analysis_events`, `embedding_events`, `search_events` with CHECKs, FK to `analyses`/`companies`, nullable columns, `ENABLE ROW LEVEL SECURITY`, and admin-only SELECT policies
- [ ] Verify T11: `event_type` CHECK rejects invalid values; `embedding_events.company_id` accepts NULL; `search_events.clicked_ids` defaults to `'{}'`; member JWT sees 0 rows; admin JWT sees rows; service-role INSERT succeeds

---

## Completion Summary

_Updated when all tasks are done._
