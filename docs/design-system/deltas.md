# design-system — Deltas

Append-only log of post-ship adjustments. Each delta records the rationale and impact of a change applied after the spec's `/nybo-run` execution.

---

## Delta 2026-04-28 — edit | Storybook 10 supersedes the `/design-system` internal route

**Mode:** edit (post-implementation revision; design-system spec was `in-review` after a green /nybo-verify, before user requested the Storybook migration)
**Rationale:** User asked: *"For the design system, let's make a plan to use storybook. I don't want this running in an internal route of the main server."* The original REQ-008 / T8 surface — `app/(internal)/design-system/page.tsx` — coupled the design-system audit surface to the production Next.js bundle, which is a smell: every product user could in principle reach `/design-system`, and any change to the preview required rebuilding the whole app. Storybook decouples the audit surface from the runtime, gives us free interactive controls + a11y addon + visual-regression-ready static export, and integrates with the existing vitest test runner so play functions become CI-checked.
**Affected domains:** infrastructure (no product-domain impact). Tokens, primitives, shell, ADRs (016/017/018), bundle vendoring at `docs/design-system/source/` are unchanged.

### Tasks added

- **T10 — Install + scaffold Storybook 10.3.5 with `@storybook/nextjs-vite`.** Adds devDeps: `storybook`, `@storybook/nextjs-vite`, `@storybook/addon-{a11y,docs,vitest,onboarding}`, `@chromatic-com/storybook`, `vite ^8`, `playwright`, `@vitest/browser-playwright`, `eslint-plugin-storybook`. Configures `.storybook/{main.ts, preview.ts}` — preview imports `app/globals.css` so stories render against the same CSS as the running app.
- **T11 — Author 8 component stories + 4 token MDX docs.**
  - Component stories (alongside primitives): `Button.stories.tsx`, `Card.stories.tsx`, `Chip.stories.tsx`, `Well.stories.tsx`, `Banner.stories.tsx`, `Icon.stories.tsx`, `Sidebar.stories.tsx`, `Topbar.stories.tsx`. Each variant story carries a Storybook `play` function that asserts the rendered shape (REQ-012 surrogate; runs in headless Chromium via `@storybook/addon-vitest`).
  - Token MDX docs at `.storybook/docs/`: `Colors.mdx`, `Typography.mdx`, `Layout.mdx`, `Brand.mdx`. Cover navy/graphite/blue/green/amber/red ramps, type scale + families, spacing/radii/shadows/motion, logo + iconography.

### Tasks modified

- **T8 (preview route) — superseded.** Implementation deliverable becomes "Storybook scaffold" (T10) rather than `app/(internal)/design-system/page.tsx`. Spec REQ-008 description still records the original page sections so the cross-spec `preview/*.html` mapping isn't lost.
- **T9 (tests) — partially superseded.** `token-parity.test.ts` (NFR-04) and `rsc-purity.test.ts` (NFR-05) are unchanged. The third test, `design-system-page.test.tsx` (REQ-012), is replaced by:
  - **`src/__tests__/primitives-smoke.test.tsx`** — a thin unit test that imports each primitive directly and asserts `data-component` selectors + a11y attributes; runs in jsdom, no browser needed.
  - **Story `play` functions** — running in `vitest`'s third project (`storybook`) via `@storybook/addon-vitest` + headless Chromium. Each variant story can carry assertions; today's coverage hits ~52 stories.

### Tasks removed

- None (T1-T7 of design-system are unchanged; T8 is reworked rather than dropped).

### Spec sections modified

- **UC-02** (Use Cases table) — surface is now `npm run storybook` instead of `/design-system` route.
- **REQ-008** — original description preserved (the 10 sections list is still useful as the bundle-→-Storybook mapping reference); a footnote / cross-link points here.
- **REQ-012** — original smoke shape (page-level render assertion) replaced by stories + primitives-smoke. The 5 `data-component` selectors (`button`, `card`, `chip`, `well`, `banner`) are now asserted via the unit test.
- **Revision Log** — new row dated 2026-04-28 records the supersession.
- **NFR-02 (Bundle size)** — production app's First Load JS for `/design-system` no longer applies (the route is gone). The Storybook static export size (`storybook-static/`) is unbounded; we don't gate on it. New informal target: `npm run build-storybook` < 60s on a developer machine.

