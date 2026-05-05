# semaforo-aggregation — Feature Overview

## Spec Reference

[Spec](../spec/spec.md) · [Use Cases](../spec/use-cases.md)

## Problem + Solution

- Pilots come to COLTRATOS for one thing: **bid or skip, with reasons**. Without matching, they interpret 47 individual requisitos manually — exactly the work COLTRATOS exists to eliminate.
- Solution: `runSemaforoMatching(requisitos, profile): SemaforoResult` — a pure function that compares extracted requirements against the company profile snapshot using per-tipo rules (Jurídico, Financiero, Técnico/Experiencia), produces a `reason + confidence` per requisito, and aggregates into overall verde/amarillo/rojo.
- Key approach: jurídico-definitorio knockout (structural impossibilities always rojo); N≥5 per-tipo threshold aggregation (30% rojo / 50% amarillo); confidence derived from evidence quality per tipo; all matching is deterministic — no LLM in this step.
- Output: in-memory `SemaforoResult` consumed by `analisis-orchestration` (persists to Supabase) and `semaforo-result` FE (renders).

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Input["Input"]
        Req["ExtractedRequisito[]"]
        Profile["CompanyProfileSnapshot"]
    end

    subgraph Matchers["Matchers — T2/T3/T4 (lib/semaforo/)"]
        JM["JuridicoMatcher\n(document checks,\ndefinitorio classification)"]
        FM["FinancieroMatcher\n(numeric threshold,\nmargin confidence)"]
        TM["TecnicoMatcher\n(UNSPSC tiers,\ncosine similarity)"]
    end

    subgraph Agg["Aggregator — T5 (lib/semaforo/aggregator.ts)"]
        PerTipo["per-tipo verdict\n(N<5 knockout / N≥5 threshold)"]
        Overall["overall verdict\n(definitorio → worst-tipo)"]
    end

    subgraph Integration["Entry point — T6 (lib/semaforo/index.ts)"]
        Entry["runSemaforoMatching()"]
    end

    Req --> Entry
    Profile --> Entry
    Entry --> JM
    Entry --> FM
    Entry --> TM
    JM --> PerTipo
    FM --> PerTipo
    TM --> PerTipo
    PerTipo --> Overall
    Overall --> Result["SemaforoResult\n(matches, overall, byTipo,\ndefinitorio_blockers)"]
```

## Data Model

No new database tables. New domain types in `@/types`:

```mermaid
classDiagram
    class SemaforoResult {
        +MatchResult[] matches
        +SemaforoColor overall
        +Record~RequisitoTipo TipoVerdict~ byTipo
        +MatchResult[] definitorio_blockers
        +string semaforo_rules_version
    }
    class MatchResult {
        +RequisitoId requisito_id
        +SemaforoColor verdict
        +string reason
        +number confidence
        +number extraction_confidence
        +boolean definitorio
    }
    class TipoVerdict {
        +SemaforoColor verdict
        +number n
        +boolean threshold_applied
    }
    SemaforoResult --> MatchResult
    SemaforoResult --> TipoVerdict
```

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| T0 | (in `domain-model-mvp` spec) | `CompanyProfileSnapshot`, `ExtractedRequisito` discriminated union, `MatchResult`/`SemaforoResult`/`TipoVerdict` types in `@/types`; `analisis.semaforo_rules_version` column | HARD PREREQUISITE |
| T1 | [01-plan-01-types.md](./01-plan-01-types.md) | `lib/semaforo/thresholds.ts` — all versioned constants + `DEFINITORIO_DOCUMENT_TYPES`; ADR-011/012/013/014 | T0 |
| T2 | [01-plan-02-juridico-matcher.md](./01-plan-02-juridico-matcher.md) | `lib/semaforo/juridico-matcher.ts` — definitorio classification, document checks, heuristics | T1 |
| T3 | [01-plan-03-financiero-matcher.md](./01-plan-03-financiero-matcher.md) | `lib/semaforo/financiero-matcher.ts` — numeric threshold matching, margin confidence formula | T1 |
| T4 | [01-plan-04-tecnico-matcher.md](./01-plan-04-tecnico-matcher.md) | `lib/semaforo/tecnico-matcher.ts` — UNSPSC tier matching, cosine similarity, experiencia | T1 |
| T5 | [01-plan-05-aggregator.md](./01-plan-05-aggregator.md) | `lib/semaforo/aggregator.ts` — per-tipo N≥5 threshold, overall verdict derivation | T2, T3, T4 |
| T6 | [01-plan-06-integration.md](./01-plan-06-integration.md) | `lib/semaforo/index.ts` — `runSemaforoMatching` entry point + public barrel + version stamp | T5 |
| T7 | [01-plan-07-tests.md](./01-plan-07-tests.md) | ≥15 golden fixtures (≥5 per tipo), unit tests per matcher, provider-isolation grep, 100% branch coverage | T6 |

## Dependency Graph

```mermaid
flowchart LR
    T0["T0: domain-model-mvp\n(HARD PREREQUISITE)"]
    T1["T1: Thresholds + ADRs"]
    T2["T2: JuridicoMatcher"]
    T3["T3: FinancieroMatcher"]
    T4["T4: TecnicoMatcher"]
    T5["T5: Aggregator"]
    T6["T6: runSemaforoMatching entry"]
    T7["T7: Tests + fixtures"]

    T0 --> T1
    T1 --> T2
    T1 --> T3
    T1 --> T4
    T2 --> T5
    T3 --> T5
    T4 --> T5
    T5 --> T6
    T6 --> T7

    style T0 fill:#f8d7da
```

T2/T3/T4 can be implemented in parallel after T1.
