# domain-model-mvp — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Company Admin | Authenticated user belonging to a company; performs uploads, runs analyses, reads verdicts |
| System (Sync Job) | Background job (Edge Function or cron) that syncs open Procesos from datos.gov.co into `procesos_index` every 6 hours |
| Analysis Pipeline | Server-side pipeline that creates `analyses`, `requisitos`, and `verdicts` rows |

---

## User Stories

| ID | Story |
|----|-------|
| US-01 | As a System Sync Job, I want `procesos_index` to store `embedding vector(1536)` per Proceso so that I can run semantic similarity queries for discovery |
| US-02 | As a Company Admin, I want every pliego upload to record my company ID, SHA-256 hash, IP address, timestamp, and declaration acceptance so that there is a complete audit trail |
| US-03 | As an Analysis Pipeline, I want each analysis run to create a new immutable row with a JSONB snapshot of the datos.gov.co metadata so that verdicts remain reproducible even if the source data changes |
| US-04 | As a Company Admin, I want RLS policies to ensure I can never read another company's pliego uploads, analyses, requisitos, or verdicts |
| US-05 | As an ops engineer, I want `analyses` to carry `input_tokens`, `output_tokens`, `cached_tokens`, `cost_usd`, and `latency_ms` so that I can observe per-analysis costs and latency |

---

## Use Case Scenarios

### UC-01 — Enable pgvector discovery (US-01)

**Actor:** System (Sync Job)

**Preconditions:**
- `pgvector` extension is enabled in the Supabase project
- `procesos_index` table exists with `embedding vector(1536)` column
- `ivfflat` index exists on `embedding` using `vector_cosine_ops`

**Main Flow:**
1. Sync job fetches open Procesos from datos.gov.co SODA API (bulk, `estado = abierto`)
2. For each new or updated Proceso, job calls OpenAI `text-embedding-3-small` on `objeto_a_contratar`
3. Job upserts row into `procesos_index` with all metadata fields and the embedding vector
4. Discovery service executes `ORDER BY embedding <=> $query_vector LIMIT 20` to find matching Procesos

**Post-conditions:**
- `procesos_index` contains up-to-date open Procesos with embeddings
- Semantic search returns ranked results within p95 < 500ms at ≤50k rows

**Alternative: Row without embedding**
- If embedding call fails, row is upserted without `embedding = NULL`
- Such rows are excluded from vector search but remain available for structured-filter search

---

### UC-02 — Upload pliego with audit trail (US-02)

**Actor:** Company Admin

**Preconditions:**
- Company Admin is authenticated (JWT contains `sub` matching a `users.id`)
- A `procesos` row exists for the target `numero_proceso` (or is created at lookup time)
- File has been uploaded to Supabase Storage at `companies/<company_id>/pliegos/<sha256>.pdf`

**Main Flow:**
1. Server resolves `company_id` from the authenticated user's `users` row
2. Server computes SHA-256 of the uploaded file
3. Server inserts a `pliego_uploads` row with: `proceso_id`, `uploaded_by_company_id`, `file_sha256`, `file_storage_key`, `uploader_ip`, `declaration_accepted_at`, `declaration_text_version`, `status = 'active'`
4. System confirms the row is visible to the uploader via RLS

**Post-conditions:**
- `pliego_uploads` row is created with all audit fields populated
- Row is accessible to the uploader's company; invisible to other companies

**Alternative: Same file re-uploaded**
- If `(proceso_id, uploaded_by_company_id, file_sha256)` already exists, the insert violates the UNIQUE constraint
- Server catches the error and returns the existing `pliego_uploads.id` without creating a duplicate

**Alternative: Cross-company same file**
- If company B uploads the same file for the same proceso (same SHA-256), a new row is created with `uploaded_by_company_id = company B`
- This is correct — independent audit trails per company

---

### UC-03 — Run analysis and preserve reproducibility (US-03)

**Actor:** Analysis Pipeline

**Preconditions:**
- `pliego_uploads` row exists and has `status = 'active'`
- `company_profiles` row exists for the target company
- datos.gov.co lookup has been attempted (status known: `verified | unverified | failed`)

**Main Flow:**
1. Pipeline inserts an `analyses` row with:
   - `proceso_id`, `company_id`, `pliego_upload_id`
   - `proceso_metadata_snapshot`: full datos.gov.co JSON response (or `{}` if `unverified`)
   - `proceso_lookup_status`: `verified | unverified | failed`
   - `estado = 'pending'`
   - All telemetry fields `NULL` initially
2. Pipeline updates `analyses.estado` to `extracting`, then `analyzing`
3. LLM extraction produces requisito payloads; pipeline inserts `requisitos` rows
4. Semáforo rules engine computes per-requisito verdicts; pipeline inserts `verdicts` rows
5. Pipeline updates `analyses.estado = 'completed'`, sets `verdict`, telemetry fields, `completed_at`

**Post-conditions:**
- One immutable `analyses` row exists with the full metadata snapshot
- `requisitos` and `verdicts` rows are linked to the analysis
- Verdict is reproducible: re-running the rules engine against `analyses.proceso_metadata_snapshot` + `company_profiles` snapshot yields the same result

**Alternative: Re-run**
- User edits `company_profiles` and re-runs analysis on the same pliego
- Pipeline creates a NEW `analyses` row with a new `created_at`; the old row is never mutated

---

### UC-04 — Enforce multi-tenant isolation (US-04)

**Actor:** Company Admin (two companies, A and B)

**Preconditions:**
- Both companies have users authenticated via Supabase Auth
- Both companies have uploaded pliegos and run analyses for the same `numero_proceso`
- RLS is enabled on `pliego_uploads`, `analyses`, `requisitos`, `verdicts`, `company_profiles`

**Main Flow:**
1. User A executes `SELECT * FROM pliego_uploads` via authenticated Supabase client
2. RLS policy evaluates: `uploaded_by_company_id = (SELECT company_id FROM users WHERE id = auth.uid())`
3. Only Company A's rows pass; Company B's rows are filtered out

**Post-conditions:**
- User A sees only Company A's data across all tenant tables
- No error is raised — filtered rows simply disappear from the result set

**Alternative: Service role**
- Service-role connections bypass RLS for administrative operations (migrations, seed data)
- Service-role MUST NOT be used for tenant-scoped reads in the application layer

---

### UC-05 — Observe per-analysis cost (US-05)

**Actor:** Ops Engineer (via Supabase Studio or analytics query)

**Preconditions:**
- Completed `analyses` rows exist with telemetry columns populated
- Engineer has service-role or admin access (or is a Company Admin reading their own rows)

**Main Flow:**
1. Engineer queries: `SELECT id, company_id, cost_usd, input_tokens, cached_tokens, latency_ms, created_at FROM analyses WHERE estado = 'completed' ORDER BY created_at DESC`
2. Dashboard aggregates `SUM(cost_usd)`, `AVG(latency_ms)`, cache-hit rate from `cached_tokens / input_tokens`

**Post-conditions:**
- Cost and latency observability is available without any additional logging table
- Repair retries and OCR cost are included in `cost_usd` (pipeline responsibility, not schema)
