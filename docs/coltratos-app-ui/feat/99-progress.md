# Progress: coltratos-app-ui

### T1: Nav shell wiring
- [x] Implement T1: Update Sidebar — add Procesos, usePathname active, collapse support
- [x] Verify T1: All nav items route correctly; collapse works — 3/3 tests pass

### T2: Shared page primitives
- [x] Implement T2: StatCard, SemPill, PageHeader, DataTable, Toolbar, Pagination, PlaceholderPage + mock data
- [x] Verify T2: SemPill 3/3 tests pass; mock data types pass

### T3: Dashboard page
- [x] Implement T3: /dashboard with 4 stat cards + recent análisis table
- [x] Verify T3: 5-row table, correct SemPill, navigation links

### T4: Procesos page
- [x] Implement T4: /dashboard/procesos with filter bar + table
- [x] Verify T4: Search/sem filter, upload icon navigation

### T5: Upload flow
- [x] Implement T5: /dashboard/upload — 2-step form + progress screen
- [x] Verify T5: 4/4 tests pass — enable/disable, URL mock, progress transition

### T6: Mis Análisis page
- [x] Implement T6: /dashboard/analisis with 5 stat cards + table + pagination
- [x] Verify T6: Dot indicators, pagination, SemPill correct

### T7: Resultado del análisis page
- [x] Implement T7: /dashboard/analisis/[id] with hero + tabs + accordion
- [x] Verify T7: 2/2 tests pass — accordion toggle, tab switching

### T8: Créditos page
- [x] Implement T8: /dashboard/creditos with balance + chart + packages + invoices
- [x] Verify T8: PackageSelector, Vencida pill, navy gradient card

### T9: Equipo page
- [x] Implement T9: /dashboard/equipo with member table + roles sidebar + activity
- [x] Verify T9: Role pills, search filter, activity feed

### T10: Placeholder pages
- [x] Implement T10: /dashboard/alertas + /dashboard/config placeholder pages
- [x] Verify T10: Both render with correct icons

---

## Revision 2026-05-06 — Resultado del análisis real-data wiring

### T11: Result real-data loader
- [x] Implement T11: `getAnalysisDetail(id, companyId)` Kysely + page rewrite
- [x] Verify T11: RLS test (foreign-company analysis returns null); single-query happy path
  - Unit tests: 4/4 pass (RLS null return, full aggregate map, feedback mapping, flagged pages)
  - result-tabs.tsx rewritten to accept AnalysisDetail; T7 tests updated + still pass (2/2)
  - SemPill extended with canonical verde/amarillo/rojo values; legacy form retained
  - Integration tests written at src/__tests__/analysis-detail-rls.integration.test.ts (require db:start)
  - npm run build clean; npm run typecheck clean

### T12: Proceso metadata header + SECOP II link
- [x] Implement T12: `proceso-header.tsx` reading from `proceso_metadata_snapshot`
- [x] Verify T12: verified vs unverified branches; SECOP II link target
  - Unit tests: 6/6 pass (verified branch: 5 metadata fields, correct href, no unverified badge, line-clamp-2; unverified branch: amber chip, no SECOP II link + "No disponible")
  - ProcesoHeader wired into `app/dashboard/analisis/[id]/page.tsx` above the hero card
  - `npm run build` clean; `tsc --noEmit` clean; lint 0 errors

### T13: Verdict banner refinement
- [x] Implement T13: real-data verdict banner + canonical `SemPill` mapping
- [x] Verify T13: 3 verdict branches; deterministic counts reducer; no edit affordance
  - SemPill canonical tests: 6/6 pass (3 legacy + 3 canonical verde/amarillo/rojo)
  - VerdictBanner unit tests: 6/6 pass (3 verdict branches, counts reducer, no edit affordance x2)
  - `verdict-banner.tsx` extracted as a standalone component; inline hero removed from page.tsx
  - `computeVerdictCounts` exported for re-use; narrative derived deterministically
  - `npm run build` clean; `tsc --noEmit` clean; lint 0 errors

