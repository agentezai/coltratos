# Progress Tracker

**Status:** Not Started

**Current Task:** None — awaiting `project-bootstrap` to ship first

---

## Task Checklist

### T1: Vendor source bundle + write 3 ADRs
- [ ] Implement Task 1: Verify 50 files vendored under `docs/design-system/source/`; author ADR-016 / ADR-017 / ADR-018 under `.nybo/foundation/adrs/`
- [ ] Verify Task 1: File count + ADR section presence + zero edits to bundle

### T2: Self-host Geist; load JetBrains Mono via next/font/google
- [ ] Implement Task 2: Copy 10 Geist `.ttf` to `public/fonts/`; preload Variable in `app/layout.tsx`; configure `JetBrains_Mono` from `next/font/google`
- [ ] Verify Task 2: 10 fonts present byte-identical; preload `<link>` in head; dev server boots without font errors

### T3: Logo SVGs + favicon
- [ ] Implement Task 3: Copy 2 logo SVGs to `public/logo/`; create `app/icon.svg`; add warning comment to all three
- [ ] Verify Task 3: All three SVGs exist with warning comment; favicon visible in browser

### T4: Token layer (globals.css rewrite)
- [ ] Implement Task 4: Rewrite `src/app/globals.css` with `@import "tailwindcss"` + 10 `@font-face` + `@theme` + `:root`
- [ ] Verify Task 4: Tailwind utilities resolve; CSS custom properties available; build succeeds

### T5: `<Icon>` component
- [ ] Implement Task 5: Author `src/components/ui/icon.tsx` with 28-path registry + typed `IconName`; type-test at `__tests__/icon.test-d.ts`
- [ ] Verify Task 5: All 28 icons render; `npm run test:type` exits 0

### T6: Primitives (Button, Card, Chip, Well, Banner)
- [ ] Implement Task 6: Author all 5 primitives + barrel `index.ts`
- [ ] Verify Task 6: All variants render; TypeScript rejects invalid variants and `style` overrides

### T7: Shell (Sidebar, Topbar)
- [ ] Implement Task 7: Author `Sidebar` (Client) + `Topbar` (Server) + barrel `index.ts`
- [ ] Verify Task 7: Sidebar shows 7 nav items + credits card + user card; Topbar shows search + actions + CTA; only Sidebar carries `'use client'`

### T8: `/design-system` preview route
- [ ] Implement Task 8: Author `src/app/(internal)/design-system/page.tsx` with 10 specimen sections + Banner
- [ ] Verify Task 8: Page renders all sections; build succeeds; matches bundle `preview/*.html` references

### T9: Smoke + parity + RSC-purity tests
- [ ] Implement Task 9: Author `token-parity.test.ts`, `rsc-purity.test.ts`, `page.test.tsx`
- [ ] Verify Task 9: All tests pass; manual evidence captured for LCP / CLS / bundle size

---

## Completion Summary

_Updated once T9 verifies and human reviewer signs off the End-to-End Verification gate._
