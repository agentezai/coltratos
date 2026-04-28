# Verification Plan

## T1: Vendor source bundle + write 3 ADRs

### Test Scenarios
- `find docs/design-system/source -type f | wc -l` prints `51`.
- All three ADR files exist under `.nybo/foundation/adrs/` with required sections (Status: Accepted, Context, Decision, Alternatives Considered, Consequences).
- No bundle file under `docs/design-system/source/` has been edited (`git status` shows them all unchanged after creation).

### Gate Criteria
Bundle vendored verbatim + 3 ADRs authored. Reviewer reads each ADR and confirms the rationale matches the spec's tradeoffs table.

---

## T2: Self-host Geist; load JetBrains Mono via next/font/google

### Test Scenarios
- `ls public/fonts/Geist-*.ttf | wc -l` prints `10`.
- Each `.ttf` is byte-identical to the bundle source (per-file `diff -q`).
- `app/layout.tsx` contains the preload `<link>` and the `JetBrains_Mono` import.
- `npm run dev` boots; DevTools Network tab shows Geist Variable served from `/fonts/`.
- Visiting any page renders text in Geist (verifiable by inspecting computed `font-family` of `<body>`).

### Gate Criteria
Geist self-hosted + preloaded; JetBrains Mono available via `var(--font-mono)`. No external font requests for Geist.

---

## T3: Logo SVGs + favicon

### Test Scenarios
- `public/logo/coltratos-mark.svg`, `public/logo/coltratos-lockup.svg`, `app/icon.svg` all exist.
- Each carries the warning comment (REQ-013).
- `npm run dev` serves all three with HTTP 200.
- Browser tab favicon is the green C-mark.

### Gate Criteria
Three SVG files in place with provenance trace. Favicon visible in browser.

---

## T4: Token layer (globals.css rewrite)

### Test Scenarios
- `src/app/globals.css` starts with `@import "tailwindcss";`.
- 10 `@font-face` declarations present.
- `@theme` block contains all colors / fonts / radii / shadows from REQ-004.
- `:root` block contains every token name from the bundle (parity test in T9 is the executable form).
- A throwaway test page `<div className="bg-navy-900 text-white p-6 rounded-lg shadow-sm font-display">` renders correctly.
- `npm run build` succeeds — Tailwind v4 picks up `@theme`.

### Gate Criteria
Tokens defined once, exposed two ways (Tailwind utilities + CSS custom properties), zero parity drift.

---

## T5: `<Icon>` component

### Test Scenarios
- `src/components/ui/icon.tsx` exists with all 28 path entries.
- `IconName` is `keyof typeof PATHS`.
- `npm run test:type` exits 0 (REQ-011's `expectTypeOf` assertion passes).
- A throwaway test renders `<Icon name="upload" />` — produces an `<svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">` with the expected paths.
- Adding a 29th key without updating the `Expected` union in `icon.test-d.ts` fails the type-test (manually verify once during T5; revert).

### Gate Criteria
Icon component is the single source of truth for icons. Typed name union enforced at compile time.

---

## T6: Primitives (Button, Card, Chip, Well, Banner)

### Test Scenarios
- All five files exist with the typed prop shapes from REQ-006.
- `src/components/ui/index.ts` re-exports all five plus Icon.
- Each primitive carries `data-component="<name>"` on its root element.
- TypeScript fails when an invalid variant is passed (`<Button variant="purple">`).
- TypeScript fails when `style` is passed to `Button` (RN-005).
- A throwaway page composing all five primitives renders without errors.
- `npm run typecheck && npm run lint` exit 0.

### Gate Criteria
Primitives layout-agnostic, variants typed, no escape hatches into raw token values.

---

## T7: Shell (Sidebar, Topbar)

### Test Scenarios
- `src/components/shell/sidebar.tsx` exists with `'use client'` on line 1.
- `src/components/shell/topbar.tsx` exists WITHOUT `'use client'`.
- Sidebar renders 7 nav items in the documented order with badges 147 + 3.
- Sidebar credits card shows `23 / 50` + 46% bar.
- Sidebar user card shows `María Rodríguez`.
- Topbar shows search input + 2 icon buttons + primary "Subir pliego" CTA.
- `grep -rn "'use client'" src/components/` reports exactly 1 line.

### Gate Criteria
Shell renders pixel-close to bundle's `app.css` reference. RSC purity preserved.

---

## T8: `/design-system` preview route

### Test Scenarios
- `npm run dev` and visit `http://localhost:3000/design-system`.
- All 10 sections render in the documented order.
- All 4 Button variants × 3 sizes visible.
- All 6 Chip variants visible.
- All 6 Well tints visible.
- All 28 icons visible in the iconography grid.
- `<Banner>` renders near the top.
- `npm run build` produces a static route entry for `(internal)/design-system`.

### Gate Criteria
Reviewer can audit every token + primitive on one page. Page matches `preview/*.html` references visually.

---

## T9: Smoke + parity + RSC-purity tests

### Test Scenarios
- `npm run test` includes `token-parity.test.ts` + `rsc-purity.test.ts` + `page.test.tsx` and all pass.
- `npm run test:type` includes `icon.test-d.ts` and passes.
- Renaming a token in `globals.css` only (not the bundle) fails the parity test (verify once, revert).
- Adding `'use client'` to a primitive file fails the RSC-purity test (verify once, revert).
- Manual evidence captured for NFR-01 (LCP < 1.5s, CLS < 0.05) and NFR-02 (First Load JS < 80 kB gz). Saved under `docs/design-system/feat/evidence/`.

### Gate Criteria
All automated invariants protected by tests. Performance gates met manually.

---

## End-to-End Verification

**Final acceptance test** — performed by a human reviewer after T9 completes:

1. Run `npm install && npm run typecheck && npm run lint && npm run build && npm run test && npm run test:type`. Every command exits 0.
2. Run `npm run dev`. Visit `http://localhost:3000/design-system`.
3. Verify the page renders 10 sections (color ramps, type scale, spacing/radii/shadow, buttons & chips, forms, KPI, logo, iconography) plus a Banner near the top.
4. Open DevTools Performance, record a cold reload of `/design-system`. Confirm LCP < 1.5s and CLS < 0.05.
5. Open `view-source:` on the page. Confirm the COLTRATOS wordmark is rendered as text (not an image).
6. Open `view-source:` on `/icon.svg`. Confirm the warning comment appears.
7. Inspect a Button. Confirm the focus ring (`var(--shadow-focus)`) appears on Tab key focus.
8. Run `grep -rn "'use client'" src/`. Confirm only `src/components/shell/sidebar.tsx:1` matches.
9. Open `src/app/globals.css`. Confirm `@import "tailwindcss"` is line 1, the `@font-face` block follows, the `@theme` block follows, the `:root` block follows.
10. Run `find docs/design-system/source -type f | wc -l`. Confirm `51`.

**Gate Criteria:** All 10 steps complete without errors. Reviewer confirms the page visually matches the bundle's `preview/*.html` references. Spec status flips from `approved` → `shipped` after this gate passes.
