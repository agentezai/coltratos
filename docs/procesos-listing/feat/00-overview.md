# procesos-listing — Overview

## Spec Reference

[Spec](../spec/spec.md)

## Problem + Solution

- Procesos page consumes mock data; no real SECOP rows, no empresa enrichment
- Pilots waste time browsing SECOP's slow portal; no semantic search or profile-based filtering available there
- Solution: replace mock with `useProcesosQuery` hook → `/api/procesos`; URL as filter state; semantic match score display; profile-match toggle; click logging; stat cards from `response.stats`; empresa badges from enrichment fields

## Architecture

```mermaid
flowchart LR
    URL["URL params\nsource of truth"]
    Filters["ProcesosFilters\n(departamento, modalidad,\nUNSPSC, valor, fecha,\nq, profile_match toggle)"]
    Hook["useProcesosQuery\n(structural or vector path)"]
    API["GET /api/procesos\n(ingesta-secop P4+P5)"]
    Table["ProcesosTable\n(match_score col)"]
    Cards["ProcesoStatCards"]
    LS["localStorage\nprefs (read-only on init)"]
    ClickAPI["POST /api/search-events\n(best-effort)"]
    DirectAPI["GET /api/procesos/[id]\n(direct lookup)"]

    LS -->|defaults if URL empty| Hook
    URL -->|parse| Hook
    Filters -->|write| URL
    Hook -->|fetch| API
    API -->|ProcesosResponse + match_score| Hook
    Hook --> Table
    Hook --> Cards
    Table -->|row click| ClickAPI
    Table -->|row click| Navigate["Navigate to upload\nor analisis"]
    DirectAPI -->|resolved proceso| Navigate
```

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| T1 | [01-plan-T1-types-filter-state.md](./01-plan-T1-types-filter-state.md) | Filter state type (incl. profile_match, UNSPSC, fecha_cierre, match_score), URL serializer/deserializer, localStorage helper | ingesta-secop P4+P5 types frozen |
| T2 | [01-plan-T2-fetch-hook.md](./01-plan-T2-fetch-hook.md) | `useProcesosQuery` hook: both search paths, match_score awareness, click beacon | T1 |
| T3 | [01-plan-T3-table-redesign.md](./01-plan-T3-table-redesign.md) | `ProcesosTable` + `ProcesoRow`: real columns, badges, match_score chip, click handler | T2 |
| T4 | [01-plan-T4-filters.md](./01-plan-T4-filters.md) | `ProcesosFilters`: profile_match toggle, UNSPSC multi-select, fecha cierre range, modalidad, departamento | T1 |
| T5 | [01-plan-T5-page-wiring.md](./01-plan-T5-page-wiring.md) | Wire page.tsx: stat cards, remove mock, preference restore, direct ID lookup | T2, T3, T4 |
| T6 | [01-plan-T6-click-logging.md](./01-plan-T6-click-logging.md) | `/api/search-events` route: records clicked processo IDs in search_log | T5 |

## Dependency Graph

```mermaid
flowchart LR
    T1["T1: Types + Filter State"]
    T2["T2: Fetch Hook"]
    T3["T3: Table Redesign"]
    T4["T4: Filter Bar"]
    T5["T5: Page Wiring"]
    T6["T6: Click Logging"]

    T1 --> T2
    T1 --> T4
    T2 --> T3
    T2 --> T5
    T3 --> T5
    T4 --> T5
    T5 --> T6
```

T1 is the foundation. T2 and T4 can run in parallel after T1. T5 is the integration layer. T6 is the analytics layer added last.
