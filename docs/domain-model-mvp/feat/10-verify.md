# Verification Plan

## T1: Enable pgvector and uuid-ossp extensions

### Test Scenarios
- Migration applies on a fresh Supabase project without errors
- `SELECT extname FROM pg_extension WHERE extname = 'vector'` returns a row
- `SELECT extname FROM pg_extension WHERE extname = 'uuid-ossp'` returns a row
- Applying the migration a second time is a no-op (idempotent `IF NOT EXISTS`)

### Gate Criteria
Migration file exists and applies cleanly. Both extensions confirmed in `pg_extension`.

---

## T2: Create tenant root tables

### Test Scenarios
- `companies`, `users`, `company_profiles` tables exist in `information_schema.tables`
- `companies.nit` UNIQUE constraint: inserting a duplicate NIT fails with a unique violation
- `company_profiles.company_id` UNIQUE constraint: second profile for same company fails
- `users.id` FK to `auth.users(id)` ON DELETE CASCADE: removing an auth user removes the `users` row
- `company_profiles` FK to `companies(id)` ON DELETE CASCADE: removing a company removes its profile
- All three tables have `ENABLE ROW LEVEL SECURITY` flag set (`SELECT relrowsecurity FROM pg_class WHERE relname = 'companies'` returns `true`)

### Gate Criteria
All tables created with correct constraints. RLS flag enabled on all three. FK cascade behavior verified.

---

## T3: Create public tables

### Test Scenarios
- `procesos` and `procesos_index` tables exist
- `procesos.numero_proceso` UNIQUE constraint enforced
- `procesos_index` accepts INSERT with `embedding = array_fill(0::float8, ARRAY[1536])::vector`
- `procesos_index` rejects INSERT with `embedding` of dimension ≠ 1536 (column type enforces this)
- Neither table has a `company_id` column (`SELECT column_name FROM information_schema.columns WHERE table_name = 'procesos' AND column_name = 'company_id'` returns 0 rows)

### Gate Criteria
Both tables created. pgvector column accepts 1536-dim input. No tenant data columns on either table.

---

## T4: Create audit and upload tables

### Test Scenarios
- `pliego_uploads` and `analyses` tables exist
- `pliego_uploads.status` CHECK: `'active'`, `'flagged'`, `'superseded'` accepted; `'deleted'` rejected
- `analyses.proceso_lookup_status` CHECK: `'verified'`, `'unverified'`, `'failed'` accepted; `'pending'` rejected
- `analyses.verdict` CHECK: `'verde'`, `'amarillo'`, `'rojo'` accepted; `'yellow'` rejected
- `analyses.estado` CHECK: `'pending'`, `'extracting'`, `'analyzing'`, `'completed'`, `'failed'` accepted
- Hash collision: two `pliego_uploads` rows with same `file_sha256` but different `uploaded_by_company_id` both accepted (no unique violation)
- Observability columns exist: `input_tokens`, `output_tokens`, `cached_tokens`, `cost_usd`, `latency_ms`

### Gate Criteria
All CHECK constraints fire correctly. Hash collision across companies accepted. Observability columns present.

---

## T5: Create extraction tables

### Test Scenarios
- `requisitos` and `verdicts` tables exist
- `requisitos.tipo` CHECK: `'juridico'`, `'tecnico'`, `'financiero'` accepted; `'experiencia'` rejected
- `verdicts.verdict` CHECK: `'verde'`, `'amarillo'`, `'rojo'` accepted; `'green'` rejected
- `confidence_score` CHECK: value 0.0 and 1.0 accepted; value 1.5 rejected
- CASCADE delete: deleting an `analyses` row removes its `requisitos` and their `verdicts`

### Gate Criteria
All CHECK constraints fire correctly. Cascade delete chain verified end-to-end.

---

## T6: RLS policies for all tenant tables

### Test Scenarios
- As user_a: `SELECT * FROM pliego_uploads` returns only company A's rows (not company B's)
- As user_a: `SELECT * FROM analyses` returns only company A's rows
- As user_a: `SELECT * FROM requisitos` returns only company A's (via analyses chain)
- As user_a: `SELECT * FROM verdicts` returns only company A's (via requisitos → analyses chain)
- As user_a: `SELECT * FROM procesos` returns the shared Proceso row (no tenant filter)
- As user_a: `SELECT * FROM procesos_index` returns shared index rows
- `get_my_company_id()` function exists and is `SECURITY DEFINER`
- Companies and users tables have self-referential policies (user sees own company and own user row)

### Gate Criteria
All seven isolation scenarios pass. Shared-table access confirmed for `procesos` and `procesos_index`.

---

## T7: Indexes

### Test Scenarios
- `SELECT indexname FROM pg_indexes WHERE tablename = 'procesos_index' AND indexdef LIKE '%ivfflat%'` returns a row
- `SELECT indexname FROM pg_indexes WHERE tablename = 'procesos' AND indexdef LIKE '%gin%'` returns a row
- `SELECT indexname FROM pg_indexes WHERE tablename = 'analyses' AND indexdef LIKE '%gin%'` returns a row
- `EXPLAIN (ANALYZE, FORMAT TEXT) SELECT * FROM analyses WHERE company_id = '...' ORDER BY created_at DESC LIMIT 10` shows `Index Scan` not `Seq Scan`
- btree indexes on FK columns visible in `pg_indexes` for `users`, `company_profiles`, `pliego_uploads`, `analyses`, `requisitos`, `verdicts`

### Gate Criteria
ivfflat, GIN, and btree indexes all confirmed in `pg_indexes`. Company-scoped analyses query uses index.

---

## T8: Seed migration

