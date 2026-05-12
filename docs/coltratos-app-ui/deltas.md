## Delta 2026-05-06 — edit | Resultado del análisis: real-data + citations + PDF viewer + re-run + feedback + warnings + loading states

**Mode:** edit
**Rationale (verbatim):** Pilots see verdict clearly, drill into any requisito to see source quote in original PDF, trust output because every claim is cited. Built on Design System components. Mobile-responsive, desktop-optimized (office context). All Spanish. May extend Design System (PDF viewer w/ highlight) — propose extending DS rather than inlining. Originally invoked as `/nybo-plan create analysis-results-ui` — pivoted to edit `coltratos-app-ui` because REQ-012/013/014 already cover this surface; rather than fork a sibling spec, the existing one was extended to target the gaps the user described.
**Affected domains:** contratacion-publica, database, integrations

### Tasks added
- **T11** — Resultado real-data loader (`getAnalysisDetail` Kysely + page rewrite)
- **T12** — Proceso metadata header + SECOP II link + unverified-status badge
- **T13** — Verdict banner refinement (canonical SemPill, deterministic narrative, no edit affordance)
- **T14** — Requisito row + expand panel + citation block + new `Quote` DS primitive
- **T15** — `PdfViewer` DS primitive + signed-URL helper + text-search highlight (introduces single dep `react-pdf` per S6 Flag F-1)
- **T16** — Re-run server action (insert new `analyses` row, never mutate) + `RerunButton`
- **T17** — Partial-extraction warning surface above the verdict + `WarningBanner` DS primitive + flagged-pages drawer
- **T18** — Relevance feedback: `analysis_feedback` migration with RLS, `submitFeedback` action, `FeedbackThumbs` DS primitive
- **T19** — Export trigger button (delegates to future `report-export` feature)
- **T20** — Loading states tied to real `extraction_status`/`extraction_stage` (no generic spinner)

### Tasks modified
- **T7** — relabeled "Resultado page hero + tabs + accordion (mock)" — feeds T11+. Already `[x]` shipped; not modified, only superseded for real-data behavior.
- **spec.md** — Intention rewritten to distinguish T1–T10 (mock) vs T11+ (real-data); REQ-012/013/014 rewritten to reflect real-data wiring; REQ-022–029 added; NFR-01/02/03/04 extended; NFR-06 (responsive) and NFR-07 (RLS + signed URL) added; RN-002 rewritten for canonical verdict values; RN-006–010 added; Data Model section rewritten with read tables, write tables, `analysis_feedback` migration spec, and reproducibility rule; Page→Route table updated to RSC + nested Client; Dependencies block added; S6 Flags section added (F-1 PDF lib, F-2 highlight strategy, F-3 re-run UX); Revision Log appended.
- **use-cases.md** — UC-06 rewritten (real-data flow, unverified branch, partial-extraction branch, loading state, error states); UC-09 (PDF viewer), UC-10 (re-run), UC-11 (feedback) added.
- **contract/contract.md** — TDD entries added for T11 (RLS, single-query), T12 (verified/unverified branches), T13 (SemPill canonical, no-edit invariant), T14 (citation block, missing-quote fallback), T15 (signed URL RLS, quote-not-found chip), T16 (insert-not-mutate, cross-company RLS), T17 (banner DOM order, failed-state replacement), T18 (upsert/toggle/RLS), T19 (disabled placeholder), T20 (no spinner, polling stop).
- **feat/00-overview.md** — task index split into "Shipped" (T1–T10) and "Revision 2026-05-06" (T11–T20); dependency graph extended.
- **feat/99-progress.md** — T11–T20 unchecked entries appended below the existing T1–T10 (which remain `[x]` and untouched).
- **status.yaml** — `updated`, `revision_count: 1`, `last_revision` summary added; `status: in-review` preserved.

### Tasks removed
- None. T1–T10 are shipped and not modified.

### Impact on memory
- **contratacion-publica domain** — the rule that **MUST** show `proceso_lookup_status = 'unverified'` prominently as a first-class state (not degraded mode) is already in domain memory; this revision is the first surface to enforce it visibly — consider promoting the implementation pattern (badge in metadata strip, "No disponible" replacement for SECOP II link) to the domain memory's Patterns section after T12 ships.
- **database domain** — `analysis_feedback` introduces a new tenant-scoped table that **MUST** carry RLS at creation. Worth re-confirming the convention "RLS at table-creation, not retroactively" survived this revision in the migration template.
- **integrations domain** — text-search highlight strategy (S6 Flag F-2 option a) is the documented fallback when extracted text differs from rendered text; surfacing the "Cita no encontrada" chip rather than silent miss is a new pattern worth curating once T15 ships.
- **A new design system convention** is implied: any new Resultado-shaped surface **MUST** extend the design system rather than inline a primitive; `PdfViewer`, `Quote`, `WarningBanner`, `FeedbackThumbs` are now DS primitives. Worth curating after T14/T15/T17/T18 ship.
- **Verdict immutability (RN-006)** is a new business rule; consider promoting to the contratacion-publica domain memory file after this revision is approved.
