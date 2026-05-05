# pdf-ingestion — deltas

Append-only log of spec edits. Each entry captures rationale, affected scope, and impact on memory.

---

## Delta 2026-04-26 — edit | tightened three contract ambiguities (NFR-03 scope, NFD/dual-heading strategy, ADR-007 corpus growth)

**Mode:** edit
**Rationale:** Three ambiguities in the draft would otherwise be resolved at Execute time by the implementer's discretion. The wrong default in any of them creates rework — column shape, normalization strategy, and product-level quality trajectory are expensive to revisit once code lands. Locking them at spec time is free.
**Affected domains:** pliego-upload, requisito-extraction

### Tasks added
- None (no new task created; T0 prerequisite scope expanded but it remains T0).

### Tasks modified
- **T0 (prerequisite, domain-model edit)**: scope expanded from 3 changes to 8. Now includes `heading_normalized TEXT NULL`, `heading_original TEXT NULL`, `is_synthetic BOOLEAN NOT NULL DEFAULT false`, plus 2 CHECK constraints (both-or-neither heading; synthetic ⇔ null heading), plus a `.refine()` on `SegmentoSchema` mirroring the constraints.
- **T1 (types + errors + ADRs)**: `Segment` shape gains `headingNormalized: string | null`, `headingOriginal: string | null`, `isSynthetic: boolean`. Adds **ADR-007 (Validation corpus size and quality gates over time)** alongside ADRs 004/005/006. Path moved from `src/services/pdf-ingestion/` to `lib/ingestion/`.
- **T2 (text extractor)**: path moved to `lib/ingestion/extract-text.ts`. Behavior unchanged.
- **T3 (categorizer)**: locks the mandatory NFD normalization formula `text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()` in source; patterns must be authored against the normalized form (case-insensitive `/i` flag forbidden — verified by grep test). Path moved to `lib/ingestion/categorize.ts`.
- **T4 (segmenter)**: now emits dual heading capture (`headingOriginal` = trimmed source line; `headingNormalized` = `normalizeForMatch(headingOriginal)` — guarantees the persisted normalized form matches what the categorizer matched against) and `isSynthetic` correlation. RN-011 triple-equivalence enforced as a runtime invariant: `isSynthetic === true ⇔ headingNormalized === null ⇔ headingOriginal === null`. Path moved to `lib/ingestion/segment.ts`.
- **T5 (public API + purity scan)**: NFR-03 wording rewritten to user's exact specification — purity scan covers `lib/ingestion/**` excluding `__tests__/` and `*.test.*`; `tests/**` is explicitly out of scope. Adds a purity self-test that proves the scan correctly catches violations. Path moved to `lib/ingestion/index.ts`.
- **T6 (corpus + tests)**: adds `tests/fixtures/pliegos/corpus.yaml` manifest with required fields per pliego (`source_entity`, `modalidad`, `year`, `manual_labels`, `date_added`). Acceptance test now also validates the manifest schema and asserts the RN-011 triple-equivalence at the corpus level (not just unit level).

### Tasks removed
- None.

### Spec sections modified
- **Intention** — added the `lib/` vs `src/services/` convention rationale.
- **Functional Requirements** — REQ-001/003/005/006 updated; REQ-013/014/015/016/017 added (dual heading capture, synthetic invariant, corpus.yaml schema; the prior REQ-013/014/015 are renumbered to REQ-015/016/017).
- **Non-Functional Requirements** — NFR-03 rewritten to user's exact wording (scoped grep).
- **Business Rules** — RN-005 lost its "e.g." hedge (formula now mandated); RN-008 expanded to cover heading shapes; RN-011 added (synthetic/heading triple-equivalence + intent-vs-data principle); RN-012 added (downstream consumer contract — `claude-extraction` excludes both `isSynthetic === true` and `categoria === 'general'`).
- **Test Cases** — TC-003/004/009 rewritten to incorporate dual-heading capture and the scoped purity scan; TC-013/014/015 added for heading invariants and manifest schema.
- **Architecture / Decision Records** — ADR-007 added.
- **Architecture / Tradeoffs** — added rows for module location, header tolerance strategy, heading persistence form, and synthetic-segment marker.
- **Architecture / Dependencies on `domain-model`** — expanded from 3 changes to 8.
- **Architecture / Downstream Consumer Contract** — new subsection documenting RN-012.
- **Service Integrations diagram** — updated to show `claude-extraction` filtering `is_synthetic=false AND categoria!=general`.
- **Revision Log** — entry added for this edit.

