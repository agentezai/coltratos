# domain-model-mvp — deltas

Append-only log of spec edits. Each entry captures rationale, affected scope, and impact on memory.

---

## Delta 2026-05-04 — edit | Rev 1: Authority resolution + ingestion schema (pdf-ingestion rev 4 alignment)

**Mode:** edit
**Rationale:** Two motivations bundled atomically: (1) **pdf-ingestion rev 4 alignment** — pdf-ingestion rev 4 depends on a per-page `pdf_pages` table and ingestion-lifecycle columns on `pliego_uploads` (decided 2026-05-04 in the storage-shape conversation, codified in mvp-scope.md §59). Landing the schema here unblocks pdf-ingestion rev 4 (resume agent ID `a3eefc3a0ff1eb34c`). (2) **Authority consolidation** — three predecessor specs (`domain-model-primitives`, `domain-model-extraction-contracts`, `domain-model-postgres`) all touched the COLTRATOS data model. Without an explicit authority resolution, downstream readers face ambiguity about which spec owns the MVP schema. This rev declares `domain-model-mvp` as the single source of truth and names each predecessor's disposition.
**Affected domains:** database, integrations, contratacion-publica

### Tasks added
- **T9** — Add ingestion lifecycle columns to `pliego_uploads`: `ingestion_status`, `ingestion_started_at`, `ingestion_completed_at`, `ingestion_failure_reason` with CHECK constraints; controlled-vocabulary failure reasons; `pdf-ingestion` service is sole writer (RN-016).
- **T10** — Create `pdf_pages` table with composite PK `(pliego_upload_id, page_number)`, FK CASCADE, per-page upsert pattern (RN-017), RLS via join chain through `pliego_uploads.uploaded_by_company_id` (RN-018), btree index on FK, no GIN on `tables` JSONB (per ADR-013).

### Tasks modified
- **REQ-007** (`pliego_uploads`): added 4 ingestion lifecycle columns + sharpened lifecycle-ownership note declaring `pdf-ingestion` as sole writer.
- **REQ-011** (RLS list): added `pdf_pages` to the RLS-scoped tables, with the join-chain note.
- **REQ-012** (indexes): added btree on `pdf_pages.pliego_upload_id`; explicit note that no GIN on `pdf_pages.tables` (per ADR-013).
- **Intention §1**: explicitly mentions "PDF page-level extraction storage" and adds `pdf-ingestion` to the downstream-spec list.
- **Intention §2** (note about `domain-model-postgres`): removed the redundant parenthetical now that the Authority & Supersession section formalizes the relationship.
- **Architecture / ADR table**: added ADR-013 (per-page table over JSONB array, with full 4-point justification + tradeoffs); ADR-001 wording adjusted to reference the MVP schema's own `Database` interface (not `domain-model-primitives`, which is now superseded).
- **Architecture / Data Model Mermaid ER**: added 4 new columns to `pliego_uploads` entity; added `pdf_pages` entity; added `pliego_uploads ||--o{ pdf_pages` relationship.
- **Architecture / Service Integrations table**: clarified `pliego-upload` initial state (`ingestion_status = 'pending'`); added new `pdf-ingestion` row (sole writer of ingestion lifecycle and `pdf_pages`); updated `requisitos-extraction` row to show it reads `pdf_pages` for source text + tables.
- **Dependencies table**: removed the 3 superseded-spec rows (`domain-model-primitives`, `domain-model-postgres`); kept `domain-model-extraction-contracts` with explicit "partial — non-schema constants only" qualifier; added `pdf-ingestion` (downstream consumer) and `mvp-scope.md §59` (upstream constraint).
- **Revision Log**: appended Rev 1 entry with verbatim rationale.

### Tasks added (business rules)
- **RN-016** — ingestion_status lifecycle ownership and allowed transitions; re-ingestion creates a new row, never mutates.
- **RN-017** — `pdf_pages` per-page upsert on composite PK for idempotent partial retry; empty pages MUST be inserted (not silently dropped).
- **RN-018** — `pdf_pages` RLS pattern via join chain through `pliego_uploads.uploaded_by_company_id`.

### Test cases added
- **TC-016** — `ingestion_status` CHECK rejects invalid value; accepts vocab.
- **TC-017** — `ingestion_failure_reason` CHECK enforces controlled vocabulary; accepts `NULL` and 5 vocab values.
- **TC-018** — `pdf_pages` composite PK enforced; ON CONFLICT upsert succeeds.
- **TC-019** — `pdf_pages` CASCADE delete from `pliego_uploads`.
- **TC-020** — `pdf_pages` RLS scoped via `pliego_uploads` join chain.

### Tasks removed
- None.

### TRIM-not-applicable note
TRIM (the convention for retiring superseded artifacts) does not apply to the predecessor specs. The Authority & Supersession block formally records each predecessor's disposition and the predecessor specs receive header banners (metadata-only edits) — no content was removed from them. Their `status.yaml` files remain unchanged because they are still legitimate historical records of work shipped under the original (pre-MVP) data model. Future readers reach the MVP schema via `domain-model-mvp`; the predecessors are retained as the audit trail of the schema's evolution, not as live specs.

