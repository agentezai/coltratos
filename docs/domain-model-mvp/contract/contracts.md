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