### Impact on memory
- New repo-wide convention to capture: `lib/` vs `src/services/` distinction. Pure utilities (no global config coupling, dependencies passed as parameters) live under `lib/`; stateful or I/O-coupled services that own dependency wiring live under `src/services/`. This applies to ingestion, semáforo aggregation, Zod schemas, domain helpers (lib) versus Supabase client factories, realtime subscription managers, anything reading from `process.env` or holding long-lived connections (src/services). Promote via `/nybo-curate conventions add` when the second feature lands.
- New convention candidate: **dual-form persistence with explicit intent flag**. When data has a "raw" and "normalized" form, persist both and add an explicit boolean for the synthesis/intent semantics rather than inferring from NULL-ness. Pattern reusable for future heuristic-classification features. Promote via `/nybo-curate extract` after first ship.
- ADR-007 establishes a corpus-growth quality gate tied to product milestones, not just CI. Future features that depend on labeled data corpora should consider analogous milestone-gated growth plans.

---

## Delta 2026-04-26 — edit | propagate Documento → Pliego rename from domain-model rev 3

**Mode:** edit
**Rationale:** [domain-model revision 3](../domain-model/spec/spec.md) renamed `Documento` → `Pliego`, restricted `pliego_tipo` to `pliego_condiciones`/`pliego_definitivo`, and added the sibling `AnexoProceso` entity. This is a propagation edit only — no functional changes to pdf-ingestion's pure-function contract, NFD strategy, error hierarchy, or quality gates. Narrative references that pointed at the old `Documento` name are retargeted at `Pliego`; cache-key and FK terminology updated accordingly. New v1 scope subsection makes the Pliego-only routing decision explicit; new Upstream Caller Contract subsection assigns the entity-typed routing decision to the orchestrator (preserving pdf-ingestion's pure-function contract).
**Affected domains:** pliego-upload, requisito-extraction

### Tasks added
- None (task count unchanged at 6).

### Tasks modified
- **T1 (Types and Errors):** `Segment` shape Omit list now references `pliego_id` (was `documento_id`). Reflects the FK rename in domain-model rev 3. Dependencies note expanded to confirm both rev 2 and rev 3 must ship before T1.
- **T6 (Corpus + Tests):** `corpus.yaml` manifest gains a required `tipo` field (must be a valid `pliego_tipo` enum value — `pliego_condiciones` or `pliego_definitivo`). Corpus is explicitly Pliego-only; AnexoProceso fixtures are out of scope for v1.
- **T2/T3/T4/T5:** narrative-only — references to "Documento" → "Pliego" where the referenced concept is a pliego.

### Tasks removed
- None.

