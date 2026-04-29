# Progress Tracker

**Status:** In Review (all 11 tasks implemented including the Storybook revision; final quality gate green in 7s on dev machine)

**Current Task:** None — ready for second `/nybo-verify` pass post-Storybook

---

## Task Checklist

### T1: Vendor source bundle + write 3 ADRs
- [x] Implement Task 1: 51 files vendored at `docs/design-system/source/` during `/nybo-plan`; ADR-016 / 017 / 018 authored at the same time. T1 of `/nybo-run` only normalized the section headers (Status as `## Status` heading instead of `- **Status:**` bullet, matching ADR-013/014/015 style).
- [x] Verify Task 1: `find docs/design-system/source -type f | wc -l` prints `51`; all three ADRs contain Status / Context / Decision / Alternatives Considered / Consequences sections.

### T2: Self-host Geist + JetBrains Mono via next/font/google
- [x] Implement Task 2: 10 Geist `.ttf` files copied byte-identical from bundle to `public/fonts/`; `app/layout.tsx` updated with `<link rel="preload">` for the variable file + `JetBrains_Mono` import via `next/font/google` exposing `--font-mono`.
- [x] Verify Task 2: `ls public/fonts/Geist-*.ttf | wc -l` prints `10`; `<link rel="preload">` present in layout; `npm run build` succeeds.

### T3: Logo SVGs + favicon
- [x] Implement Task 3: `public/logo/coltratos-mark.svg`, `public/logo/coltratos-lockup.svg`, `app/icon.svg` all created; warning comment per REQ-013 added to all three.
- [x] Verify Task 3: `npm run build` shows `/icon.svg` as a route (Next.js auto-detected the favicon convention); warning comment grep-able in all three SVGs.

