# domain-model-mvp — Implementation Overview

## Spec Reference

[Spec](../spec/spec.md)

## Problem + Solution

- The COLTRATOS MVP needs a complete, production-ready Supabase schema that supports discovery (pgvector semantic search), pliego upload with legal audit trail, LLM-driven extraction, deterministic semáforo verdicts, and per-analysis cost observability — all with strict multi-tenant isolation
- Solution: one versioned SQL migration per logical group, applied in dependency order, covering 9 tables with RLS policies, indexes (btree, GIN, ivfflat), and a seed migration demonstrating cross-company isolation
- All tables use `uuid` PKs with `gen_random_uuid()`, `timestamptz` timestamps, and explicit `ON DELETE` semantics; no implicit defaults
- Deliverable: Supabase migration files under `supabase/migrations/` that apply cleanly on a fresh project

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Extensions["T1: Extensions"]
        EXT["pgvector + uuid-ossp"]
    end

    subgraph Tenant_Root["T2: Tenant Root Tables"]
        CO["companies"]
        US["users"]
        CP["company_profiles"]
    end

    subgraph Public_Tables["T3: Public (Shared) Tables"]
        PR["procesos"]
        PI["procesos_index + embedding vector(1536)"]
    end

    subgraph Audit_Tables["T4: Audit + Upload Tables"]
        PU["pliego_uploads"]
        AN["analyses"]
    end

    subgraph Extraction_Tables["T5: Extraction + Verdict Tables"]
        RQ["requisitos"]
        VD["verdicts"]
    end

    subgraph RLS["T6: RLS Policies"]
        RLSP["Policies on all tenant tables"]
    end

    subgraph Indexes["T7: Indexes"]
        IDX["btree FKs + GIN JSONB + ivfflat embedding"]
    end

    subgraph Seed["T8: Seed Migration"]
        SEED["2-company isolation demo"]
    end

    EXT --> Tenant_Root
    EXT --> Public_Tables
    Tenant_Root --> Audit_Tables
    Public_Tables --> Audit_Tables
    Audit_Tables --> Extraction_Tables
    Extraction_Tables --> RLS
    RLS --> Indexes
    Indexes --> Seed
```

## Data Model

Nine tables across three tenancy zones:

```mermaid
classDiagram
    class companies {
        +uuid id PK
        +text name
        +text nit UK
        +timestamptz created_at
        +timestamptz updated_at
    }
    class users {
        +uuid id PK
        +uuid company_id FK
        +text role
        +timestamptz created_at
    }
    class company_profiles {
        +uuid id PK
        +uuid company_id FK
        +jsonb juridica
        +jsonb financiera
        +jsonb experiencia
        +jsonb capacidad_tecnica
        +timestamptz updated_at
    }
    class procesos {
        +uuid id PK
        +text numero_proceso UK
        +jsonb datos_gov_snapshot
        +text proceso_lookup_status
    }
    class procesos_index {
        +uuid id PK
        +text numero_proceso UK
        +vector embedding
        +timestamptz synced_at
    }
    class pliego_uploads {
        +uuid id PK
        +uuid proceso_id FK
        +uuid uploaded_by_company_id FK
        +text file_sha256
        +text status
    }
    class analyses {
        +uuid id PK
        +uuid proceso_id FK
        +uuid company_id FK
        +uuid pliego_upload_id FK
        +jsonb proceso_metadata_snapshot
        +text proceso_lookup_status
        +numeric cost_usd
    }
    class requisitos {
        +uuid id PK
        +uuid analysis_id FK
        +text tipo
        +text texto
    }
    class verdicts {
        +uuid id PK
        +uuid requisito_id FK
        +text verdict
        +text reason
    }

    companies "1" --> "*" users
    companies "1" --> "0..1" company_profiles
    companies "1" --> "*" pliego_uploads
    companies "1" --> "*" analyses
    procesos "1" --> "*" pliego_uploads
    procesos "1" --> "*" analyses
    pliego_uploads "1" --> "*" analyses
    analyses "1" --> "*" requisitos
    requisitos "1" --> "0..1" verdicts
```

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| T1 | [01-plan-T1-extensions.md](./01-plan-T1-extensions.md) | Enable pgvector and uuid-ossp extensions | None |
| T2 | [01-plan-T2-tenant-root.md](./01-plan-T2-tenant-root.md) | Create companies, users, company_profiles tables | T1 |
| T3 | [01-plan-T3-public-tables.md](./01-plan-T3-public-tables.md) | Create procesos and procesos_index (no RLS) | T1 |
| T4 | [01-plan-T4-audit-tables.md](./01-plan-T4-audit-tables.md) | Create pliego_uploads and analyses with FKs | T2, T3 |
| T5 | [01-plan-T5-extraction-tables.md](./01-plan-T5-extraction-tables.md) | Create requisitos and verdicts with FKs | T4 |
| T6 | [01-plan-T6-rls-policies.md](./01-plan-T6-rls-policies.md) | RLS policies for all tenant tables | T2, T4, T5 |
| T7 | [01-plan-T7-indexes.md](./01-plan-T7-indexes.md) | Indexes: btree on FKs, GIN on JSONB, ivfflat on embedding | T1–T5 |
| T8 | [01-plan-T8-seed.md](./01-plan-T8-seed.md) | Seed migration demonstrating 2-company isolation | T6, T7 |

## Dependency Graph

```mermaid
flowchart LR
    T1["T1: Extensions"]
    T2["T2: Tenant Root"]
    T3["T3: Public Tables"]
    T4["T4: Audit Tables"]
    T5["T5: Extraction Tables"]
    T6["T6: RLS Policies"]
    T7["T7: Indexes"]
    T8["T8: Seed"]

    T1 --> T2
    T1 --> T3
    T2 --> T4
    T3 --> T4
    T4 --> T5
    T5 --> T6
    T2 --> T6
    T4 --> T6
    T5 --> T7
    T1 --> T7
    T6 --> T8
    T7 --> T8

    style T1 fill:#d4edda
    style T2 fill:#d4edda
    style T3 fill:#d4edda
    style T4 fill:#d4edda
    style T5 fill:#d4edda
    style T6 fill:#d4edda
    style T7 fill:#d4edda
    style T8 fill:#d4edda
```
