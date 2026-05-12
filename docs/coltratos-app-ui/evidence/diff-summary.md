# Diff Summary — coltratos-app-ui

## New files (app routes)
- `app/dashboard/layout.tsx` — client wrapper with collapse state
- `app/dashboard/page.tsx` — Dashboard with 4 stat cards + recent análisis table
- `app/dashboard/procesos/page.tsx` + `_components/procesos-table.tsx`
- `app/dashboard/upload/page.tsx` — 2-step upload + progress screen (client)
- `app/dashboard/analisis/page.tsx` + `_components/analisis-table.tsx`
- `app/dashboard/analisis/[id]/page.tsx` + `_components/result-tabs.tsx`
- `app/dashboard/creditos/page.tsx` + `_components/package-selector.tsx`
- `app/dashboard/equipo/page.tsx` + `_components/member-table.tsx`
- `app/dashboard/alertas/page.tsx` — placeholder
- `app/dashboard/config/page.tsx` — placeholder

## New files (components)
- `src/components/page/sem-pill.tsx`
- `src/components/page/stat-card.tsx`
- `src/components/page/page-header.tsx`
- `src/components/page/data-table.tsx`
- `src/components/page/toolbar.tsx`
- `src/components/page/pagination.tsx`
- `src/components/page/placeholder.tsx`
- `src/components/page/index.ts`
- `src/lib/mock/index.ts` — 5 typed mock constants

## Modified files
- `src/components/shell/sidebar.tsx` — usePathname active, collapse prop, Link nav, Procesos item
- `src/components/ui/icon.tsx` — 7 new icons: file-text, target, archive, dollar-sign, bar-chart, user-plus, check
- `src/components/ui/__tests__/icon.test-d.ts` — updated Expected to 35 icons
- `src/components/shell/sidebar.stories.tsx` — removed stale initialActive args

## New test files
- `src/__tests__/nav-shell.test.tsx`
- `src/__tests__/sem-pill.test.tsx`
- `src/__tests__/mock-data.test-d.ts`
- `src/__tests__/upload-flow.test.tsx`
- `src/__tests__/result-tabs.test.tsx`

---

## Revision 2026-05-12 — T11–T20 real-data wiring (new files)

### New implementation files
- `src/types/domain/analysis.ts` — AnalysisDetail, RequisitoView, FeedbackRow types
- `src/lib/queries/analysis-detail.ts` — getAnalysisDetail() Kysely query
- `src/lib/server/auth-context.ts` — getAuthContext() server utility
- `src/lib/server/signed-url.ts` — getPliegoSignedUrl() RLS-scoped helper
- `src/lib/errors/analysis-errors.ts` — NotFoundError, ProfileMissingError
- `src/lib/features/report-export.ts` — REPORT_EXPORT_ENABLED feature flag
- `app/dashboard/analisis/[id]/page.tsx` (modified) — real-data SSR wiring
- `app/dashboard/analisis/[id]/_components/proceso-header.tsx`
- `app/dashboard/analisis/[id]/_components/verdict-banner.tsx`
- `app/dashboard/analisis/[id]/_components/result-tabs.tsx` (rewrite)
- `app/dashboard/analisis/[id]/_components/requisito-row.tsx`
- `app/dashboard/analisis/[id]/_components/citation-block.tsx`
- `app/dashboard/analisis/[id]/_components/extraction-warning.tsx`
- `app/dashboard/analisis/[id]/_components/extraction-loading.tsx`
- `app/dashboard/analisis/[id]/_components/extraction-stages.ts`
- `app/dashboard/analisis/[id]/_components/rerun-button.tsx`
- `app/dashboard/analisis/[id]/_components/export-button.tsx`
- `app/dashboard/analisis/[id]/_components/feedback-thumbs.tsx`
- `app/dashboard/analisis/[id]/_actions/rerun-analysis.ts`
- `app/dashboard/analisis/[id]/_actions/submit-feedback.ts`
- `app/api/analyses/[id]/pliego-url/route.ts`
- `app/api/analyses/[id]/status/route.ts`
- `src/components/ui/quote.tsx`
- `src/components/ui/warning-banner.tsx`
- `src/components/ui/feedback-thumbs.tsx`
- `src/components/ui/pdf-viewer.tsx`
- `supabase/migrations/20260512000000_create_analysis_feedback.sql`

### New test files (T11–T20)
- `src/__tests__/proceso-header.test.tsx`
- `src/__tests__/verdict-banner.test.tsx` (via verdict-banner.test.tsx)
- `src/__tests__/requisito-row.test.tsx`
- `src/__tests__/pdf-viewer.test.tsx`
- `src/__tests__/pliego-url-route.test.ts`
- `src/__tests__/rerun-button.test.tsx`
- `src/__tests__/rerun-analysis.test.ts`
- `src/__tests__/extraction-warning.test.tsx`
- `src/__tests__/feedback-thumbs.test.tsx`
- `src/__tests__/submit-feedback.test.ts`
- `src/__tests__/export-button.test.tsx`
- `src/__tests__/extraction-loading.test.tsx`
- `src/__tests__/analysis-detail-rls.integration.test.ts` (db project, skipped in unit run)
- `src/__tests__/rsc-purity.test.ts` (updated allowlist)

### Diff summary (branch vs main at time of verify)
Total branch: 184 files changed, +14033/-2921 lines
(Branch includes other doc-only spec commits; coltratos-app-ui implementation
 is confined to the files listed above)
