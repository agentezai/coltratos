# T1: Types, Error Hierarchy, and ADRs

## Scope

- `lib/ingestion/errors.ts` — new file: `PdfIngestionError` base + 7 typed subclasses
- `lib/ingestion/ports/ingestion-status-repository.ts` — new file: `IngestionStatusRepository` interface (port)
- `src/types/ingestion.ts` — new file: `IngestionResult`, `Page`, `TableJson`, `ExtractionMethod`, `PageFlag`, `IngestionFailureReason`
- `src/types/index.ts` — barrel: re-export the new types
- `.nybo/foundation/adrs/ADR-004-pdf-parse.md` — new ADR
- `.nybo/foundation/adrs/ADR-005-pure-function-ingestion.md` — **new STUB authored on 2026-05-04**, status: Superseded by ADR-010 (preserves the rev-1 decision in the historical record)
- `.nybo/foundation/adrs/ADR-007-corpus-growth.md` — new ADR (updated content: N=20 / <5% page-failure / p95 <2 min on 200 pages)
- `.nybo/foundation/adrs/ADR-008-pdfplumber-subprocess.md` — new ADR
- `.nybo/foundation/adrs/ADR-009-off-vercel-worker-host.md` — new ADR
- `.nybo/foundation/adrs/ADR-010-queue-worker-boundary.md` — new ADR
- `.nybo/foundation/adrs/ADR-011-writeback-via-repository-port.md` — new ADR
- `.nybo/foundation/adrs/ADR-012-supabase-pgmq-job-dispatch.md` — new ADR

## Changes

### Error Hierarchy

`PdfIngestionError extends Error` with `readonly code` discriminator and a `cause?: unknown` property. Seven subclasses, each setting a unique `code`:

| Subclass | code | Maps to ingestion_failure_reason |
|----------|------|----------------------------------|
| `NoTextLayerError` | `'NO_TEXT_LAYER'` | (page-level flag, not a failure reason) |
| `EncryptedPdfError` | `'ENCRYPTED'` | `'encrypted_pdf'` |
| `EmptyPdfError` | `'EMPTY'` | `'pdf_unreadable'` |
| `MalformedPdfError` | `'MALFORMED'` | `'pdf_unreadable'` |
| `OcrFailedError` | `'OCR_FAILED'` | `'ocr_timeout'` |
| `TableParseFailedError` | `'TABLE_PARSE_FAILED'` | (page-level flag, not a failure reason) |
| `StorageFetchFailedError` | `'STORAGE_FETCH_FAILED'` | `'unknown'` |

All subclasses set `name = this.constructor.name` so stack traces are readable. Export base + all subclasses from `errors.ts`.

### IngestionStatusRepository port

Interface only — no Supabase imports under `lib/`. Defines the contract:

```typescript
export interface IngestionStatusRepository {
  loadStatus(id: string): Promise<{
    ingestion_status: 'pending' | 'running' | 'completed' | 'failed'
    ingestion_started_at: Date | null
  }>
  markRunning(id: string): Promise<void>
  writePages(id: string, pages: Page[]): Promise<void>
  markCompleted(id: string): Promise<void>
  markFailed(id: string, reason: IngestionFailureReason, cause: unknown): Promise<void>
}
```

The Supabase implementation lives in `src/services/ingestion-worker/` (T8); only the interface lives in `lib/`.

### IngestionResult / Page / TableJson types

```typescript
export type ExtractionMethod = 'text_layer' | 'ocr' | 'table_parser' | 'empty'
export type PageFlag = 'no_text_extracted' | 'ocr_low_confidence' | 'table_parse_failed' | 'image_only'
export type IngestionFailureReason = 'pdf_unreadable' | 'ocr_timeout' | 'page_limit_exceeded' | 'encrypted_pdf' | 'unknown'

export interface TableJson { rows: string[][] }
export interface Page {
  page_number: number  // 1-indexed
  text: string
  tables: TableJson[]
  extraction_method: ExtractionMethod
  confidence: number | null  // 0..1
  flags: PageFlag[]
}
export interface IngestionResult {
  schema_version: string  // semver, v1.0
  pages: Page[]
}
```

Field names mirror `pdf_pages` columns 1:1 (snake_case at persistence boundary). RLS / RN-014 / RN-017 from `domain-model-mvp` are upstream — this layer just produces the shape.