### Spec sections modified
- **Intention** — references `Pliego` row instead of `Documento`. New v1 Scope subsection (in: Pliego; out: AnexoProceso).
- **REQ-012** — clarifies `Segment` persistence-side FK is `pliego_id`; mentions `Pliego`/`PliegoTipo` types.
- **Architecture / Dependencies on `domain-model`** — T0 prerequisite block expanded from 8 to 11 items; items 9–11 cover the rename, AnexoProceso definition, and narrow `pliego_tipo` enum.
- **Architecture / Downstream Consumer Contract** — clarifies extraction operates over `Pliego[]` (v1 always passes exactly one Pliego).
- **Architecture / Upstream Caller Contract** (NEW subsection) — orchestrator MUST gate AnexoProceso uploads from `parsePliegoPdf`. The function itself is entity-agnostic at the signature; concentrating the entity-typed decision in the orchestrator preserves the pure-function contract.
- **Architecture / Service Integrations diagram** — Caller label notes "Pliego only — gates AnexoProceso"; persistence FK label clarified as `pliego_id`; new dotted edge for AnexoProceso storage path (not parsed).
- **Architecture / Tradeoffs** — new row "v1 entity scope — Pliego only, AnexoProceso deferred to v1.1+".
- **Use Cases (UC-01)** — preconditions clarified; cache + FK references updated.
- **Cache key terminology** — `(documento_hash, empresa_id)` → `(pliego_hash, empresa_id)`.
- **Revision Log** — entry added for revision 2.

### What's NOT changed
- Function signature `parsePliegoPdf(buffer: Buffer): Promise<Segment[]>` — unchanged.
- NFR-03 (purity scoping `lib/ingestion/**`) — unchanged.
- NFD normalization formula (REQ-005, RN-005) — unchanged.
- ADR-007 corpus growth gates — unchanged.
- Heading column strategy + `is_synthetic` + CHECK constraints — unchanged at the pdf-ingestion side; see domain-model rev 3 for the Pliego-side rename.
- 4-class error hierarchy — unchanged.
- T2/T3 parallelism after T1 — unchanged.

### Impact on memory
- **Pattern recognition (cross-feature):** propagation edits are now an established pattern in this project. When an entity rename ships in `domain-model`, every downstream spec that references it gets a follow-up narrative-only edit in the same session, tracked in its own deltas.md. The protocol is: (1) edit domain-model with the rename + revision log entry, (2) flag downstream impact in domain-model's deltas.md "Cross-spec coupling" note, (3) immediately edit each downstream spec with a propagation-only revision and link back to the domain-model rev. Worth promoting via `/nybo-curate conventions add` once a third feature ships and gets propagation-edited.
- **Cross-spec coupling note (resolved):** the pdf-ingestion ↔ domain-model coupling flagged in domain-model rev 3's deltas is now resolved by this edit. Future references to Documento/Pliego should use Pliego throughout.
- **Convention candidate:** "the function name is contract — not entity name." `parsePliegoPdf` was always correctly named for user vocabulary even when the schema entity was misnamed `Documento`. This is a useful reminder: function/skill names should match user vocabulary, not internal schema names; if they diverge, rename the schema (as we did) rather than the function.

---

## Delta 2026-04-27 — edit | Add process.env + @anthropic-ai/sdk to NFR-03 grep; converge logger detection to enumeration; fix residual claude-extraction → requisitos-extraction stale references; fix three Documento leftovers

**Mode:** edit
**Rationale:** The architectural-guardrails audit (2026-04-27) flagged that pdf-ingestion's purity grep was missing `process.env.*` (parity gap with `requisitos-extraction REQ-017` and `semaforo-aggregation REQ-013`) and that the logger detection used a regex (`/log(ger)?/i`) while the other two specs enumerate. The vocabulary-consistency audit (2026-04-27) flagged residual `claude-extraction` references in narrative + Mermaid diagram and three `Documento` leftovers (RN-001 cache key, RN-008 redefine list, Tradeoffs row). Bundling the closure of both gaps in one revision keeps the test artifact regen (purity grep + golden corpus untouched) atomic.
**Affected domains:** pliego-upload, requisito-extraction

### Tasks added
- None (task count unchanged at 6).

### Tasks modified
- **T5 (Public API + Purity Scan):** Forbidden-imports list extended — adds `process\.env\.[A-Z_]+` regex (closes the parity gap with the other two `lib/` specs), adds `@anthropic-ai/sdk` (defensive; pdf-ingestion has no LLM use case today, but this prevents future contributors from experimenting with LLM-based segmentation), converges logger detection from regex (`/log(ger)?/i`) to enumeration (`pino`, `winston`, `bunyan`, `@logtape/`, plus an "in-house logger module" placeholder list). The enumeration matches `requisitos-extraction REQ-017` and `semaforo-aggregation REQ-013` for cross-spec parity.