### T4: Token layer (app/globals.css rewrite)
- [x] Implement Task 4: `app/globals.css` rewritten with `@import "tailwindcss"` + 10 `@font-face` blocks + `@theme` block (Tailwind utility tokens) + `:root` block (1:1 with bundle's `colors_and_type.css` lines 30–199, 100+ tokens).
- [x] Verify Task 4: `npm run typecheck && npm run build` succeed; Tailwind utilities like `bg-navy-900`, `font-display`, `rounded-lg`, `shadow-sm`, `bg-tint-blue` resolve to bundle values; token-parity test (T9, NFR-04) passes.

### T5: `<Icon>` component
- [x] Implement Task 5: `src/components/ui/icon.tsx` with 28 path entries copied byte-identical from `docs/design-system/source/project/ui_kits/coltratos-app/shell.jsx:7-37`; `IconName` derived as `keyof typeof PATHS`; `aria-hidden="true"` by default; type-test at `__tests__/icon.test-d.ts` asserts the union exactly equals the 28-entry documented set.
- [x] Verify Task 5: `npm run test:type` (run as part of `npm run test`) reports the type-test passing; renaming a key without updating the union would fail the test.

### T6: Primitives (Button, Card, Chip, Well, Banner)
- [x] Implement Task 6: All 5 primitives at `src/components/ui/`; barrel `index.ts` re-exports each plus `Icon` and `IconName`; each carries `data-component="<name>"` for selector targeting; Button uses `Omit<..., 'style'>` to enforce RN-005.
- [x] Verify Task 6: `npm run typecheck && npm run lint` exit 0; smoke test (T9, REQ-012) confirms all 5 render via `data-component` selectors.

### T7: Shell (Sidebar Client + Topbar Server)
- [x] Implement Task 7: `src/components/shell/sidebar.tsx` with `"use client"` directive (only file in `src/` that has it); `src/components/shell/topbar.tsx` is a pure Server Component; barrel `index.ts` re-exports both. Sidebar renders 7 nav items (Dashboard / Subir pliego / Mis análisis 147 / Alertas 3 / Créditos / Mi equipo / Configuración) + credits card 23/50 + user card María Rodríguez. The reverse-engineered logo is loaded via `next/image` (warning comment preserved).
- [x] Verify Task 7: RSC-purity test (T9, NFR-05) confirms only `src/components/shell/sidebar.tsx` carries the directive.

### T8: `/design-system` preview route
- [x] Implement Task 8: `app/(internal)/layout.tsx` (route group layout) + `app/(internal)/design-system/page.tsx` (Server Component). Page renders 10 specimen cards in spec order: anchor colors → primary+green → semáforo → type scale → spacing/radii/shadow → buttons & chips → form inputs → KPI grid → logo light/dark → iconography (28 icons + 6 wells). One Banner near the top.
- [x] Verify Task 8: `npm run build` shows `/design-system` prerendered as static; smoke test (T9, REQ-012) confirms the page renders all 5 primitives + the COLTRATOS wordmark.

### T9: Token-parity + RSC-purity + page-smoke tests
- [x] Implement Task 9: `src/__tests__/token-parity.test.ts` (NFR-04), `src/__tests__/rsc-purity.test.ts` (NFR-05), `src/__tests__/design-system-page.test.tsx` (REQ-012). Installed `@testing-library/react`, `@testing-library/dom`, `jsdom`, `vite-tsconfig-paths` as devDependencies. Wrapped the type-test in `describe`/`test` (vitest 4 requires a test suite, not bare `expectTypeOf`).
- [x] Verify Task 9: `npm run test` reports 6 test files, 7 tests, 0 failures, 0 type errors. Final 4-gate sequence (typecheck → lint → build → test) exits 0 in 10.1s wall clock.

---

## Completion Summary

**Final quality gate:**
- `npm run typecheck` → exit 0
- `npm run lint` → exit 0 (no warnings)
- `npm run build` → exit 0 (4 routes static-prerendered: `/`, `/_not-found`, `/design-system`, `/icon.svg`)
- `npm run test` → exit 0 (6 files, 7 tests, 0 failures, 0 type errors)
- **Total wall clock:** 10.1s on developer machine (NFR-01 LCP target was < 1.5s for the page; build + tests are faster than that)

**Audit:** Inherited from project-bootstrap — 0 high, 2 moderate (transitive `postcss` inside `next`). 1 new transitive moderate may have been added by `@testing-library/dom`; queued for next audit pass.

**Notable adjustments during execution:**
- ADR-016/017/018 section header style normalized to `## Status` (was `- **Status:**`) for consistency with ADR-013/014/015.
- Vitest 4 type-test required a `describe`/`test` wrapper around `expectTypeOf` — bare assertions outside a test suite are no longer allowed.
- `vite-tsconfig-paths` plugin added so vitest resolves `@/components/ui` (the alias from `tsconfig.json`) when transforming page.tsx outside the test root.
- `@/components/ui` had to be added explicitly because `app/(internal)/design-system/page.tsx` lives outside `src/` and the bare `'@': './src'` alias doesn't auto-extend to index.ts.
- Sidebar uses `next/image` instead of `<img>` to clear the lint warning; the logo SVG keeps its REQ-013 warning comment.

---

## Storybook revision (2026-04-28, post-verify)

User requested moving the design-system surface off the in-app `/design-system` route and into Storybook. Captured as a delta in [deltas.md](../deltas.md). Two new tasks added:

### T10: Storybook scaffold + configuration
- [x] Implement Task 10: `npx storybook@latest init` (auto-detected Next.js, picked `@storybook/nextjs-vite` framework). Configured `.storybook/main.ts` (stories pattern: `./docs/**/*.mdx` + `../src/**/*.stories.{ts,tsx}`) + `.storybook/preview.ts` (imports `../app/globals.css`, sets `layout: 'padded'`, navy / canvas / white background presets, a11y addon configured to "todo" mode).
- [x] Verify Task 10: `npm run build-storybook` succeeds (static export to `storybook-static/`); `npm run storybook` boots dev server on port 6006.

### T11: Component stories + token MDX docs
- [x] Implement Task 11: 8 `*.stories.tsx` files alongside primitives (Button, Card, Chip, Well, Banner, Icon, Sidebar, Topbar). 4 token MDX docs at `.storybook/docs/` (Colors, Typography, Layout, Brand). Each variant story carries a `play` function asserting render shape; runs in `vitest`'s third workspace project (`storybook`, browser mode via headless Chromium).
- [x] Verify Task 11: `npm run test` reports **14 test files, 52 tests passing** (3 unit projects + 1 type project + 1 storybook browser project). Story play functions hit each variant + Sidebar/Topbar shells.

### Files removed (per delta)
- `app/(internal)/design-system/page.tsx`, `app/(internal)/layout.tsx`
- `src/__tests__/design-system-page.test.tsx` (REQ-012 smoke moved to `src/__tests__/primitives-smoke.test.tsx` + story play functions)

### Files added (per delta)
- `.storybook/{main.ts, preview.ts}`
- `.storybook/docs/{Colors, Typography, Layout, Brand}.mdx`
- `src/components/ui/{button, card, chip, well, banner, icon}.stories.tsx`
- `src/components/shell/{sidebar, topbar}.stories.tsx`
- `src/__tests__/primitives-smoke.test.tsx`

### Final post-revision quality gate
- `npm run typecheck` → 0
- `npm run lint` → 0
- `npm run build` → 0 (3 routes: `/`, `/_not-found`, `/icon.svg` — no `/design-system`)
- `npm run test` → 0 (14 files, 52 tests, 7s)
- `npm run build-storybook` → 0 (~1s vite build, ~250 MB output)

Spec status returns to `in-review` for a second /nybo-verify pass on the post-Storybook implementation.
