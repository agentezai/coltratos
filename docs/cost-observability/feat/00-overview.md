# cost-observability — Feature Overview

## Spec Reference

[Spec](../spec/spec.md)

## Problem + Solution

- No structured telemetry exists; the $0.04/analysis cost ceiling and the four discovery success metrics are unverifiable during the pilot period.
- Solution: append-only Postgres telemetry tables (`analysis_events`, `embedding_events`, `search_events`) + a `TelemetryLogger` module wired into every pipeline and service + an internal admin dashboard at `/admin/observability` + a daily alert cron.
- Key technical approach: fire-and-forget Supabase inserts from a shared `TelemetryLogger`; service-role-gated Next.js admin route for dashboard reads; Supabase/Vercel cron for alerts.
- Output: three new telemetry tables (via `domain-model-mvp` rev 2 migration), one TypeScript module, one admin dashboard page, one alert cron route, and wiring in four existing services.

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Producers
        P1["requisitos-extraction\n(LLM calls)"]
        P2["semaforo-aggregation\n(matching stage)"]
        P3["ingesta-secop\n(embedding sync)"]
        P4["procesos-listing\n(search + embedding)"]
    end

    subgraph TelemetryLib["src/lib/telemetry/"]
        TL["TelemetryLogger\nlogAnalysisEvent()\nlogEmbeddingEvent()\nlogSearchEvent()"]
        PC["computeAnalysisCost()\ncomputeEmbeddingCost()\nPRICING constant"]
    end

    subgraph DB["Postgres (Supabase)"]
        AE[("analysis_events")]
        EE[("embedding_events")]
        SE[("search_events")]
    end

    subgraph Dashboard["Next.js (App Router)"]
        AR["/admin/observability\n(server component)"]
        AC["/api/cron/alert-check\n(cron route)"]
    end

    Notify["Email / Slack Webhook"]

    P1 -->|logAnalysisEvent| TL
    P2 -->|logAnalysisEvent| TL
    P3 -->|logEmbeddingEvent| TL
    P4 -->|logEmbeddingEvent\nlogSearchEvent| TL
    TL --> PC
    TL -->|fire-and-forget| AE
    TL -->|fire-and-forget| EE
    TL -->|fire-and-forget| SE
    AR -->|service-role query| AE
    AR -->|service-role query| EE
    AR -->|service-role query| SE
    AC -->|service-role query| AE
    AC -->|threshold breach| Notify

    style TL fill:#e1f5ff
    style PC fill:#e1f5ff
    style AR fill:#fff4e1
    style AC fill:#fff4e1
```

## Data Model

Three new append-only tables added via `domain-model-mvp` rev 2 migration. No new entities on
the user-facing domain model — these tables are internal telemetry only.

```mermaid
classDiagram
    class analysis_events {
        +uuid id PK
        +uuid analysis_id FK
        +text event_type
        +text stage
        +timestamptz started_at
        +timestamptz completed_at
        +int input_tokens
        +int output_tokens
        +int cached_tokens
        +int uncached_tokens
        +numeric cost_usd
        +text model
        +jsonb metadata
    }
    class embedding_events {
        +uuid id PK
        +uuid company_id nullable
        +text use_case
        +int input_tokens
        +numeric cost_usd
        +text model
        +timestamptz created_at
    }
    class search_events {
        +uuid id PK
        +uuid company_id FK
        +text query_text
        +jsonb filters
        +int result_count
        +uuid_array clicked_ids
        +timestamptz created_at
    }
    class analyses {
        +uuid id PK
        +uuid company_id FK
        +numeric cost_usd
        +int latency_ms
        +text estado
    }
    analyses "1" --> "*" analysis_events
```

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| T1 | [01-plan-01-schema-migration.md](./01-plan-01-schema-migration.md) | domain-model-mvp rev 2: add telemetry tables + RLS | None (schema foundation) |
| T2 | [01-plan-02-telemetry-logger.md](./01-plan-02-telemetry-logger.md) | `TelemetryLogger` module with pricing + fire-and-forget helpers | T1 |
| T3 | [01-plan-03-analysis-pipeline-wiring.md](./01-plan-03-analysis-pipeline-wiring.md) | Wire `logAnalysisEvent` into requisitos-extraction and semaforo-aggregation | T2 |
| T4 | [01-plan-04-embedding-search-wiring.md](./01-plan-04-embedding-search-wiring.md) | Wire `logEmbeddingEvent` + `logSearchEvent` into ingesta-secop and procesos-listing | T2 |
| T5 | [01-plan-05-admin-dashboard.md](./01-plan-05-admin-dashboard.md) | `/admin/observability` Next.js admin route with four metric sections | T1 |
| T6 | [01-plan-06-alert-cron.md](./01-plan-06-alert-cron.md) | Daily alert cron route checking cost and latency thresholds | T1, T5 |

## Dependency Graph

```mermaid
flowchart LR
    T1["T1: Schema migration"]
    T2["T2: TelemetryLogger"]
    T3["T3: Analysis pipeline wiring"]
    T4["T4: Embedding + search wiring"]
    T5["T5: Admin dashboard"]
    T6["T6: Alert cron"]

    T1 --> T2
    T2 --> T3
    T2 --> T4
    T1 --> T5
    T1 --> T6
    T5 --> T6

    style T1 fill:#d4edda
    style T2 fill:#d4edda
    style T3 fill:#d4edda
    style T4 fill:#d4edda
    style T5 fill:#d4edda
    style T6 fill:#d4edda
```
