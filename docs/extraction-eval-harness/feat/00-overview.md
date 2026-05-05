# extraction-eval-harness — Overview

## Spec Reference

[Spec](../spec/spec.md)

## Problem + Solution

- No reproducible measurement exists for extraction quality — the ≥85% recall claim is unverifiable without a labeled corpus and a scorer.
- Solution: a lightweight in-house eval harness: labeled corpus (20 pliegos), a runner that drives the production pipeline, an embedding-based scorer, and a CI gate on every extraction change.
- Implemented as a standalone `eval/` directory (TypeScript, `tsx` runner) that imports from `lib/` and `@/types` but lives outside `src/`. No new database tables; results committed to `eval-results/`.
- Output: committed markdown report + JSON per git hash, PR comment from CI, trend index across runs.

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Corpus
        CY[corpus.yaml]
        GT["ground-truth/<id>.json (human-authored)"]
    end

    subgraph Storage ["Supabase Storage eval-corpus"]
        PDF["pliegos/<sha256>.pdf"]
    end

    subgraph Runner ["eval/runner/run-eval.ts"]
        DL["Download + SHA256 verify"]
        ING["lib/ingestion inner pipeline"]
        EXT["AnthropicRequisitosExtractor"]
        PJ["predicted.json"]
    end

    subgraph Scorer ["eval/scorer/score.ts"]
        EMB["OpenAI text-embedding-3-small"]
        COS["Cosine match ≥ 0.80"]
        MET["Metrics: recall/precision/F1/hallucination per tipo"]
    end

    subgraph Reports ["eval-results/<git-hash>/"]
        RJ[results.json]
        RM[report.md]
        IDX[index.md]
    end

    subgraph CI
        GHA[".github/workflows/extraction-eval.yml"]
        CMT["gh pr comment"]
    end

    CY --> DL
    PDF --> DL
    DL --> ING
    ING --> EXT
    EXT --> PJ
    GT --> EMB
    PJ --> EMB
    EMB --> COS --> MET
    MET --> RJ --> RM --> IDX
    RM --> CMT
    GHA --> CMT
```

## Data Model

No new Supabase tables. All state lives in committed files.

```mermaid
classDiagram
    class CorpusEntry {
        +id: string
        +storage_key: string
        +sha256: string
        +modalidad: string
        +entidad: string
        +year: number
        +labeler_primary: string
        +labeler_secondary?: string
    }

    class GroundTruthRequisito {
        +tipo: RequisitoCategoria
        +texto_canonical: string
        +pagina_fuente: number
        +quote_fuente_minima: string
        +is_habilitante: boolean
    }

    class EvalRunResult {
        +git_hash: string
        +date: string
        +recall_aggregate: number
        +precision_aggregate: number
        +f1_aggregate: number
        +hallucination_rate: number
        +recall_juridico: number
        +recall_tecnico: number
        +recall_financiero: number
        +recall_experiencia: number
        +cost_usd: number
        +forced: boolean
        +pliego_results: PliEgoResult[]
    }

    class PliEgoResult {
        +pliego_id: string
        +recall: number
        +precision: number
        +missed: GroundTruthRequisito[]
        +hallucinated: string[]
    }

    CorpusEntry "1" --> "*" GroundTruthRequisito
    EvalRunResult "1" --> "*" PliEgoResult
```

## Task Index

| # | File | Description | Dependencies |
|---|------|-------------|--------------|
| T1 | [01-plan-01-corpus-ground-truth-schema.md](./01-plan-01-corpus-ground-truth-schema.md) | Types, manifest schema, directory layout, labeling protocol | None |
| T2 | [01-plan-02-runner.md](./01-plan-02-runner.md) | Runner script, empresa stub, storage download | T1 |
| T3 | [01-plan-03-scorer.md](./01-plan-03-scorer.md) | Embedding, cosine matching, metrics computation | T1, T2 |
| T4 | [01-plan-04-report-generator.md](./01-plan-04-report-generator.md) | Markdown + JSON report, index.md append | T3 |
| T5 | [01-plan-05-interlabeler-agreement.md](./01-plan-05-interlabeler-agreement.md) | CSV import, Cohen's kappa computation | T1 |
| T6 | [01-plan-06-ci-integration.md](./01-plan-06-ci-integration.md) | GitHub Actions workflow, package.json scripts | T2, T3, T4 |

## Dependency Graph

```mermaid
flowchart LR
    T1[T1: Corpus + Types] --> T2[T2: Runner]
    T1 --> T3[T3: Scorer]
    T1 --> T5[T5: Agreement]
    T2 --> T3
    T3 --> T4[T4: Report]
    T2 --> T6[T6: CI]
    T3 --> T6
    T4 --> T6
```