### T14: Requisito row + expand panel
- [x] Implement T14: `result-tabs.tsx` rewrite, `requisito-row.tsx`, `citation-block.tsx`, `Quote` DS primitive
- [x] Verify T14: Resumen severity sort; tipo filtering; expand reveals citation; missing-quote fallback
  - Unit tests: 16/16 pass (4 RequisitoRow, 4 CitationBlock, 4 confidence indicator levels, 2 sort/filter ResultTabs, 2 Quote primitive)
  - `result-tabs.tsx` rewritten: 4 tabs (Resumen/Jurídico/Técnico/Financiero, no Experiencia tab)
  - `requisito-row.tsx` new: collapsed line-clamp-1 + SemPill + confidence indicator; expanded reason + CitationBlock
  - `citation-block.tsx` new: quote + page footer + "Abrir página en PDF" CTA; missing-quote fallback (RN-008)
  - `src/components/ui/quote.tsx` new DS primitive; exported from `src/components/ui/index.ts`
  - npm run build clean; tsc --noEmit clean; lint 0 errors

### T15: PDF viewer DS primitive + signed URL
- [x] Implement T15: `PdfViewer` (modal/drawer responsive), signed-URL endpoint, text-search highlight
  - `react-pdf@^9.2.1` added to dependencies
  - `src/components/ui/pdf-viewer.tsx` — PdfViewer DS primitive (modal < lg / drawer ≥ lg); optimistic quote-not-found chip (REQ-023); text-layer highlight on find
  - `src/lib/server/signed-url.ts` — `getPliegoSignedUrl(analysisId, companyId)` with RLS-scoped query
  - `app/api/analyses/[id]/pliego-url/route.ts` — POST endpoint; 401 no session; 404 RLS miss; 200 { url }
  - `app/dashboard/analisis/[id]/_components/result-tabs.tsx` — `handleOpenPdf` wired; PdfViewer rendered; signed URL dropped on close
  - `app/dashboard/analisis/[id]/_components/citation-block.tsx` — `onOpenPdf` updated to `(args: OpenPdfArgs) => void` to carry `quote`
  - `src/__tests__/pdf-viewer.test.tsx` — 4/4 tests pass (initialPage, quote-not-found chip, null quote, closed state)
  - `src/__tests__/pliego-url-route.test.ts` — 3/3 tests pass (401, 404 RLS, 200 success)
  - `src/__tests__/rsc-purity.test.ts` — NFR-02 exception documented; allowlist updated
  - 256/256 tests pass; typecheck clean; lint 0 errors; build clean
- [ ] Verify T15: `react-pdf` install; RLS on signed URL; quote-not-found chip

### T16: Re-run server action
- [x] Implement T16: `rerunAnalysis` server action + `RerunButton`
  - `app/dashboard/analisis/[id]/_actions/rerun-analysis.ts` — 'use server' action; RLS-scoped lookup + INSERT only (never UPDATE); NotFoundError + ProfileMissingError
  - `app/dashboard/analisis/[id]/_components/rerun-button.tsx` — 'use client'; native dialog confirmation; error inline; navigates to new analysis URL on success
  - `src/lib/errors/analysis-errors.ts` — shared error classes (not in 'use server' file per Turbopack constraint)
  - VerdictBanner T16 placeholder replaced; ExtractionFailedState placeholder replaced
  - verdict-banner.test.tsx updated with next/navigation + rerunAnalysis mocks
  - Unit tests: 5/5 rerun-button + 5/5 rerun-analysis = 10 new tests; 266/266 total pass
  - typecheck clean; lint 0 errors; build clean
- [ ] Verify T16: original row not mutated; navigation to new analysis ID; RLS test

### T17: Partial-extraction warning surface
- [x] Implement T17: `extraction-warning.tsx`, `WarningBanner` DS primitive
  - `src/components/ui/warning-banner.tsx` — `WarningBanner` DS primitive: amber/red variants, optional action button, optional dismiss (default non-dismissible)
  - `app/dashboard/analisis/[id]/_components/extraction-warning.tsx` — `ExtractionWarning`: partial branch (amber + drawer), failed branch (red + RerunButton), null when clean
  - `FlaggedPagesDrawer` — internal drawer listing flagged page numbers (opens from "Ver páginas afectadas" CTA)
  - Wired into `page.tsx`: `ExtractionWarning` renders above `VerdictBanner`; failed state handled at page level by routing through `ExtractionWarning`; inline amber placeholder replaced
  - `ExtractionFailedState` local component removed from page.tsx (superseded by ExtractionWarning)
  - `WarningBanner` exported from `src/components/ui/index.ts`
  - Unit tests: 11/11 pass (5 WarningBanner primitive, 6 ExtractionWarning); 179/179 unit tests total pass
  - `tsc --noEmit` clean; `npm run lint` 0 errors; `npm run build` clean
