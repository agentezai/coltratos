# semaforo-aggregation — Feature Overview

## Spec Reference

[Spec](../../semaforo-aggregation/spec/spec.md) · [Use Cases](../../semaforo-aggregation/spec/use-cases.md)

## Problem + Solution

- Without aggregation, users would interpret 47 individual requisitos manually — exactly the work COLTRATOS exists to eliminate. The verdict needs to be defensible in 10 seconds and auditable when challenged.
- Solution: a **pure function** `aggregateSemaforo(requisitos: Requisito[]): Semaforo` under `lib/semaforo/`, ~50 lines of production code, 100% branch coverage, deterministic.
- Key approach: knockout-rule precedence on habilitantes (any `is_habilitante=true AND cumple=false` → overall rojo); 90%/70% percentage thresholds applied when no knockout fires; sin-información excluded from the denominator + `amarillo` on all-null inputs (per ADR-012); `general` requisitos warned + excluded (RN-008); deterministic `blockers` ordering; versioned thresholds via `SEMAFORO_RULES_VERSION` so historical análisis remain explainable.
- Output: in-memory `Semaforo = { overall, byCategoria, blockers, stats }`, consumed verbatim by the future `analisis-orchestration` (persists to `Analisis`) and `semaforo-result` FE specs (renders).

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Caller["Caller (future analisis-orchestration spec)"]
        Input["Requisito[]\n(post-extraction, post-eligibility-matching)"]
    end

    subgraph Foundation["Foundation — T1 (lib/semaforo/)"]
        Thresholds["thresholds.ts\n(VERDE_THRESHOLD, AMARILLO_THRESHOLD,\nSEMAFORO_RULES_VERSION)"]
        ADR011["ADR-011\n(threshold values)"]
        ADR012["ADR-012\n(sin-info handling)"]
    end

    subgraph Aggregate["Aggregation — T2 (lib/semaforo/aggregate.ts)"]
        Fn["aggregateSemaforo()\n≤80 lines"]
        Fn -.->|"knockout rule"| Knock["habilitante + cumple=false\n→ rojo (precedence 1)"]
        Fn -.->|"percentage rule"| Pct["cumplePct ≥ 0.9 → verde\n≥ 0.7 → amarillo\n< 0.7 → rojo"]
        Fn -.->|"per-categoría"| ByCat["same rules\nper {juridico,financiero,tecnico,experiencia}"]
        Fn -.->|"blockers"| Block["habilitantes failing only,\nsorted (cat, desc)"]
        Fn -.->|"stats"| Stats["total / cumple /\nnoCumple / sinInfo /\ncumplePct"]
        Fn -.->|"general categoría"| Warn["console.warn\n(only side effect)"]
    end

    subgraph Quality["Quality gates — T3 (tests/)"]
        Unit["table-driven unit tests\n(every threshold boundary,\nevery edge case)"]
        Golden["5 golden fixtures\ntests/fixtures/golden/semaforo/"]
        Coverage["100% branch coverage\nvitest --coverage"]
        Grep["provider-isolation grep\n(REQ-013)"]
        Economy["≤80-line PR-review heuristic\n(NFR-01)"]
    end

    Input --> Fn
    Thresholds -.-> Fn
    Fn --> Output["Semaforo\n(in-memory)"]
    Output --> Caller
    Warn -.-> Stderr["stderr"]

    Unit -.-> Fn
    Golden -.-> Fn
    Coverage -.-> Fn
    Grep -.-> Aggregate
    Economy -.-> Fn

    style Fn fill:#e1f5ff
    style Thresholds fill:#e1f5ff
    style Golden fill:#fff4e1
    style Unit fill:#fff4e1
    style Grep fill:#fff4e1
```

## Data Model

No new database tables owned by this feature. Schema additions live in T0 (in `domain-model`):
- `requisito.categoria` (denormalized, narrow enum excluding `general`)
- `requisito.is_habilitante BOOLEAN NOT NULL`
- `requisito.is_habilitante_source TEXT NOT NULL` (CHECK in `'structural' | 'llm' | 'manual'`)
- `analisis.semaforo_rules_version TEXT NULL`
- `HABILITANTE_HEADING_PATTERNS` + `HABILITANTE_PATTERNS_VERSION` runtime constants exported from `@/types` for the requisitos-extraction tiered classifier (cross-spec)

Plus the new domain type `Semaforo` at `src/types/domain/semaforo.ts`:

```mermaid
classDiagram
    class Semaforo {
        +SemaforoColor overall
        +Record~RequisitoCategoria, SemaforoColor~ byCategoria
        +Requisito[] blockers
        +SemaforoStats stats
    }

    class SemaforoStats {
        +number total
        +number cumple
        +number noCumple
        +number sinInfo
        +number cumplePct
    }

    Semaforo "1" --> "1" SemaforoStats
```

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| T0 | (in `domain-model` spec) | 9 schema items: `requisito.categoria` + `requisito.is_habilitante` + `requisito.is_habilitante_source`; Zod + extraction-payload + Kysely extensions for all three; `analisis.semaforo_rules_version`; `Semaforo`/`SemaforoStats`/`RequisitoCategoria`/`IsHabilitanteSource` types in `@/types`; `HABILITANTE_HEADING_PATTERNS` + `HABILITANTE_PATTERNS_VERSION` constants in `@/types` | (HARD PREREQUISITE) |
| T1 | [01-plan-01-foundation.md](./01-plan-01-foundation.md) | `lib/semaforo/thresholds.ts` + ADR-011 (thresholds) + ADR-012 (sin-info) | T0 |
| T2 | [01-plan-02-aggregate.md](./01-plan-02-aggregate.md) | `lib/semaforo/aggregate.ts` (≤80 lines target — PR-review heuristic, no CI gate): knockout + percentage + per-categoría + blockers + stats + general-warn | T1 |
| T3 | [01-plan-03-corpus-tests-isolation.md](./01-plan-03-corpus-tests-isolation.md) | Table-driven unit tests + 5 golden fixtures (with realistic `is_habilitante_source` distribution) + 100% branch coverage + provider-isolation grep + public barrel `lib/semaforo/index.ts` | T2 |

## Dependency Graph

```mermaid
flowchart LR
    T0["T0: domain-model edits\n(in domain-model spec)"]
    T1["T1: Thresholds + ADRs"]
    T2["T2: aggregateSemaforo function"]
    T3["T3: Tests + corpus + grep + barrel"]

    T0 --> T1
    T1 --> T2
    T2 --> T3

    style T0 fill:#f8d7da
    style T1 fill:#d4edda
    style T2 fill:#d4edda
    style T3 fill:#d4edda
```

Strictly serial — this is a small, focused feature. No parallelization opportunity within the spec.