### Tasks removed
- None.

### Spec sections modified
- **NFR-03**: rewrote to include `@anthropic-ai/sdk`, `process.env.[A-Z_]+`, the enumerated logger list, and `node:fs/promises` + `node:https`; cross-references requisitos-extraction REQ-017 and semaforo-aggregation REQ-013 for parity.
- **RN-001**: `documento.file_hash` → `pliego.file_hash` (Documento leftover from rev 2).
- **RN-008**: redefine prohibition list `Segmento, Documento, SegmentoCategoria` → `Segmento, Pliego, SegmentoCategoria`.
- **RN-012**: downstream consumer name `claude-extraction` → `requisitos-extraction` (with link to that spec).
- **§293 narrative paragraph**: same rename.
- **§311 Mermaid diagram label**: `Extraction["claude-extraction\n(future spec)"]` → `Extraction["requisitos-extraction"]`.
- **Tradeoffs row "Purity boundary"**: `documento-keyed caching` → `pliego-keyed caching`.
- **Contract.md "Scoped purity scan" behavior**: forbidden-imports list updated to match NFR-03.
- **feat/00-overview.md**: line 9 "bound Claude cost" → "bound LLM cost"; line 13 `claude-extraction` → `requisitos-extraction`.
- **spec/use-cases.md UC-03 step 5**: `claude-extraction` → `requisitos-extraction`.
- **feat/10-verify.md T1 test scenario**: `Omit<SegmentoInsert, 'id'|'documento_id'|...>` → `'pliego_id'` (Documento leftover from rev 2).
- **Revision Log**: entry added for revision 3.

### Impact on memory
- **Convention candidate:** **Cross-spec purity-grep parity.** The three `lib/` specs (pdf-ingestion, requisitos-extraction, semaforo-aggregation) now share a converged forbidden-imports list. Differences are only contextual exceptions (`@anthropic-ai/sdk` allowed under `lib/extraction/anthropic/**`). When a fourth `lib/` spec is added, the same list applies by default. Worth documenting in `.nybo/foundation/conventions.yaml` via `/nybo-curate conventions add` once the convention has stabilized across two revisions.
- **Pattern reinforcement:** **Enumerated forbidden-imports list, not regex-based.** Regex-based detection (e.g., `/log(ger)?/i`) over-matches identifiers like `logarithm`/`epilog`. Enumeration is more precise; new modules are added by extending the list, not by tweaking a regex. Pattern echoes requisitos-extraction REQ-017 and semaforo-aggregation REQ-013.
- **Cross-spec coupling note (resolved):** The vocabulary-consistency audit's flagged stale references to `claude-extraction` are now closed across all four approved specs. The dead name no longer appears in any forward-looking reference; only historical changelog/delta entries retain it (intentionally, to record what was renamed).

---

## Delta 2026-05-04 — edit | Rev 4: re-plan to align with mvp-scope §59 + queue-fed pipeline