### ADRs

- **ADR-004** — pdf-parse for Node-native, zero-config text extraction; alternatives (pdfjs-dist, pdf2json) considered but deferred. Status: Accepted.
- **ADR-005 (STUB)** — Pure-function service boundary. Originally captured the rev-1 ingestion contract. *This stub is authored on 2026-05-04 to capture a decision that was planned in rev 1 but never authored on disk before being superseded in rev 4.* Status: **Superseded by ADR-010**.
- **ADR-007 (UPDATED)** — Validation corpus size and quality gates over time. v1 launch: **N=20, <5% page-failure rate, p95 <2 min on 200 pages**. First paying user: N≥50, <3% page-failure. Pricing >$50/empresa/month: N≥100, <2% page-failure. Corpus stored under `tests/fixtures/pliegos/` with `corpus.yaml` manifest. Manual table-quality review (REQ-023) at every revision. Includes second-strategy condition: **promote pdf-ingestion to its own domain** when OCR + tables ship. Status: Accepted.
- **ADR-008** — Library-based table extraction via **pdfplumber** (chosen over tabula-py, camelot, regex-on-text). **Sub-decision: subprocess vs Lambda vs sidecar — subprocess wins** for MVP. **Revision trigger:** *Revisit subprocess packaging if (a) PDF processing volume exceeds ~500 pliegos/day sustained, (b) memory pressure from concurrent pdfplumber processes destabilizes the Node worker, or (c) Python dependency tree blocks Node container builds in CI.* Status: Accepted.
- **ADR-009** — Off-Vercel worker host for Tesseract OCR. **Railway primary, Fly.io fallback.** **Switch trigger:** *cost crosses $50/mo OR cold-start p95 >60s.* **Review cadence:** *Reevaluate hosting choice at end of each sprint review based on cost-observability data.* Status: Accepted.
- **ADR-010** — Queue-worker boundary split. *Supersedes ADR-005 because the queue-worker entrypoint requires side-effectful I/O that the pure-only boundary precluded. Pure pipeline preserved under scoped scan.* Worker entrypoint side-effectful in `src/services/ingestion-worker/`; inner pipeline pure in `lib/ingestion/`. Status: Accepted.
- **ADR-011** — Writeback via repository port. `IngestionStatusRepository` interface in `lib/ingestion/ports/`; `SupabaseIngestionStatusRepository` impl in `src/services/ingestion-worker/`. Cross-references ADR-010. Status: Accepted.
- **ADR-012** — Supabase Queues (pgmq) for job dispatch. *pgmq is not currently listed in Supabase's official feature-stage table and the product still has pre-release components (Partitioned Queue). If reliability issues emerge in pilot, fallback is pg-boss on the same Postgres instance — same primitive, different library, similar transactional properties.* Status: Accepted.

### Design Rationale (Single Responsibility)

T1 owns nothing but type declarations, error class definitions, and the repository port interface — no runtime logic. The split between `lib/ingestion/ports/` (interface) and `src/services/ingestion-worker/` (implementation) is the seam that lets the inner pipeline stay pure under NFR-03.

## Dependencies

Requires **T0** (`domain-model-mvp` rev 1, satisfied externally on 2026-05-04). The `pdf_pages` table and `pliego_uploads` ingestion columns must exist before this task authors `Page` / `IngestionFailureReason`.

## Done When

- [ ] `lib/ingestion/errors.ts` exists with `PdfIngestionError` base + 7 subclasses; each has a unique `code`; `instanceof PdfIngestionError` returns true for every subclass.
- [ ] `lib/ingestion/ports/ingestion-status-repository.ts` exports the `IngestionStatusRepository` interface.
- [ ] `IngestionResult`, `Page`, `TableJson`, `ExtractionMethod`, `PageFlag`, `IngestionFailureReason` exported from `src/types/index.ts`.
- [ ] All eight ADR files (004, 005-stub, 007, 008, 009, 010, 011, 012) present under `.nybo/foundation/adrs/` with the documented statuses (ADR-005 marked **Superseded by ADR-010**).
- [ ] `npm run typecheck` passes in strict mode.
- [ ] No file in this task exceeds 250 lines.