- [ ] Verify T17: banner above verdict; flagged-pages drawer; failed-state replaces verdict

### T18: Relevance feedback action + storage
- [x] Implement T18: `analysis_feedback` migration + RLS, `submitFeedback` action, `FeedbackThumbs` DS primitive
  - `supabase/migrations/20260512000000_create_analysis_feedback.sql` — table + 4 RLS policies (select/insert/update/delete) + created_at index
  - `app/dashboard/analisis/[id]/_actions/submit-feedback.ts` — 'use server' upsert (rating='up'|'down') / delete (rating=null toggle-off); throws NotFoundError when unauthenticated
  - `src/components/ui/feedback-thumbs.tsx` — DS primitive: ThumbsUp/ThumbsDown buttons, active filled state, optional comment input (maxLength=200), "Enviar" button, toast "Gracias por tu opinión"
  - `app/dashboard/analisis/[id]/_components/feedback-thumbs.tsx` — page-level wrapper wiring DS primitive to submitFeedback action
  - VerdictBanner updated: T18 placeholder replaced with real FeedbackThumbs
  - `src/components/ui/index.ts` — FeedbackThumbs exported
  - `src/__tests__/rsc-purity.test.ts` — feedback-thumbs.tsx added to 'use client' allowlist
  - Unit tests: 8/8 submitFeedback + 9/9 FeedbackThumbs = 17 new tests; 294/294 total pass
  - `tsc --noEmit` clean; `npm run lint` 0 errors; `npm run build` clean
- [ ] Verify T18: RLS test; upsert/delete/toggle paths; 200-char comment limit

### T19: Export trigger button
- [x] Implement T19: `export-button.tsx` with feature-flag detection
  - `src/lib/features/report-export.ts` — `REPORT_EXPORT_ENABLED` flag from `NEXT_PUBLIC_REPORT_EXPORT_ENABLED`
  - `app/dashboard/analisis/[id]/_components/export-button.tsx` — Mode A (enabled) / Mode B (disabled + "Próximamente" tooltip)
  - VerdictBanner T19 placeholder replaced with real `<ExportButton analysisId={detail.id} />`
  - Unit tests: 4/4 pass (label, disabled state, tooltip copy, no-throw on click)
  - `tsc --noEmit` clean; `npm run lint` 0 errors; `npm run build` clean
- [ ] Verify T19: disabled state with "Próximamente" tooltip when `report-export` not shipped

### T20: Loading states tied to real progress
- [x] Implement T20: `ExtractionLoading`, status endpoint, polling client child
  - `app/dashboard/analisis/[id]/_components/extraction-stages.ts` — `ExtractionStage` type + `STAGE_DISPLAY` + `stageToPct`
  - `app/api/analyses/[id]/status/route.ts` — GET endpoint; 401/404/200; Cache-Control: no-store
  - `app/dashboard/analisis/[id]/_components/extraction-loading.tsx` — `ExtractionLoading` (Client Component with 'use client'); `ExtractionStatusPoller` exported for tests; `ExtractionStepper` with `data-testid` per step; `ProgressRing` SVG; 10-min safety cap via `setTimeout`; `router.refresh()` on terminal status
  - `page.tsx` updated: `ExtractionLoadingState` placeholder removed; real `ExtractionLoading` wired in for `pending | extracting` branch
  - Unit tests: 8/8 pass (3 no-spinner/stepper, 2 polling-stops, 3 API route)
  - 306/306 total tests pass; `tsc --noEmit` clean; `npm run lint` 0 errors; `npm run build` clean
- [ ] Verify T20: stage-driven stepper; polling stops on terminal state; 10-min safety cap