**Mode:** edit
**Rationale:** Rev 3 was approved 2026-04-27 as a pure-function pdf-ingestion contract. `mvp-scope.md` was consolidated 2026-04-28 and codified the OCR + table-parsing + empty-page-flagging requirements (§59) that rev 4 now ships. The 2026-05-04 pilot-research conversation established the queue-fed pipeline (Supabase pgmq dispatch → off-Vercel worker → page-aware writeback). All 15 prior task checkboxes were unchecked at re-plan time; no implementation work is lost. `domain-model-mvp` rev 1 shipped concurrently with rev 4 planning, providing the `pliego_uploads` ingestion columns + `pdf_pages` table that rev 4 depends on — T0 is therefore satisfied externally and is now a verification step rather than a prerequisite-edit step.
**Affected domains:** pliego-upload, requisito-extraction, integrations
**Cross-spec follow-ups:**
- `domain-model-mvp` rev 1 ✅ shipped 2026-05-04 (pliego_uploads ingestion cols + pdf_pages table + ADR-013).
- **`requisitos-extraction` RN-012 obsolescence → TODO for Sprint 3 separate edit session.** RN-012 in `requisitos-extraction` filtered out `isSynthetic === true` AND `categoria === 'general'` segments before LLM extraction. Both concepts (synthetic segments, the `general` categoría, the `Segment[]` shape itself) are obsoleted by the page-aware output schema in this rev — `requisitos-extraction` now consumes per-page `pdf_pages` rows. The RN-012 filter logic is therefore obsolete and must be retired. **No `requisitos-extraction` files were touched in this rev** — the retirement is its own edit session, planned for Sprint 3.

### Tasks added (8)

- T2 (Storage Fetch) — new
- T4 (OCR Fallback — Tesseract Spanish) — new
- T5 (Table Extractor — pdfplumber subprocess) — new
- T6 (Page Assembler — replaces old T4 segmenter) — repurposed (counted as new given the surface change is total)
- T7 (Error State Mapping) — new
- T8 (Queue Worker — idempotent writeback) — new
- T10 (Acceptance — <5% page-failure rate) — new (split from old T6)
- T11 (Bench — 200-page p95 <2 min) — new (split from old T6)

### Tasks modified (4)

- T0 — re-purposed from a prerequisite-edit step to a verification step (domain-model-mvp rev 1 shipped externally on 2026-05-04). Old T0 scope (heading/synthetic columns + `general` enum extension) trimmed — no longer needed.
- T1 — error hierarchy expanded from 4 to 7 subclasses (`OcrFailedError`, `TableParseFailedError`, `StorageFetchFailedError` added); ADR list expanded from 4 to 8 (ADR-005 marked Superseded; ADRs 008/009/010/011/012 added; ADR-007 tightened).
- T3 (text extractor) — narrowed scope (no longer needs to surface `NoTextLayerError` per page; the OCR-fallback decision moves to T6).
- T9 — corpus N=5 → N=20; manifest schema unchanged (already had `tipo` from rev 2); golden file format simplified to per-page sketches + adds a manual table-quality review document on 5 sampled pliegos (REQ-023).

### Tasks removed (2)

- Old T3 (Heuristic Categorizer — `matchSection` + `normalizeForMatch` + 5 header families) — entire categorizer is obsolete because output is now page-aware not segment-aware. Categorization moves to `requisitos-extraction` over the per-page text.
- Old T4 (Segment Assembler — `buildSegments` with `pageRange` + dual heading capture + `isSynthetic` correlation) — replaced by T6 page assembler. The `Segment[]` shape itself is obsoleted by `IngestionResult { pages: Page[] }`.

### Spec sections modified

