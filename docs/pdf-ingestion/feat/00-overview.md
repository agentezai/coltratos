# pdf-ingestion — Feature Overview

## Spec Reference

[Spec](../../pdf-ingestion/spec/spec.md) · [Use Cases](../../pdf-ingestion/spec/use-cases.md) · [Contract](../../pdf-ingestion/contract/contract.md)

## Problem + Solution

- The MVP requires per-page extracted text and structured tables from uploaded pliegos so downstream `requisitos-extraction` can run cite-back, page-aware analysis. Per `mvp-scope.md` §59, ingestion MUST do text-layer extraction first, OCR fallback for image-only pages, and library-based table parsing — pages with no extractable content MUST be flagged, not silently dropped.
- Solution: a **queue-fed worker** invoked by Supabase Queues (pgmq). The entrypoint `processPliegoUpload(pliego_upload_id)` lives under `src/services/ingestion-worker/`; the **inner pipeline** (text extraction → OCR fallback → table extraction → page assembly) lives under `lib/ingestion/` and remains pure, testable, and deterministic.
- Architecture: the side-effectful entrypoint is split from the pure inner pipeline via a repository port (ADR-010 + ADR-011). NFR-03 scoped purity scan applies to `lib/ingestion/**` only; the worker is exempt by design.
- Hosting: the worker runs off-Vercel because Tesseract OCR requires a system install. Railway primary, Fly.io fallback (per ADR-009).
- Output: per-page rows in `pdf_pages` (owned by `domain-model-mvp`) plus a `pliego_uploads.ingestion_status` lifecycle (`pending → running → completed | failed`) with controlled `ingestion_failure_reason` vocabulary.
- v1 ingests `Pliego` only; `AnexoProceso` is stored but not ingested in v1.

## Architecture Diagram

```mermaid
flowchart LR
    subgraph Upload["pliego-upload (Spec 6)"]
        UploadInsert["Insert pliego_uploads row\n(ingestion_status='pending')"]
        Enqueue["Enqueue pgmq message\n{pliego_upload_id}"]
    end

    subgraph Queue["Supabase Queues (pgmq)"]
        Q[("Job queue")]
    end

    subgraph Worker["src/services/ingestion-worker (T8)"]
        Entry["processPliegoUpload(id)"]
        StatusCheck["status check (REQ-019(c))"]
        Fetch["fetch pliego buffer\nfrom Supabase Storage\n(T2)"]
        Repo["IngestionStatusRepository\n(impl: ADR-011)"]
    end

    subgraph Inner["lib/ingestion (pure inner pipeline)"]
        Text["extractText\n(T3: pdf-parse)"]
        Ocr["runOcr\n(T4: Tesseract spa)"]
        Tables["extractTables\n(T5: pdfplumber subprocess)"]
        Assemble["assemble\n(T6: page-aware)"]
        Errors["error states (T7)"]
    end

    subgraph DB["Supabase Postgres"]
        PagesT[("pdf_pages\n(per-page rows)")]
        UploadsT[("pliego_uploads\n(ingestion_status\nlifecycle)")]
    end

    UploadInsert --> Enqueue
    Enqueue --> Q
    Q --> Entry
    Entry --> StatusCheck
    StatusCheck --> Fetch
    Fetch --> Text
    Text -. sub-threshold .-> Ocr
    Ocr --> Assemble
    Text --> Assemble
    Tables --> Assemble
    Errors -. typed errors .-> Repo
    Assemble -->|"IngestionResult"| Repo
    Repo --> PagesT
    Repo --> UploadsT

    style Inner fill:#e1f5ff
    style Worker fill:#fff4e1
```

## Data Model

No new database entities — `domain-model-mvp` rev 1 owns `pliego_uploads` (with the four ingestion columns) and `pdf_pages`. This feature produces in-memory `IngestionResult` and writes through the repository port.

```mermaid
classDiagram
    class IngestionResult {
        +string schema_version
        +Page[] pages
    }

    class Page {
        +int page_number
        +string text
        +TableJson[] tables
        +ExtractionMethod extraction_method
        +number|null confidence
        +PageFlag[] flags
    }

    class TableJson {
        +string[][] rows
    }

    class IngestionStatusRepository {
        <<interface>>
        +loadStatus(id)
        +markRunning(id)
        +writePages(id, pages)
        +markCompleted(id)
        +markFailed(id, reason, cause)
    }

    class PdfIngestionError {
        +string code
        +unknown cause
    }

    PdfIngestionError <|-- NoTextLayerError
    PdfIngestionError <|-- EncryptedPdfError
    PdfIngestionError <|-- EmptyPdfError
    PdfIngestionError <|-- MalformedPdfError
    PdfIngestionError <|-- OcrFailedError
    PdfIngestionError <|-- TableParseFailedError
    PdfIngestionError <|-- StorageFetchFailedError

    IngestionResult --> Page
    Page --> TableJson
```

