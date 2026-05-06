# procesos-listing — Overview

## Spec Reference

[Spec](../spec/spec.md)

## Problem + Solution

- Procesos page consumed mock data; no real SECOP rows, no semantic search, no company-profile filtering
- ingesta-secop was a separate spec covering sync + embedding + endpoint — merged here in rev 3
- Solution: B1–B5 backend tasks build the full sync + search stack; T1–T6 frontend tasks wire the UI

## System Architecture

```mermaid
flowchart LR
    SODA["datos.gov.co\nSODA API"]
    Cron["B3: Cron sync\n/api/cron/sync-secop\n(every 6h via Vercel cron)"]
    Embed["B4: Embeddings\nlib/secop/embeddings.ts"]
    OAI["OpenAI\ntext-embedding-3-small"]
    PIdx[("procesos_index\n(pgvector 1536-dim)")]
    EP["B5: /api/procesos\n(vector or SQL path)"]
    FE["T1–T5: ProcesosPageClient\n/dashboard/procesos"]
    CL["T6: /api/search-events\n(click logging)"]
    Tel[("search_events\nembedding_events")]
    CP[("company_profiles")]

    SODA -->|B2: mapSodaRow| Cron
    Cron -->|upsert + prune| PIdx
    Cron -->|enqueue changed| Embed
    Embed --> OAI
    OAI --> Embed
    Embed -->|UPDATE embedding, embedded_at| PIdx
    Embed -->|logEmbeddingEvent| Tel
    FE -->|GET /api/procesos| EP
    CP -->|profile-match filters| EP
    EP -->|cosine or SQL| PIdx
    EP -->|logSearchEvent + logEmbeddingEvent| Tel
    EP -->|ProcesosResponse| FE
    FE -->|row click| CL
    CL -->|array_append clicked_ids| Tel
```

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| B1 | [01-plan-B1-schema-env.md](./01-plan-B1-schema-env.md) | Confirm domain-model-mvp rev 3 landed; set env vars | domain-model-mvp rev 3 merged |
| B2 | [01-plan-B2-soda-client.md](./01-plan-B2-soda-client.md) | SODA HTTP client, mapper (`id_proceso` → `numero_proceso`), SOQL builder | B1 |
| B3 | [01-plan-B3-cron-sync.md](./01-plan-B3-cron-sync.md) | Cron route: fetch, upsert, prune; enqueue for B4 | B2 |
| B4 | [01-plan-B4-embeddings.md](./01-plan-B4-embeddings.md) | Embed new/changed rows; write `embedding_events` | B3, OpenAI key set |
| B5 | [01-plan-B5-procesos-endpoint.md](./01-plan-B5-procesos-endpoint.md) | `/api/procesos` vector + SQL paths; profile-match; telemetry | B4 |
| T1 | [01-plan-T1-types-filter-state.md](./01-plan-T1-types-filter-state.md) | Filter state type, URL serializer/deserializer, localStorage helper | B5 types frozen |
| T2 | [01-plan-T2-fetch-hook.md](./01-plan-T2-fetch-hook.md) | `useProcesosQuery` hook: both search paths, match_score, abort | T1 |
| T3 | [01-plan-T3-table-redesign.md](./01-plan-T3-table-redesign.md) | `ProcesosTable` + `ProcesoRow`: columns, badges, match_score chip | T2 |
| T4 | [01-plan-T4-filters.md](./01-plan-T4-filters.md) | `ProcesosFilters`: profile_match toggle, UNSPSC, fecha range | T1 |
| T5 | [01-plan-T5-page-wiring.md](./01-plan-T5-page-wiring.md) | Wire page.tsx; stat cards; remove mock; direct ID lookup | T2, T3, T4 |
| T6 | [01-plan-T6-click-logging.md](./01-plan-T6-click-logging.md) | `/api/search-events` route: records clicked `numero_proceso` IDs | T5 |

## Dependency Graph

```mermaid
flowchart LR
    DM["domain-model-mvp rev 3\n(external dependency)"]
    B1["B1: Schema + Env"]
    B2["B2: SODA Client"]
    B3["B3: Cron Sync"]
    B4["B4: Embeddings"]
    B5["B5: Procesos Endpoint"]
    T1["T1: Types + Filter State"]
    T2["T2: Fetch Hook"]
    T3["T3: Table Redesign"]
    T4["T4: Filter Bar"]
    T5["T5: Page Wiring"]
    T6["T6: Click Logging"]

    DM --> B1
    B1 --> B2
    B2 --> B3
    B3 --> B4
    B4 --> B5
    B5 --> T1
    T1 --> T2
    T1 --> T4
    T2 --> T3
    T2 --> T5
    T3 --> T5
    T4 --> T5
    T5 --> T6
```

B1 is the gate. B2–B5 are linear (each depends on previous). T1–T6 are parallel where shown. T6 is the analytics tail.