- **Top-of-file Changelog block** — added (8 rows, each cross-referenced to mvp-scope §59).
- **Intention** — rewritten: pure function → queue-fed worker; v1 ingestion is queue-fed and side-effectful at entrypoint; inner pipeline retains purity boundary.
- **v1 Scope** — rewritten: still Pliego-only (AnexoProceso deferred); adds OCR + table parsing as in-scope per mvp-scope §59.
- **Use Cases** — UC-03 deleted (no-header fallback — categorization is gone); UC-05/UC-06/UC-07 added (OCR fallback, multi-column tables, empty-page flagging); UC-01/UC-02/UC-04 rewritten.
- **Functional Requirements** — REQ-001/004/006/013/014/015 dropped (pure-fn signature, 5-category constraint, 5-family header detection, heading capture, corpus N=5 — all obsoleted). REQ-002/007/008/009/010/011 amended for the new boundary. REQ-013 through REQ-024 added (queue-worker entrypoint signature, per-page output schema, OCR threshold + Spanish lang pack, library-based table extraction + 2/3-col MUST, empty-page flag MUST surface, corrupted/password-protected explicit error states, storage fetch from per-tenant prefix, idempotent writeback verbatim, eval corpus N=20, <5% page failure rate gate, 200-page <2 min performance gate, manual table-quality review).
- **Non-Functional Requirements** — NFR-01 rewritten (was p95 <3s/200pg → now <2 min for 200pg full pipeline); NFR-03 rewritten as scope-shrink reaffirmation (covers `lib/ingestion/**` only; worker `src/services/ingestion-worker/` exempt by design; forbidden-imports list unchanged).
- **Business Rules** — RN-002/005/011/012 dropped. RN-001/006/007 amended for the new boundary. RN-013/014/015/016/017 added (queue-worker boundary, page-contiguity invariant, OCR confidence captured + exposed, storage-fetch idempotency, ingestion-result schema versioning).
- **Test Cases** — old TC-001 through TC-015 dropped; TC-001 through TC-013 added covering page-aware output, encrypted/malformed maps, OCR fallback, multi-column tables, empty-page flag, idempotent re-delivery, storage fetch by id, scoped purity scan, corpus <5% page-failure, p95 <2 min, domain types not redefined, manifest schema.
- **Architecture / Decision Records** — ADR table fully restructured per the 8 ADRs above.
- **Architecture / Tradeoffs** — heuristic-categorizer / heading-persistence / synthetic-marker rows dropped; OCR-bundling / table-lib / queue-worker-boundary / page-aware-output rows added.
- **Architecture / Mermaid diagram (Service Integrations)** — redrawn: queue → worker → storage fetch → text → OCR → tables → assembler → writeback to `pdf_pages` + `pliego_uploads` status.
- **Architecture / Dependencies on `domain-model-mvp`** — replaces the old "Dependencies on `domain-model`" section; lists the three items shipped in rev 1.
- **Architecture / Dependencies on `pliego-upload`** — new subsection: queue-trigger contract + status callback.
- **Architecture / Dependencies on `storage`** — new subsection: per-tenant prefix path convention + RLS read policy.
- **Architecture / API / Data Contracts** — replaced `parsePliegoPdf(buffer)` with `processPliegoUpload(pliego_upload_id)` + `IngestionStatusRepository` interface.
- **Domains Touched** — added `pdf-ingestion` as candidate for new domain promotion (per ADR-007 second-strategy condition).
- **Revision Log** — rev 4 row added with full last_revision message.

### Impact on memory

- **Pattern reinforcement: re-plan after consolidation event.** When a project-level definition document (mvp-scope.md, anti-goals.md) is consolidated AFTER a feature spec is approved, that spec almost always needs a re-plan, not a tweak. Rev 4 of pdf-ingestion is the canonical example — three months from rev-3 approval to rev-4 re-plan; the difference is that pure-function ingestion v1 didn't have OCR/tables/empty-page-flag in scope but mvp-scope §59 mandates them now. Worth promoting via `/nybo-curate conventions add` once a second feature follows the same arc.
- **Convention candidate: worker boundary split for I/O-coupled pure pipelines.** The ADR-010 + ADR-011 pattern (port interface in `lib/<feature>/ports/`, Supabase impl in `src/services/<feature>-worker/`, NFR-03 scope `lib/<feature>/**`) is reusable for any future feature whose core is a deterministic pipeline coupled to async I/O at the entrypoint. Promote via `/nybo-curate extract` once a second feature adopts it.
- **ADR-007 update:** corpus growth tied to ≥85% extraction-accuracy quality bar (per `quality-bars.md`) — gate cadence is now N=20 → 50 → 100 with page-failure rate as the metric, not category-match rate.
- **Cross-spec follow-up TODO for Sprint 3:** retire `requisitos-extraction` RN-012 (synthetic + general filter) — it's obsolete because `Segment[]` and `general` categoría no longer exist. Captured here, not acted on in this rev.