**Invariant (RN-014):** `pages` is 1-indexed and contiguous. Empty pages surface with `extraction_method='empty'` and the `'no_text_extracted'` flag — never silently dropped.

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| **T0** | _Prerequisite — DONE_ | `domain-model-mvp` rev 1 has shipped `pliego_uploads` ingestion columns + `pdf_pages` table + ADR-013. T0 is satisfied externally; this entry is now a verification step | (External — done 2026-05-04) |
| T1 | [01-plan-01-types-errors.md](./01-plan-01-types-errors.md) | Error hierarchy (7 subclasses) + ADRs 004/005-stub/007/008/009/010/011/012 + `IngestionResult`/`Page`/`TableJson`/`IngestionStatusRepository` types | T0 |
| T2 | [01-plan-02-storage-fetch.md](./01-plan-02-storage-fetch.md) | `fetchPliegoBuffer(id)` from Supabase Storage at per-tenant prefix | T1 |
| T3 | [01-plan-03-text-extractor.md](./01-plan-03-text-extractor.md) | `pdf-parse` per-page text extractor + typed-error mapping | T1 |
| T4 | [01-plan-04-ocr-fallback.md](./01-plan-04-ocr-fallback.md) | Tesseract OCR fallback (Spanish lang pack) + confidence capture + `'ocr_low_confidence'` flag | T1, T3 |
| T5 | [01-plan-05-table-extractor.md](./01-plan-05-table-extractor.md) | pdfplumber subprocess-based table extractor; per-page failure flags, never fails ingestion | T1 |
| T6 | [01-plan-06-page-assembler.md](./01-plan-06-page-assembler.md) | Assemble `IngestionResult` from text + OCR + tables + flags; page-contiguity invariant | T3, T4, T5 |
| T7 | [01-plan-07-error-states.md](./01-plan-07-error-states.md) | Map inner-pipeline errors onto controlled `ingestion_failure_reason` vocabulary | T1, T6 |
| T8 | [01-plan-08-queue-worker.md](./01-plan-08-queue-worker.md) | `processPliegoUpload(id)` queue-worker entrypoint; idempotent writeback per REQ-019; concurrency control | T2, T6, T7 |
| T9 | [01-plan-09-corpus.md](./01-plan-09-corpus.md) | 20-pliego corpus + `corpus.yaml` manifest + golden sketches + `tests/fixtures/pliegos/README.md` | T8 |
| T10 | [01-plan-10-acceptance.md](./01-plan-10-acceptance.md) | Acceptance test asserting <5% page-failure rate over corpus + manifest schema validation | T9 |
| T11 | [01-plan-11-bench.md](./01-plan-11-bench.md) | Performance benchmark: p95 <2 min over 200-page pliegos in corpus | T9 |

## Dependency Graph

```mermaid
flowchart LR
    T0["T0: domain-model-mvp\n(DONE — external)"]
    T1["T1: Types + Errors + ADRs"]
    T2["T2: Storage Fetch"]
    T3["T3: Text Extractor"]
    T4["T4: OCR Fallback"]
    T5["T5: Table Extractor"]
    T6["T6: Page Assembler"]
    T7["T7: Error State Mapping"]
    T8["T8: Queue Worker\n(idempotent)"]
    T9["T9: Corpus N=20"]
    T10["T10: Acceptance\n(<5% page-fail)"]
    T11["T11: Benchmark\n(p95 <2 min)"]

    T0 --> T1
    T1 --> T2
    T1 --> T3
    T3 --> T4
    T1 --> T5
    T3 --> T6
    T4 --> T6
    T5 --> T6
    T6 --> T7
    T2 --> T8
    T6 --> T8
    T7 --> T8
    T8 --> T9
    T9 --> T10
    T9 --> T11

    style T0 fill:#d4edda
    style T1 fill:#e1f5ff
    style T2 fill:#e1f5ff
    style T3 fill:#e1f5ff
    style T4 fill:#e1f5ff
    style T5 fill:#e1f5ff
    style T6 fill:#e1f5ff
    style T7 fill:#e1f5ff
    style T8 fill:#fff4e1
    style T9 fill:#fff4e1
    style T10 fill:#fff4e1
    style T11 fill:#fff4e1
```

T3, T5 can run in parallel after T1. T4 depends on T3 (sub-threshold detection). T6 joins them. T8 is the integration point. T10 + T11 share T9 as a soft prerequisite (corpus must exist).
