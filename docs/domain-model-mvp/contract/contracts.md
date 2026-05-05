# TDD Contract: domain-model-mvp

Markdown TDD guide for nybo-run. The Executor Agent reads this file and writes failing SQL/pgTAP tests
before implementing each migration task (Red), then implements (Green), then refactors (Refactor).

**Test framework:** pgTAP (SQL) for migration contracts; vitest for any TypeScript integration helpers.
**Test file:** `supabase/tests/domain-model-mvp.sql` (pgTAP) or `supabase/tests/domain-model-mvp.test.ts`

---

## Task T1: Enable Extensions

### Behavior: pgvector extension present after migration (REQ-001, RN-001)

**Given** the T1 migration has been applied to a fresh Supabase project
**When** `SELECT extname FROM pg_extension WHERE extname = 'vector'`
**Then** one row is returned with `extname = 'vector'`

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: uuid-ossp extension present after migration (REQ-001, RN-001)

**Given** the T1 migration has been applied
**When** `SELECT extname FROM pg_extension WHERE extname = 'uuid-ossp'`
**Then** one row is returned

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

## Task T2: Tenant Root Tables

### Behavior: companies NIT uniqueness enforced (REQ-002)

**Given** a `companies` row with `nit = '900111111-1'` exists
**When** a second INSERT with `nit = '900111111-1'` is attempted
**Then** Postgres raises a unique violation error

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: company_profiles one-per-company enforced (REQ-004)

**Given** a `company_profiles` row for `company_id = X` exists
**When** a second INSERT with the same `company_id = X` is attempted
**Then** Postgres raises a unique violation error

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: RLS enabled on tenant root tables (REQ-011, RN-002)

**Given** the T2 migration has been applied
**When** `SELECT relrowsecurity FROM pg_class WHERE relname IN ('companies', 'users', 'company_profiles')`
**Then** all three rows have `relrowsecurity = true`

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

## Task T3: Public Tables

### Behavior: procesos_index accepts vector(1536) insert (REQ-006, RN-007, TC-001)

**Given** the T3 migration has been applied and pgvector is enabled
**When** `INSERT INTO procesos_index (numero_proceso, entidad, objeto_a_contratar, modalidad, embedding) VALUES ('TEST-001', 'Test', 'Test', 'Licitación Pública', array_fill(0::float8, ARRAY[1536])::vector)`
**Then** the insert succeeds and the row is retrievable

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: procesos has no company_id column (RN-005)

**Given** the T3 migration has been applied
**When** `SELECT count(*) FROM information_schema.columns WHERE table_name = 'procesos' AND column_name = 'company_id'`
**Then** count = 0

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: procesos shared across companies (REQ-005, RN-005, TC-002)

**Given** a `procesos` row with `numero_proceso = 'SECOP-TEST-001'` exists
**And** two authenticated users from different companies
**When** each user executes `SELECT * FROM procesos WHERE numero_proceso = 'SECOP-TEST-001'`
**Then** both queries return the same row

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

## Task T4: Audit and Upload Tables

### Behavior: pliego_uploads rejects invalid status (REQ-007, RN-008, TC-007)

**Given** the T4 migration has been applied
**When** `INSERT INTO pliego_uploads (..., status) VALUES (..., 'deleted')`
**Then** Postgres raises a CHECK constraint violation

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: analyses rejects invalid proceso_lookup_status (REQ-008, RN-006, TC-008)

**Given** the T4 migration has been applied
**When** `INSERT INTO analyses (..., proceso_lookup_status) VALUES (..., 'pending')`
**Then** Postgres raises a CHECK constraint violation

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: hash collision across companies accepted (REQ-007, RN-009, TC-011)

**Given** company A has a `pliego_uploads` row with `file_sha256 = 'abc123'` for proceso P1
**When** company B inserts a `pliego_uploads` row with the same `file_sha256 = 'abc123'` for proceso P1
**Then** the insert succeeds — two distinct rows exist with the same hash but different `uploaded_by_company_id`

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

## Task T5: Extraction Tables

### Behavior: requisitos tipo rejects unknown value (REQ-009, RN-013, TC-012)

**Given** the T5 migration has been applied
**When** `INSERT INTO requisitos (..., tipo) VALUES (..., 'experiencia')`
**Then** Postgres raises a CHECK constraint violation

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: verdicts verdict rejects unknown value (REQ-010, RN-014, TC-013)

**Given** the T5 migration has been applied
**When** `INSERT INTO verdicts (..., verdict) VALUES (..., 'green')`
**Then** Postgres raises a CHECK constraint violation

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: cascade delete from analyses removes requisitos and verdicts (REQ-009, REQ-010)