### Authority resolution note
Single source of truth for the MVP Postgres schema is now `domain-model-mvp`. The Authority & Supersession block in the spec names all three predecessors with explicit disposition:
- **`domain-model-primitives`** — superseded fully (TypeScript/Zod layer not carried forward to MVP scope).
- **`domain-model-extraction-contracts`** — partially superseded (schema-bearing parts not carried forward; non-schema constants — `HABILITANTE_HEADING_PATTERNS`, `HABILITANTE_PATTERNS_VERSION`, `ExtractorLogger`, in-memory `Semaforo` view types — survive unchanged and continue to be imported from `@/types`).
- **`domain-model-postgres`** — superseded fully (original empresa/proceso/pliego/segmento migration not carried forward to MVP scope; MVP migrations live under a separate `2026050400000*` series).

Each predecessor spec received a header banner under H1 reflecting its specific disposition (no content modifications).

### Cross-references
- `docs/pdf-ingestion/` — rev 3 confirmed; rev 4 paused awaiting this schema; resume agent ID `a3eefc3a0ff1eb34c`.
- `mvp-scope.md §59` — upstream product constraint mandating per-page storage shape and per-page flag surfacing.
- Storage-shape decision (2026-05-04 conversation) — captured in ADR-013.
- 2026-05-04 pilot-research conversation — discovery-first domain model (rev 0 origin).

---

## Delta 2026-05-05 — edit | Rev 2: Telemetry schema (cost-observability alignment)

**Mode:** edit
**Rationale:** cost-observability rev 2 was approved 2026-05-05. That spec defines data contracts for three new event tables and typed columns on `analyses`, but delegates DDL authority to `domain-model-mvp`. This rev fulfills that forward reference with the minimum schema additions required — no other schema changes included.
**Affected domains:** database, integrations

### Tasks added
- **T11** — Create `analysis_events`, `embedding_events`, `search_events` tables with CHECKs, nullable columns, FK references, `ENABLE ROW LEVEL SECURITY`, and admin-only SELECT policies. Migration file: `supabase/migrations/20260505000011_telemetry_tables.sql`.

### Tasks modified
- **T4** (`analyses`): added 5 nullable typed columns — `extraction_outcome text CHECK(...)`, `requisito_count int`, `count_verde int`, `count_amarillo int`, `count_rojo int`. Backward compatible (all nullable); pre-rev-2 rows have NULL.
- **T6** (RLS policies): added admin-only SELECT policy for all three event tables. Done-When checklist updated from 9 to 12 tables.
- **T7** (indexes): added 10 telemetry indexes per REQ-020 — btree on `analysis_events(analysis_id)`, `analysis_events(created_at)`, `analysis_events(stage, created_at)`, `analysis_events(pliego_sha256)`, `embedding_events(created_at)`, `embedding_events(company_id)`, `search_events(company_id, created_at)`, `search_events(created_at)`, `analyses(extraction_outcome)`; GIN on `search_events(clicked_ids)`.

### Tasks removed
- None.

### Requirements added
- **REQ-015** — `analysis_events` table DDL
- **REQ-016** — `embedding_events` table DDL
- **REQ-017** — `search_events` table DDL
- **REQ-018** — typed columns on `analyses`
- **REQ-019** — admin-only RLS for event tables
- **REQ-020** — telemetry indexes

### Business rules added
- **RN-019** — event tables append-only; single permitted mutation: `array_append` on `search_events.clicked_ids`
- **RN-020** — `embedding_events.company_id` nullable for system sync
- **RN-021** — `search_events.clicked_ids` defaults to `'{}'`; semantics for click-through rate
- **RN-022** — admin-only RLS on all three event tables; TelemetryLogger writes via service-role
- **RN-023** — `analyses` typed columns nullable; NULL means pre-observability row; exclude from percentage calculations

### Test cases added
- **TC-021** — `analysis_events.event_type` CHECK
- **TC-022** — `embedding_events.company_id` nullable
- **TC-023** — `search_events.clicked_ids` default
- **TC-024** — event tables RLS blocks member JWT
- **TC-025** — `analyses.extraction_outcome` CHECK
- **TC-026** — typed columns nullable

### Impact on memory
- **database domain (`domains/database.md`)** — the admin-only RLS pattern (service-role writes, admin JWT reads, pilot JWT blocked) is a new pattern worth curating if a second feature uses it. Worth flagging via `/nybo-curate` after this spec ships.
- **integrations domain (`domains/integrations.md`)** — `TelemetryLogger` as a fire-and-forget service-role writer is a new integration pattern. The append-only exception for `array_append` on `search_events.clicked_ids` is worth documenting.

### Impact on memory
- **database domain (`domains/database.md`)** — should record the per-page-table-vs-JSONB decision pattern (per ADR-013) and the lifecycle-ownership convention (one service owns one column group, enforced by RN convention not constraint). Worth promoting via `/nybo-curate conventions add` once a second feature uses the same lifecycle-ownership pattern.
- **integrations domain (`domains/integrations.md`)** — already records the "flag pages with no extractable content" convention; RN-017 now anchors that convention in a DB-side requirement (`extraction_method = 'empty'` + `'no_text_extracted'` flag), closing a previously implicit-only rule.
- **contratacion-publica domain (`domains/contratacion-publica.md`)** — unchanged; no new domain vocabulary introduced (all new columns are technical/lifecycle, not domain).
- **Authority pattern** — when a new spec consolidates multiple predecessors, the Authority & Supersession section + predecessor header banners is the recommended format. Worth promoting to a nybo convention once a second feature uses the same pattern.
