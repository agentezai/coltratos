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