### Test Scenarios
- Migration applies cleanly after T1–T7 on a fresh Supabase project
- As user_a: `SELECT count(*) FROM analyses` = 1
- As user_a: `SELECT count(*) FROM pliego_uploads` = 1
- As user_a: `SELECT count(*) FROM requisitos` = 1
- As user_a: `SELECT count(*) FROM verdicts` = 1
- As user_a: `SELECT count(*) FROM procesos` = 1 (shared — both companies can see it)
- `SELECT count(*) FROM pliego_uploads WHERE file_sha256 = 'abc123...'` as service role = 2 (both collision rows present)
- `SELECT array_length(embedding::float8[], 1) FROM procesos_index LIMIT 1` = 1536

### Gate Criteria
All isolation assertions pass. Hash collision confirmed (2 rows, same SHA-256). Vector dimension confirmed.

---

## T9: Add ingestion lifecycle columns to pliego_uploads

### Test Scenarios
- Migration applies cleanly after T1–T8 on a fresh Supabase project
- After migration, `\d pliego_uploads` shows 4 new columns: `ingestion_status`, `ingestion_started_at`, `ingestion_completed_at`, `ingestion_failure_reason` with correct types and CHECK constraints
- `INSERT INTO pliego_uploads (..., ingestion_status) VALUES (..., 'queued')` is rejected with CHECK violation
- `INSERT INTO pliego_uploads (..., ingestion_status) VALUES (..., 'pending')` succeeds
- `INSERT INTO pliego_uploads (..., ingestion_status) VALUES (..., 'running')` succeeds
- `INSERT INTO pliego_uploads (..., ingestion_status) VALUES (..., 'completed')` succeeds
- `INSERT INTO pliego_uploads (..., ingestion_status) VALUES (..., 'failed')` succeeds
- `INSERT INTO pliego_uploads (..., ingestion_failure_reason) VALUES (..., 'something_broke')` is rejected with CHECK violation
- `INSERT INTO pliego_uploads (..., ingestion_failure_reason) VALUES (..., 'pdf_unreadable')` succeeds
- All other vocab values (`'ocr_timeout'`, `'page_limit_exceeded'`, `'encrypted_pdf'`, `'unknown'`) accepted
- `NULL` for `ingestion_failure_reason` accepted (default)
- Existing seed `pliego_uploads` rows have `ingestion_status = 'pending'` after migration (DEFAULT applied via NOT NULL backfill)

### Gate Criteria
All 4 columns present with CHECK constraints. Vocab enforced for both `ingestion_status` and `ingestion_failure_reason`. Existing rows backfilled to `'pending'`.

---

## T10: Create pdf_pages table with composite PK and RLS

### Test Scenarios
- Migration applies cleanly after T1–T9
- `pdf_pages` table exists in `information_schema.tables`
- `\d pdf_pages` shows composite PK `(pliego_upload_id, page_number)`, FK to `pliego_uploads(id)` ON DELETE CASCADE, columns `text`, `tables jsonb`, `extraction_method`, `confidence`, `flags text[]`, `created_at`
- `extraction_method` CHECK: `'text_layer'`, `'ocr'`, `'table_parser'`, `'empty'` accepted; `'pdfminer'` rejected
- `confidence` CHECK: `NULL`, `0.0`, `1.0` accepted; `1.5` rejected
- `page_number` CHECK: value `1` accepted; value `0` rejected (must be `>= 1`)
- Composite PK: insert `(X, 1)` succeeds; second insert `(X, 1)` rejected with unique violation
- Upsert: `INSERT ... ON CONFLICT (pliego_upload_id, page_number) DO UPDATE SET text = EXCLUDED.text` on existing `(X, 1)` succeeds and updates `text`
- CASCADE: `DELETE FROM pliego_uploads WHERE id = X` removes all `pdf_pages` rows for that upload
- `pg_indexes` shows btree index on `pliego_upload_id`
- `relrowsecurity = true` for `pdf_pages` in `pg_class`
- RLS: as user_a, `SELECT count(*) FROM pdf_pages` returns only company A's pages (via join through `pliego_uploads.uploaded_by_company_id`); company B's pages invisible
- Service-role insert into `pdf_pages` succeeds without RLS filtering
- Empty page contract: `INSERT INTO pdf_pages (..., text, extraction_method, flags) VALUES (..., '', 'empty', ARRAY['no_text_extracted'])` succeeds

### Gate Criteria
Table created with composite PK, FK CASCADE, all CHECKs, and RLS enabled. Upsert idempotency confirmed. Cross-company isolation confirmed via join chain.

---

## End-to-End Verification

**Final acceptance test (run on a fresh `supabase start` / local Supabase project):**

1. Run `supabase db push` — all 10 migrations apply in sequence without errors
2. Verify `pg_extension`: both `vector` and `uuid-ossp` present
3. Verify `pg_indexes`: ivfflat on `procesos_index.embedding`, GIN on both JSONB columns, btree on all FK columns (including `pdf_pages.pliego_upload_id`)
4. Simulate user_a session: confirm `analyses`, `pliego_uploads`, `requisitos`, `verdicts` each return exactly 1 row
5. Simulate user_b session: confirm same counts (1 each, own company only)
6. As service role: confirm `pliego_uploads` has 2 rows with identical `file_sha256` (hash collision)
7. Confirm `procesos` returns 1 row to both user_a and user_b (shared infrastructure)
8. Confirm `pliego_uploads` has 4 ingestion lifecycle columns; existing seed rows show `ingestion_status = 'pending'`
9. Confirm `pdf_pages` table exists, has RLS enabled, and is empty by default (no seed data — `pdf-ingestion` populates it at runtime)

**Gate Criteria:** All 9 steps complete without errors. Zero cross-tenant data leaks. Hash collision accepted. Ingestion lifecycle and pdf_pages schema present and isolated.
