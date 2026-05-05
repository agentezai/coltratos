# secop-ingestion-and-listing — Overview

## Spec Reference

[Spec](../spec/spec.md)

## Problem + Solution

- COLTRATOS listing module consumes mock data — no real procesos shown
- Pilots waste time browsing SECOP's slow portal; semantic search over `objeto_a_contratar` not available there
- Solution: Cron polls SODA API incrementally every 6 hours → local `secop_procesos` table → embeddings via OpenAI → `/api/procesos` endpoint (structural SQL or vector search) → frontend
- SODA and OpenAI are never on the user-facing request path; latency and quota risk stay in the cron layer

## Architecture

```mermaid
flowchart TD
    SODA["datos.gov.co\nSODA API (p6dx-8zbt)"]
    Cron["Cron (every 6h)"]
    CronRoute["GET /api/cron/sync-secop"]
    Client["lib/secop/client.ts"]
    Mapper["lib/secop/mapper.ts"]
    Embedder["lib/secop/embeddings.ts"]
    OpenAI["OpenAI\ntext-embedding-3-small"]
    DB[("Supabase\nsecop_procesos\nsecop_sync_state\nembedding_cost_log\nsearch_log")]
    ProcesosRoute["GET /api/procesos"]
    EmpresaDB[("Supabase\nproceso / pliego / analisis\ncompany_profiles")]
    Frontend["procesos-listing spec"]

    Cron -->|Bearer secret| CronRoute
    CronRoute --> Client
    Client -->|SoQL :updated_at cursor| SODA
    SODA -->|JSON rows| Mapper
    Mapper -->|upsert batch 500| DB
    CronRoute -->|DELETE fecha_cierre < now| DB
    CronRoute --> Embedder
    Embedder -->|new/changed rows| OpenAI
    OpenAI -->|vector 1536d| Embedder
    Embedder -->|UPDATE embedding + cost log| DB
    CronRoute -->|update sync_state| DB

    Frontend -->|query params + profile_match| ProcesosRoute
    ProcesosRoute -->|if q: embed query| OpenAI
    ProcesosRoute -->|cosine sim or SQL| DB
    ProcesosRoute -->|get_empresa_enrichment + company_profiles| EmpresaDB
    ProcesosRoute -->|INSERT search_log| DB
    ProcesosRoute -->|JSON + pagination + stats + enrichment| Frontend
```

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| P1 | [01-plan-P1-schema-env.md](./01-plan-P1-schema-env.md) | DB migration (secop_procesos + embedding column + search_log + embedding_cost_log) + env vars | None |
| P2 | [01-plan-P2-soda-client.md](./01-plan-P2-soda-client.md) | `lib/secop/types.ts` + `soql.ts` + `client.ts` + `mapper.ts` | P1 |
| P3 | [01-plan-P3-cron-sync.md](./01-plan-P3-cron-sync.md) | `/api/cron/sync-secop` route + pruning + 6h cron config | P1, P2 |
| P5 | [01-plan-P5-embeddings.md](./01-plan-P5-embeddings.md) | `lib/secop/embeddings.ts` + change-detection + cost logging | P1, P3 |
| P4 | [01-plan-P4-procesos-endpoint.md](./01-plan-P4-procesos-endpoint.md) | `GET /api/procesos` (vector search + profile-match + search logging) | P1, P5 |

> Frontend redesign: `procesos-listing` spec (depends on P4 types being frozen).

## Dependency Graph

```mermaid
flowchart LR
    P1["P1: Schema + Env"]
    P2["P2: SODA Client"]
    P3["P3: Cron Sync"]
    P5["P5: Embeddings"]
    P4["P4: /api/procesos"]
    PL["procesos-listing spec"]

    P1 --> P2
    P1 --> P4
    P2 --> P3
    P3 --> P5
    P5 --> P4
    P4 --> PL

    style P1 fill:#d4edda
    style P2 fill:#d4edda
    style P3 fill:#d4edda
    style P5 fill:#d4edda
    style P4 fill:#d4edda
    style PL fill:#cce5ff
```

P2 can start as soon as P1 is done. P3 requires P2. P5 requires P3 (cron route must call embedder). P4 can start in parallel with P5 but the vector search path requires P5 to be merged first.
