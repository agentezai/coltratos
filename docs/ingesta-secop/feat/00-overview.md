# secop-ingestion-and-listing — Overview

## Spec Reference

[Spec](../spec/spec.md)

## Problem + Solution

- COLTRATOS listing module consumes mock data — no real procesos shown
- Solution: Vercel Cron polls SODA API incrementally → local `secop_procesos` table → `/api/procesos` endpoint → frontend
- SODA is never on the user-facing request path; latency and quota risk stay in the cron layer

## Architecture

```mermaid
flowchart TD
    SODA["datos.gov.co\nSODA API (p6dx-8zbt)"]
    Cron["Vercel Cron (every 30min)"]
    CronRoute["GET /api/cron/sync-secop"]
    Client["lib/secop/client.ts"]
    Mapper["lib/secop/mapper.ts"]
    DB[("Supabase\nsecop_procesos\nsecop_sync_state")]
    ProcesosRoute["GET /api/procesos"]
    EmpresaDB[("Supabase\nproceso / pliego / analisis")]
    Frontend["procesos-listing spec"]

    Cron -->|Bearer secret| CronRoute
    CronRoute --> Client
    Client -->|SoQL :updated_at cursor| SODA
    SODA -->|JSON rows| Mapper
    Mapper -->|upsert batch 500| DB
    CronRoute -->|update sync_state| DB

    Frontend -->|query params + filters| ProcesosRoute
    ProcesosRoute -->|SECOP query| DB
    DB -->|rows| ProcesosRoute
    ProcesosRoute -->|get_empresa_enrichment| EmpresaDB
    EmpresaDB -->|has_pliego, last_sem| ProcesosRoute
    ProcesosRoute -->|JSON + pagination + stats + enrichment| Frontend
```

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| P1 | [01-plan-P1-schema-env.md](./01-plan-P1-schema-env.md) | DB migration + `get_empresa_enrichment` fn + Supabase types + env vars | None |
| P2 | [01-plan-P2-soda-client.md](./01-plan-P2-soda-client.md) | `lib/secop/types.ts` + `soql.ts` + `client.ts` + `mapper.ts` | P1 |
| P3 | [01-plan-P3-cron-sync.md](./01-plan-P3-cron-sync.md) | `/api/cron/sync-secop` route + `vercel.json` cron config | P1, P2 |
| P4 | [01-plan-P4-procesos-endpoint.md](./01-plan-P4-procesos-endpoint.md) | `GET /api/procesos` with filters, enrichment, stats, pagination, sort | P1 |

> Frontend redesign: `procesos-listing` spec (depends on this spec's P4).

## Dependency Graph

```mermaid
flowchart LR
    P1["P1: Schema + Env"]
    P2["P2: SODA Client"]
    P3["P3: Cron Sync"]
    P4["P4: /api/procesos"]
    PL["procesos-listing spec"]

    P1 --> P2
    P1 --> P4
    P2 --> P3
    P4 --> PL

    style P1 fill:#d4edda
    style P2 fill:#d4edda
    style P3 fill:#d4edda
    style P4 fill:#d4edda
    style PL fill:#cce5ff
```

P2 and P4 can run in parallel after P1. P3 is independent of P4. `procesos-listing` depends on P4 types being frozen.