**Given** an `analyses` row exists with 2 `requisitos`, each with 1 `verdicts` row
**When** the `analyses` row is deleted
**Then** all 2 `requisitos` rows and 2 `verdicts` rows are also deleted (ON DELETE CASCADE)

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

## Task T6: RLS Policies

### Behavior: RLS blocks cross-company read on pliego_uploads (REQ-011, RN-015, TC-003)

**Given** company A and company B each have one `pliego_uploads` row
**When** user_a executes `SELECT count(*) FROM pliego_uploads`
**Then** count = 1 (only company A's row — company B's row is invisible)

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: RLS blocks cross-company read on analyses (REQ-011, RN-015, TC-004)

**Given** company A and company B each have one `analyses` row
**When** user_a executes `SELECT count(*) FROM analyses`
**Then** count = 1 (only company A's analysis)

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: RLS blocks cross-company read on requisitos via join chain (REQ-011, RN-015, TC-005)

**Given** company A's analysis has 1 requisito; company B's analysis has 1 requisito
**When** user_a executes `SELECT count(*) FROM requisitos`
**Then** count = 1 (only company A's requisito — scoped via analyses.company_id)

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: RLS blocks cross-company read on verdicts via chain (REQ-011, RN-015, TC-006)

**Given** company A and company B each have one verdict
**When** user_a executes `SELECT count(*) FROM verdicts`
**Then** count = 1 (only company A's verdict — scoped via requisitos → analyses.company_id)

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

## Task T7: Indexes

### Behavior: ivfflat index created on procesos_index.embedding (REQ-012, NFR-03, TC-014)

**Given** the T7 migration has been applied
**When** `SELECT indexname FROM pg_indexes WHERE tablename = 'procesos_index' AND indexdef LIKE '%ivfflat%'`
**Then** one row is returned

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: GIN indexes created on JSONB columns (REQ-012)

**Given** the T7 migration has been applied
**When** `SELECT count(*) FROM pg_indexes WHERE tablename = 'procesos' AND indexdef LIKE '%gin%'`
**Then** count ≥ 1

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

## Task T8: Seed Migration

### Behavior: seed migration demonstrates cross-company isolation end-to-end (REQ-013, RN-015, TC-015)

**Given** the seed migration has run (T1–T7 applied first)
**When** user_a queries `analyses`, `pliego_uploads`, `requisitos`, `verdicts`
**Then** each query returns count = 1 (company A's rows only)

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: hash collision rows both persist in seed (RN-009)

**Given** the seed migration has run
**When** `SELECT count(*) FROM pliego_uploads WHERE file_sha256 = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1'` (service role)
**Then** count = 2 (both companies' rows present)

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: procesos_index embedding dimension is 1536 (REQ-006, RN-007)

**Given** the seed migration has run
**When** `SELECT vector_dims(embedding) FROM procesos_index LIMIT 1`
**Then** returns 1536

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

## Task T9: Ingestion Lifecycle Columns

### Behavior: pliego_uploads ingestion_status CHECK rejects invalid value (REQ-007, RN-016, TC-016)

**Given** the T9 migration has been applied
**When** `INSERT INTO pliego_uploads (..., ingestion_status) VALUES (..., 'queued')`
**Then** Postgres raises a CHECK constraint violation

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: pliego_uploads ingestion_status accepts all four lifecycle values (REQ-007, RN-016)

**Given** the T9 migration has been applied
**When** four `pliego_uploads` rows are inserted with `ingestion_status` values `'pending'`, `'running'`, `'completed'`, `'failed'`
**Then** all four inserts succeed

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: pliego_uploads ingestion_failure_reason CHECK enforces controlled vocabulary (REQ-007, RN-016, TC-017)

**Given** the T9 migration has been applied
**When** `INSERT INTO pliego_uploads (..., ingestion_failure_reason) VALUES (..., 'something_broke')`
**Then** Postgres raises a CHECK constraint violation

**When** inserted with `NULL` or one of `'pdf_unreadable'`, `'ocr_timeout'`, `'page_limit_exceeded'`, `'encrypted_pdf'`, `'unknown'`
**Then** each insert succeeds

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: existing pliego_uploads rows backfilled to ingestion_status='pending' (REQ-007)

**Given** the T8 seed has populated 2 `pliego_uploads` rows
**And** the T9 migration is then applied
**When** `SELECT ingestion_status FROM pliego_uploads`
**Then** all rows return `'pending'` (NOT NULL DEFAULT applied during migration)

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

## Task T10: pdf_pages Table

### Behavior: pdf_pages composite PK enforced (REQ-014, RN-017, TC-018)

**Given** the T10 migration has been applied
**And** a `pdf_pages` row exists for `(pliego_upload_id = X, page_number = 1)`
**When** a second INSERT with `(X, 1)` is attempted
**Then** Postgres raises a unique violation

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: pdf_pages upsert on conflict succeeds (REQ-014, RN-017, TC-018)

**Given** a `pdf_pages` row exists for `(X, 1)` with `text = 'old'`
**When** `INSERT INTO pdf_pages (...) VALUES (X, 1, 'new', ...) ON CONFLICT (pliego_upload_id, page_number) DO UPDATE SET text = EXCLUDED.text`
**Then** the upsert succeeds and `SELECT text FROM pdf_pages WHERE pliego_upload_id = X AND page_number = 1` returns `'new'`

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: pdf_pages CASCADE delete from pliego_uploads (REQ-014, TC-019)

**Given** a `pliego_uploads` row with 5 `pdf_pages` rows
**When** the `pliego_uploads` row is deleted (service role)
**Then** all 5 `pdf_pages` rows are also deleted

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: pdf_pages extraction_method CHECK rejects unknown value (REQ-014)

**Given** the T10 migration has been applied
**When** `INSERT INTO pdf_pages (..., extraction_method) VALUES (..., 'pdfminer')`
**Then** Postgres raises a CHECK constraint violation

**When** inserted with `'text_layer'`, `'ocr'`, `'table_parser'`, or `'empty'`
**Then** each insert succeeds

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: pdf_pages RLS scoped via pliego_uploads join (REQ-011, RN-018, TC-020)

**Given** company A has a `pliego_uploads` row with 3 `pdf_pages`; company B has a `pliego_uploads` row with 4 `pdf_pages`
**When** user_a executes `SELECT count(*) FROM pdf_pages`
**Then** count = 3 (company B's pages invisible via the join chain)

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: pdf_pages RLS enabled (REQ-011, RN-002, RN-018)

**Given** the T10 migration has been applied
**When** `SELECT relrowsecurity FROM pg_class WHERE relname = 'pdf_pages'`
**Then** returns `true`

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

## Task T11: Create Telemetry Event Tables

### Behavior: analysis_events event_type CHECK rejects invalid value (REQ-015, RN-019, TC-021)

**Given** the T11 migration has been applied
**When** `INSERT INTO analysis_events (..., event_type, stage, ...) VALUES (..., 'inference', 'extraction', ...)`
**Then** Postgres raises a CHECK constraint violation
**When** inserted with `'extraction'`, `'repair_retry'`, `'ocr_fallback'`, `'matching'`
**Then** each insert succeeds

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: analysis_events pliego_sha256 is nullable (REQ-015, RN-019)

**Given** the T11 migration has been applied
**When** `INSERT INTO analysis_events (..., pliego_sha256) VALUES (..., NULL)` (service-role)
**Then** insert succeeds; `pliego_sha256 IS NULL` on the row

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: embedding_events accepts NULL company_id (REQ-016, RN-020, TC-022)

**Given** the T11 migration has been applied
**When** `INSERT INTO embedding_events (company_id, use_case, input_tokens, cost_usd, model) VALUES (NULL, 'sync', 500, 0.00001, 'text-embedding-3-small')`
**Then** insert succeeds; row is retrievable via service-role

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: search_events clicked_ids defaults to empty array (REQ-017, RN-021, TC-023)

**Given** the T11 migration has been applied
**When** `INSERT INTO search_events (company_id, query_text, filters, result_count) VALUES ($1, 'consultoría', '{}', 8)` without `clicked_ids`
**Then** inserted row has `clicked_ids = '{}'`

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: event tables RLS blocks member JWT (REQ-019, RN-022, TC-024)

**Given** an authenticated session with `role = 'member'`
**When** `SELECT count(*) FROM analysis_events` (or `embedding_events`, or `search_events`)
**Then** count = 0 (RLS filters all rows)

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: event tables RLS enabled (REQ-019, RN-022)

**Given** the T11 migration has been applied
**When** `SELECT relrowsecurity FROM pg_class WHERE relname IN ('analysis_events','embedding_events','search_events')`
**Then** all three rows return `true`

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

## Task T4 addendum: analyses typed observability columns

### Behavior: analyses.extraction_outcome CHECK rejects unknown value (REQ-018, RN-023, TC-025)

**Given** the T4 migration has been applied
**When** `UPDATE analyses SET extraction_outcome = 'unknown' WHERE id = $1` (service-role)
**Then** Postgres raises a CHECK constraint violation
**When** set to `'success'`, `'partial'`, or `'failure'`
**Then** each succeeds

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP

---

### Behavior: analyses typed columns accept NULL (REQ-018, RN-023, TC-026)

**Given** an `analyses` row inserted without specifying typed columns
**When** `SELECT extraction_outcome, requisito_count, count_verde, count_amarillo, count_rojo FROM analyses WHERE id = $1`
**Then** all five columns return NULL

**Test file:** `supabase/tests/domain-model-mvp.sql`
**Framework:** pgTAP