### Files added

- `.storybook/main.ts`, `.storybook/preview.ts`
- `.storybook/docs/{Colors,Typography,Layout,Brand}.mdx`
- `src/components/ui/{button,card,chip,well,banner,icon}.stories.tsx`
- `src/components/shell/{sidebar,topbar}.stories.tsx`
- `src/__tests__/primitives-smoke.test.tsx`
- `eslint-plugin-storybook` rules layered into `eslint.config.mjs`
- 11 new devDeps + transitives (~250 MB on disk)

### Files removed

- `app/(internal)/design-system/page.tsx`
- `app/(internal)/layout.tsx`
- `app/(internal)/` (empty group dir cleaned up)
- `src/__tests__/design-system-page.test.tsx`

### Files modified

- `app/layout.tsx` — no change (kept JetBrains_Mono import + Geist preload)
- `vitest.config.ts` — third project added: `storybook` (browser mode, headless Chromium, runs `*.stories.{ts,tsx}` via `@storybook/addon-vitest/vitest-plugin`)
- `.github/workflows/ci.yml` — `quality` job: install Playwright Chromium before tests, run `npm run build-storybook` after tests
- `package.json` — scripts `storybook` and `build-storybook`; 11 new devDeps
- `.gitignore` — added `*storybook.log` and `storybook-static`
- `eslint.config.mjs` — layered `eslint-plugin-storybook`'s flat-config recommended rules

### Impact on memory

- **Convention candidate (likely promote):** *"Audit surfaces for design systems live in Storybook, not in the production app's route tree."* — Add to `.nybo/foundation/conventions.yaml` next time `/nybo-curate` runs. The reasoning generalizes: any future "internal" UI (admin dashboards, observability widgets) should default to Storybook unless production routing is structurally required.
- **Skill candidate:** *Storybook 10 + Next.js 16 + Tailwind v4 setup recipe* — `.nybo/skills/storybook-setup.md` once the third project that uses this stack confirms the pattern.
- **Cross-spec coupling note:** `Sidebar` Client Component still uses `useState` for active route — Storybook stories work fine with this, but the eventual `dashboard-screen` spec will need to swap in `usePathname()` ([S009] in suggestions). Also the bundle's `preview/*.html` HTML files are still under `docs/design-system/source/project/preview/` as historical reference; they no longer have a runtime equivalent — Storybook's MDX docs replace them.

### Test count delta

- Before: 7 tests across 6 files (token-parity, rsc-purity, icon type-test, bootstrap × 2, design-system-page).
- After: **52 tests across 14 files** — same 4 unit tests + new `primitives-smoke` (6 tests) + ~40 Storybook stories with `play` functions running as headless-Chromium browser tests.

### Performance / install impact

- Initial `npx storybook init` install: ~1 minute (250 MB of devDeps + 200 MB Chromium download via `npx playwright install chromium`).
- Test runtime: 7s on developer machine (was 1.7s without Storybook). The 5–6× regression is acceptable; pre-Storybook tests stayed in the unit project at 2s, the 5s tail is the storybook-browser project booting Chromium + running play functions.
- CI implications: the `quality` job will add ~1 minute (Playwright install) + ~30s (build-storybook). Captured for re-eval after the first 5 CI runs.

### Follow-ups (non-blocking)

- Re-enable `--audit-level=high` gating once `npm audit` is run with the new Storybook devDeps (likely surfaces 2–3 new transitive moderates).
- Decide whether to publish the static `storybook-static/` to Vercel preview deploys (or Chromatic for visual regression). Out of v1 scope.
- Migrate the bundle's reference `preview/*.html` files into MDX or remove them (they're no longer the preview surface). Defer until next `/nybo-curate`.
