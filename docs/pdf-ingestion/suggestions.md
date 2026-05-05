# pdf-ingestion — suggestions

Forward-looking ideas captured during planning. None of these are committed work; each is a v1.1+ candidate gated on real-world signal.

---

## v1.1 candidates

### Resumability for partial-work-after-crash recovery

**Source:** REQ-019 (rev 4) — *"Resumability (continuing from partial work after crash) is NOT required in MVP — full reprocess on retry is acceptable. Document as v1.1 candidate."*

**Idea:** Track per-page progress in a separate `ingestion_progress` table or JSONB column on `pliego_uploads`. On worker resumption after crash, the worker reads the progress record and skips pages already written, resuming from the first incomplete page.

**Trigger to implement:** When p95 ingestion time grows past 5 minutes, or when MVP volume grows past ~500 pliegos/day and reprocessing on retry becomes a measurable cost.

**Why not in MVP:** At MVP scale (20 paying users × ≥5 analyses/month = ≤100 ingestions/month), full-reprocess on retry adds at most a few minutes of compute per crash, which is acceptable. The state-tracking + resumption logic is non-trivial; deferring is the right cost trade.

---

### Temp-file fallback for table extraction (if stdin proves unreliable)

**Source:** T5 (`01-plan-05-table-extractor.md`) — *"If stdin proves unreliable on large PDFs, a follow-up adds a temp-file fallback under `src/services/ingestion-worker/` (NOT `lib/`), and `lib/ingestion/tables.ts` calls into the worker's I/O helper through a port."*

**Idea:** Move the subprocess spawn under `src/services/ingestion-worker/` if stdin-piped PDF bytes prove unreliable for large files. The temp-file path keeps `node:fs` out of `lib/ingestion/`.

**Trigger to implement:** First reproducible failure of stdin-piped subprocess on a real-world pliego >50 MB.

---

### Promote `pdf-ingestion` to its own domain

**Source:** ADR-007 + spec.md "Domains Touched" — *"`pdf-ingestion` — candidate for new domain promotion. With OCR + table extraction + queue-worker patterns, the surface is now too broad to live under `pliego-upload` only."*

**Trigger to implement:** Immediately after rev 4 ships its first task (T8 onwards). Promote via `/nybo-curate domains create pdf-ingestion`.

---

## Conventions / patterns to extract

### Queue-worker boundary split (pure inner pipeline + side-effectful entrypoint via repository port)

**Source:** ADR-010 + ADR-011 (rev 4 architectural change).

**Idea:** Worker boundary split is a reusable pattern for any future I/O-coupled feature whose core is a deterministic pipeline. The pattern: (1) interface in `lib/<feature>/ports/`, (2) implementation in `src/services/<feature>-worker/`, (3) NFR-03 scope `lib/<feature>/**` only.

**Trigger to extract:** When a second feature (e.g. `report-generation`, `eligibility-matching`) adopts the same boundary. Promote via `/nybo-curate extract`.
