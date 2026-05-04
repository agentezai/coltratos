# domain-model-mvp — Software Design Document

## Intention

Establishes the complete, multi-tenant Postgres data model for the COLTRATOS MVP: discovery (`procesos_index` with pgvector embeddings), pliego upload with full audit trail, requisito extraction, semáforo verdicts, and per-analysis observability. Every other MVP spec (`ingesta-secop`, `pliego-upload`, `requisitos-extraction`, `semaforo-aggregation`, `company-profiling-onboarding`) depends on the schema defined here — a wrong column cascades into rework across all of them.

Note: this spec defines a greenfield schema aligned with the 2026-05-04 pilot-research domain model. It is **distinct** from `domain-model-postgres` (which implemented the original empresa/proceso/pliego/segmento schema) and supersedes that model for the discovery-first MVP path.

## Use Cases

Detailed scenarios in [use-cases.md](./use-cases.md).

| Use Case | Description | User Stories |
|----------|-------------|-------------|
| [UC-01 — Enable pgvector discovery](./use-cases.md#uc-01--enable-pgvector-discovery-us-01) | System stores open-Proceso embeddings for semantic similarity search | US-01 |
| [UC-02 — Upload pliego with audit trail](./use-cases.md#uc-02--upload-pliego-with-audit-trail-us-02) | Company uploads a pliego PDF; system records SHA-256, uploader identity, IP, timestamp, and declaration | US-02 |
| [UC-03 — Run analysis and preserve reproducibility](./use-cases.md#uc-03--run-analysis-and-preserve-reproducibility-us-03) | Pipeline creates an immutable analysis row with JSONB metadata snapshot so verdicts remain reproducible | US-03 |
| [UC-04 — Enforce multi-tenant isolation](./use-cases.md#uc-04--enforce-multi-tenant-isolation-us-04) | RLS prevents Company A from reading Company B's pliego_uploads, analyses, requisitos, or verdicts | US-04 |
| [UC-05 — Observe per-analysis cost](./use-cases.md#uc-05--observe-per-analysis-cost-us-05) | Finance/ops reads token counts, cost_usd, and latency from the analyses table for observability dashboards | US-05 |

---

## Requirements

### Functional Requirements

| ID | Requirement | User Stories | Business Rules |
|----|-------------|-------------|----------------|
| REQ-001 | Enable `pgvector` and `uuid-ossp` extensions before any table DDL | US-01 | RN-001 |
| REQ-002 | Create `companies` table: `id uuid PK`, `name text NOT NULL`, `nit text UNIQUE NOT NULL`, `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()` | US-04 | RN-002 |
| REQ-003 | Create `users` table: `id uuid PK REFERENCES auth.users(id) ON DELETE CASCADE`, `company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT`, `role text NOT NULL DEFAULT 'member'`, `created_at timestamptz NOT NULL DEFAULT now()`. FK to Supabase `auth.users`; one user belongs to exactly one company in MVP | US-04 | RN-002, RN-003 |
| REQ-004 | Create `company_profiles` table: `id uuid PK`, `company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE`, `juridica jsonb NOT NULL DEFAULT '{}'`, `financiera jsonb NOT NULL DEFAULT '{}'` (3-year indicators), `experiencia jsonb NOT NULL DEFAULT '[]'`, `capacidad_tecnica jsonb NOT NULL DEFAULT '{}'`, `updated_at timestamptz NOT NULL DEFAULT now()`. One active profile per company; JSONB for nested arrays | US-02, US-03 | RN-002, RN-004 |
| REQ-005 | Create `procesos` table (shared, no `company_id`): `id uuid PK`, `numero_proceso text UNIQUE NOT NULL`, `entidad text NOT NULL`, `objeto_a_contratar text NOT NULL`, `modalidad text NOT NULL`, `valor_estimado numeric(18,2)`, `fecha_apertura timestamptz`, `fecha_cierre timestamptz`, `datos_gov_snapshot jsonb NOT NULL`, `proceso_lookup_status text NOT NULL CHECK (proceso_lookup_status IN ('verified','unverified','failed'))`, `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()` | US-01, US-03 | RN-005, RN-006 |
| REQ-006 | Create `procesos_index` table (shared, no `company_id`): `id uuid PK`, `numero_proceso text UNIQUE NOT NULL`, `entidad text NOT NULL`, `objeto_a_contratar text NOT NULL`, `modalidad text NOT NULL`, `cuantia_proceso numeric(18,2)`, `fecha_de_publicacion_del_proceso timestamptz`, `fecha_limite_de_recepcion timestamptz`, `embedding vector(1536)`, `synced_at timestamptz NOT NULL DEFAULT now()`. The `embedding` column uses OpenAI `text-embedding-3-small` on `objeto_a_contratar`. No RLS — publicly readable by authenticated users | US-01 | RN-001, RN-007 |
| REQ-007 | Create `pliego_uploads` table (tenant-scoped): `id uuid PK`, `proceso_id uuid NOT NULL REFERENCES procesos(id) ON DELETE RESTRICT`, `uploaded_by_company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT`, `file_sha256 text NOT NULL`, `file_storage_key text NOT NULL`, `uploaded_at timestamptz NOT NULL DEFAULT now()`, `uploader_ip text`, `declaration_accepted_at timestamptz`, `declaration_text_version text`, `status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','flagged','superseded'))`. UNIQUE constraint on `(proceso_id, uploaded_by_company_id, file_sha256)` | US-02 | RN-002, RN-008, RN-009 |
| REQ-008 | Create `analyses` table (tenant-scoped): `id uuid PK`, `proceso_id uuid NOT NULL REFERENCES procesos(id) ON DELETE RESTRICT`, `company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT`, `pliego_upload_id uuid NOT NULL REFERENCES pliego_uploads(id) ON DELETE RESTRICT`, `proceso_metadata_snapshot jsonb NOT NULL`, `proceso_lookup_status text NOT NULL CHECK (proceso_lookup_status IN ('verified','unverified','failed'))`, `verdict text CHECK (verdict IN ('verde','amarillo','rojo'))`, `estado text NOT NULL DEFAULT 'pending' CHECK (estado IN ('pending','extracting','analyzing','completed','failed'))`, `created_at timestamptz NOT NULL DEFAULT now()`, `completed_at timestamptz`, `input_tokens int`, `output_tokens int`, `cached_tokens int`, `cost_usd numeric(10,6)`, `latency_ms int`. INSERT only — never UPDATE an existing row | US-03, US-05 | RN-002, RN-010, RN-011, RN-012 |
| REQ-009 | Create `requisitos` table (tenant-scoped via `analyses.company_id`): `id uuid PK`, `analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE`, `tipo text NOT NULL CHECK (tipo IN ('juridico','tecnico','financiero'))`, `texto text NOT NULL`, `pagina_fuente int`, `quote_fuente text`, `confidence_score numeric(5,4) CHECK (confidence_score BETWEEN 0 AND 1)`, `created_at timestamptz NOT NULL DEFAULT now()` | US-03 | RN-002, RN-013 |
| REQ-010 | Create `verdicts` table (tenant-scoped via `requisitos.analysis_id`): `id uuid PK`, `requisito_id uuid NOT NULL REFERENCES requisitos(id) ON DELETE CASCADE`, `verdict text NOT NULL CHECK (verdict IN ('verde','amarillo','rojo'))`, `reason text NOT NULL`, `confidence numeric(5,4) CHECK (confidence BETWEEN 0 AND 1)`, `created_at timestamptz NOT NULL DEFAULT now()` | US-03 | RN-002, RN-014 |
| REQ-011 | Apply RLS policies: `pliego_uploads`, `analyses`, `company_profiles` scoped by `company_id` matching the caller's company membership; `requisitos` scoped via join to `analyses.company_id`; `verdicts` scoped via join to `requisitos → analyses.company_id`. `procesos` and `procesos_index` grant SELECT to any `authenticated` user; `companies` and `users` have self-referential policies | US-04 | RN-002, RN-003, RN-015 |
| REQ-012 | Create indexes: `btree` on all FK columns; `ivfflat` on `procesos_index.embedding vector_cosine_ops`; `GIN` on `procesos.datos_gov_snapshot` and `analyses.proceso_metadata_snapshot`; `btree` on `procesos.numero_proceso`, `procesos_index.numero_proceso`, `pliego_uploads.file_sha256`, `analyses.company_id + created_at` | US-01, US-03 | RN-001 |
| REQ-013 | Provide a seed migration demonstrating multi-tenant isolation: insert two companies with distinct users, one shared proceso, and two pliego_upload + analysis rows — verify RLS blocks cross-company reads | US-04 | RN-015 |

### Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Security | RLS policies on all tenant tables must block cross-company reads; no service-role bypass for tenant-scoped reads |
| NFR-02 | Consistency | All column names use `snake_case`; Spanish domain terms (`numero_proceso`, `entidad`, `objeto_a_contratar`, `proceso_lookup_status`) used verbatim |
| NFR-03 | Performance | Migration applies cleanly on a fresh Supabase project in < 10s; `ivfflat` index on embedding created after at least 100 rows or with `PRAGMA` noting empty-table creation |
| NFR-04 | Auditability | Every analysis row is immutable post-INSERT; re-runs create new rows; `proceso_metadata_snapshot` snapshot is written at INSERT time |
| NFR-05 | Reproducibility | Verdicts remain reproducible after file deletion because `proceso_metadata_snapshot` (JSONB) is retained indefinitely on `analyses` rows |

---

## Business Rules

| Rule | Description |
|------|-------------|
| RN-001 | `pgvector` extension MUST be enabled before `procesos_index` DDL; `uuid-ossp` MUST be enabled if `gen_random_uuid()` is not available in the target Postgres version |
| RN-002 | RLS MUST be declared at table-creation time, not retroactively. Every tenant table MUST have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in the same migration that creates it |
| RN-003 | One user belongs to exactly one company in MVP. The `users` table FK to `companies` enforces this. The `users` table mirrors `auth.users` identity — it is not a replacement |
| RN-004 | `company_profiles` is the single source of truth for semáforo matching. The pipeline snapshot at analysis time must read from `company_profiles` — not from a stale cache |
| RN-005 | `procesos` is shared infrastructure — NOT tenant-scoped. Multiple companies can reference the same `numero_proceso` row. Queries for "my Procesos" MUST join through `analyses.company_id` or `pliego_uploads.uploaded_by_company_id`, never through `procesos` directly |
| RN-006 | `proceso_lookup_status` MUST be set on every `analyses` row: `verified` (datos.gov.co returned metadata), `unverified` (user entered manually, no API confirmation), `failed` (API call attempted but errored). `unverified` must be surfaced in the UI |
| RN-007 | `procesos_index` stores currently-open Procesos synced every 6 hours from datos.gov.co. The `embedding` column stores OpenAI `text-embedding-3-small` output (1536 dimensions) on `objeto_a_contratar`. Rows without an embedding are valid (sync lag) but excluded from vector search |
| RN-008 | Every `pliego_uploads` row MUST record `file_sha256`, `uploaded_by_company_id`, `uploader_ip`, `uploaded_at`, and `declaration_accepted_at`. These fields are NOT nullable once the upload is confirmed — the schema enforces the audit trail |
| RN-009 | Hash collision across companies is intentional — if two companies upload the same pliego PDF (identical SHA-256), both get their own `pliego_uploads` row linked to the same `proceso_id`. This is correct behavior, not an error |
| RN-010 | `analyses` rows are INSERT-only. Re-running an analysis creates a new row; the old row is never mutated. This is enforced by convention (no UPDATE path in the pipeline) and observable via `created_at` sequence |
| RN-011 | `analyses.proceso_metadata_snapshot` stores the full datos.gov.co JSON response at INSERT time. The snapshot must NOT be re-fetched from the live API for historical verdicts |
| RN-012 | `analyses` retains rows indefinitely — the JSONB snapshot makes the verdict reproducible after the pliego file is auto-deleted from storage (90-day TTL) |
| RN-013 | `requisitos.tipo` is restricted to `juridico`, `tecnico`, `financiero`. The domain also uses `experiencia` as a sub-type of `financiero`; in the DB layer it collapses to `financiero` per the MVP simplification |
| RN-014 | `verdicts.verdict` values are `verde` (cumple), `amarillo` (cumple parcialmente), `rojo` (no cumple). The semáforo is computed by deterministic rules in the application layer — NOT by the LLM |
| RN-015 | RLS policy pattern for tenant tables: `USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))`. For `requisitos` and `verdicts`, the join chain is: `verdicts → requisitos.analysis_id → analyses.company_id` |

---

## Test Cases

### TC-001 — pgvector extension accepts vector(1536) insert (REQ-001, REQ-006, RN-001)

**Given** the migration applied to a fresh Supabase project
**When** a `procesos_index` row is inserted with a valid `embedding` array of 1536 floats
**Then** the insert succeeds and the row is retrievable

### TC-002 — procesos is shared across companies (REQ-005, RN-005)

**Given** one `procesos` row with `numero_proceso = 'AAA-001'`
**And** two authenticated users from different companies
**When** each user executes `SELECT * FROM procesos WHERE numero_proceso = 'AAA-001'`
**Then** both queries return the same row

### TC-003 — RLS blocks cross-company read on pliego_uploads (REQ-011, RN-002, RN-015)

**Given** company A has uploaded a pliego and company B has uploaded a different pliego for the same proceso
**When** a user of company A executes `SELECT * FROM pliego_uploads`
**Then** only company A's row is returned; company B's row is invisible

### TC-004 — RLS blocks cross-company read on analyses (REQ-011, RN-002, RN-015)

**Given** company A and company B each have one analysis row for the same proceso
**When** a user of company A executes `SELECT * FROM analyses`
**Then** only company A's analysis is returned

### TC-005 — RLS blocks cross-company read on requisitos (REQ-011, RN-015)

**Given** company A's analysis produced 5 requisitos; company B's analysis produced 3 requisitos
**When** a user of company B executes `SELECT * FROM requisitos`
**Then** only company B's 3 requisitos are returned

### TC-006 — RLS blocks cross-company read on verdicts (REQ-011, RN-015)

**Given** company A and company B each have verdicts for their respective requisitos
**When** a user of company A executes `SELECT * FROM verdicts`
**Then** only verdicts linked to company A's requisitos are returned

### TC-007 — pliego_uploads CHECK rejects invalid status (REQ-007, RN-008)

**Given** the migration is applied
**When** a `pliego_uploads` row is inserted with `status = 'deleted'`
**Then** Postgres rejects with a CHECK constraint violation

**When** inserted with `status = 'active'`, `'flagged'`, or `'superseded'`
**Then** each insert succeeds

### TC-008 — analyses CHECK rejects invalid proceso_lookup_status (REQ-008, RN-006)

**Given** the migration is applied
**When** an `analyses` row is inserted with `proceso_lookup_status = 'pending'`
**Then** Postgres rejects with a CHECK constraint violation

**When** inserted with `'verified'`, `'unverified'`, or `'failed'`
**Then** each insert succeeds

### TC-009 — analyses CHECK rejects invalid verdict (REQ-008, RN-014)

**Given** the migration is applied
**When** an `analyses` row is inserted with `verdict = 'yellow'`
**Then** Postgres rejects with a CHECK constraint violation

**When** inserted with `verdict = 'verde'`, `'amarillo'`, or `'rojo'`
**Then** each insert succeeds

### TC-010 — analyses row is immutable (REQ-008, RN-010)

**Given** an `analyses` row exists with `verdict = 'rojo'`
**When** the pipeline attempts `UPDATE analyses SET verdict = 'verde' WHERE id = ...` (service-role)
**Then** the update succeeds at the DB layer (immutability is convention-enforced)
**And** a new analysis row is always created instead of updating the existing row

### TC-011 — SHA-256 collision across companies is accepted (REQ-007, RN-009)

**Given** company A has a `pliego_uploads` row with `file_sha256 = 'abc123'` for proceso P1
**When** company B inserts a `pliego_uploads` row with the same `file_sha256 = 'abc123'` for proceso P1
**Then** the insert succeeds — two distinct rows with the same hash but different `uploaded_by_company_id`

### TC-012 — requisitos tipo CHECK rejects unknown value (REQ-009, RN-013)

**Given** the migration is applied
**When** a `requisitos` row is inserted with `tipo = 'experiencia'`
**Then** Postgres rejects with a CHECK constraint violation (maps to `financiero` in the DB layer)

**When** inserted with `tipo = 'juridico'`, `'tecnico'`, or `'financiero'`
**Then** each insert succeeds

### TC-013 — verdicts verdict CHECK rejects unknown value (REQ-010, RN-014)

**Given** the migration is applied
**When** a `verdicts` row is inserted with `verdict = 'green'`
**Then** Postgres rejects with a CHECK constraint violation

**When** inserted with `'verde'`, `'amarillo'`, or `'rojo'`
**Then** each insert succeeds

### TC-014 — ivfflat index on embedding is created (REQ-012, NFR-03)

**Given** the migration is applied on a fresh database
**When** `SELECT indexname FROM pg_indexes WHERE tablename = 'procesos_index' AND indexname LIKE '%embedding%'`
**Then** the index row is returned

### TC-015 — Seed migration demonstrates cross-company isolation end-to-end (REQ-013, RN-015)

**Given** the seed migration has run (two companies, two users, one shared proceso, two pliego_upload + analysis rows)
**When** each user queries `pliego_uploads`, `analyses`, `requisitos`, `verdicts`
**Then** each user sees only their own company's rows

---

## UX/UI

No UI. Developer-facing foundation feature. All tables consumed by downstream features.

---

## Architecture

### Architecture Decision Records

| ADR | Title | Impact |
|-----|-------|--------|
| ADR-003 | Supabase RLS for tenant isolation | All tenant tables use `company_id` RLS; `procesos` and `procesos_index` are public-read with `authenticated` check only |
| ADR-001 | Kysely as query builder | Column names defined here must match the Kysely `Database` interface in `domain-model-primitives` (if reused) or a new `Database` interface for the MVP schema |

### Tradeoffs

| Tradeoff | We chose | Over | Rationale |
|----------|----------|------|-----------|
| Tenant isolation layer | Postgres RLS | Application middleware | Survives direct DB access, admin queries, future services |
| Analysis immutability | INSERT-only convention | Status machine with UPDATE | Simplest audit trail; new row = new evidence; no state machine complexity in MVP |
| JSONB snapshots | `datos_gov_snapshot` + `proceso_metadata_snapshot` | Live re-fetch | Reproducibility requires the exact data that drove the verdict — live data changes post-analysis |
| Hash collision policy | Accept duplicate SHA-256 across companies | Cross-table dedup | Collision informs future shared-pool design; surfacing it to users would be incorrect |
| `procesos_index` as separate table | Separate denormalized table | Embed in `procesos` | Sync cadence and embedding lifecycle differ from the canonical `procesos` record |

### Performance Goals & Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Migration apply time | < 10s on empty DB | `supabase db push` timing in dev |
| Vector similarity query (p95) | < 500ms at MVP scale (≤50k rows) | `EXPLAIN ANALYZE` on cosine distance query |

### Data Model

```mermaid
erDiagram
    companies {
        uuid id PK
        text name
        text nit UK
        timestamptz created_at
        timestamptz updated_at
    }
    users {
        uuid id PK
        uuid company_id FK
        text role
        timestamptz created_at
    }
    company_profiles {
        uuid id PK
        uuid company_id FK
        jsonb juridica
        jsonb financiera
        jsonb experiencia
        jsonb capacidad_tecnica
        timestamptz updated_at
    }
    procesos {
        uuid id PK
        text numero_proceso UK
        text entidad
        text objeto_a_contratar
        text modalidad
        numeric valor_estimado
        timestamptz fecha_apertura
        timestamptz fecha_cierre
        jsonb datos_gov_snapshot
        text proceso_lookup_status
        timestamptz created_at
        timestamptz updated_at
    }
    procesos_index {
        uuid id PK
        text numero_proceso UK
        text entidad
        text objeto_a_contratar
        text modalidad
        numeric cuantia_proceso
        timestamptz fecha_de_publicacion_del_proceso
        timestamptz fecha_limite_de_recepcion
        vector embedding
        timestamptz synced_at
    }
    pliego_uploads {
        uuid id PK
        uuid proceso_id FK
        uuid uploaded_by_company_id FK
        text file_sha256
        text file_storage_key
        timestamptz uploaded_at
        text uploader_ip
        timestamptz declaration_accepted_at
        text declaration_text_version
        text status
    }
    analyses {
        uuid id PK
        uuid proceso_id FK
        uuid company_id FK
        uuid pliego_upload_id FK
        jsonb proceso_metadata_snapshot
        text proceso_lookup_status
        text verdict
        text estado
        timestamptz created_at
        timestamptz completed_at
        int input_tokens
        int output_tokens
        int cached_tokens
        numeric cost_usd
        int latency_ms
    }
    requisitos {
        uuid id PK
        uuid analysis_id FK
        text tipo
        text texto
        int pagina_fuente
        text quote_fuente
        numeric confidence_score
        timestamptz created_at
    }
    verdicts {
        uuid id PK
        uuid requisito_id FK
        text verdict
        text reason
        numeric confidence
        timestamptz created_at
    }
    companies ||--o{ users : "has members"
    companies ||--o{ company_profiles : "has profile"
    companies ||--o{ pliego_uploads : "uploads"
    companies ||--o{ analyses : "runs"
    procesos ||--o{ pliego_uploads : "receives uploads"
    procesos ||--o{ analyses : "analyzed by"
    pliego_uploads ||--o{ analyses : "drives"
    analyses ||--o{ requisitos : "extracts"
    requisitos ||--o{ verdicts : "receives verdict"
```

### API / Data Contracts

No HTTP endpoints. Migration files under `supabase/migrations/`.

### Service Integrations

| System | Direction | Data |
|--------|-----------|------|
| Supabase Postgres | Write | DDL migrations + RLS policies + indexes |
| Supabase Storage | Convention | Per-tenant prefix `companies/<company_id>/pliegos/<sha256>.pdf`; policies declared separately |
| `ingesta-secop` | Downstream consumer | Reads/writes `procesos_index` (sync job) and `procesos` (upsert on lookup) |
| `pliego-upload` | Downstream consumer | Inserts `pliego_uploads` rows |
| `requisitos-extraction` | Downstream consumer | Inserts `analyses` and `requisitos` rows |
| `semaforo-aggregation` | Downstream consumer | Inserts `verdicts` rows; updates `analyses.verdict` and `analyses.estado` |
| `company-profiling-onboarding` | Downstream consumer | Inserts/updates `company_profiles` |

---

## Dependencies

| Dependency | Relationship | Notes |
|------------|-------------|-------|
| `domain-model-primitives` | Parallel reference | TypeScript/Zod types — column names must stay aligned (snake_case) |
| `domain-model-postgres` | Upstream (different schema) | Implements the original empresa/proceso/pliego schema. This spec defines the MVP schema separately; they coexist in different migration files during the transition |
| `domain-model-extraction-contracts` | Upstream | `RequisitoExtractionPayloadSchema`, `Semaforo` types remain valid; `tipo` mapping (`juridico|tecnico|financiero`) applies here |

---

## Revision Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-04 | Initial spec created | New discovery-first domain model from 2026-05-04 pilot-research: `companies`, `users`, `company_profiles`, `procesos`, `procesos_index` (pgvector), `pliego_uploads`, `analyses`, `requisitos`, `verdicts` |
