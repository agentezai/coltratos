# design-system — Suggestions

Captured during `/nybo-run design-system` on 2026-04-28. None block; each is sized for a future spec, curation pass, or PR conversation.

---

## Quick Wins

### [S001] Replace the reverse-engineered logo with the authoritative SVG

**Effort:** 5 min once the design team supplies the file.
**Why:** Current asset is a hex-faceted approximation of the raster mocks (REQ-013 / RN-008). Three files carry the warning comment: `public/logo/coltratos-mark.svg`, `public/logo/coltratos-lockup.svg`, `app/icon.svg`.
**How:** Replace the three SVGs with the authoritative versions, drop the warning comments, and run `/nybo-plan edit design-system` to record the swap.

### [S002] Capture LCP / CLS / First Load JS on `/design-system`

**Effort:** 10 min on a developer machine with Chrome DevTools.
**Why:** NFR-01/02 set perf budgets (LCP < 1.5s, CLS < 0.05, First Load JS < 80 kB gz). These were not measured during this run; the build succeeds and the page is static, so all three should be comfortably within budget — but we should record numbers before any future spec touches the design system.
**How:** `npm run dev`, open `http://localhost:3000/design-system` in Chrome, record a cold-cache load in the Performance panel, save findings to `docs/design-system/evidence/perf.txt`. Also read the route table from `npm run build` for First Load JS.

### [S003] Run `npm run test:coverage` baseline

**Effort:** 5 min.
**Why:** Coverage script exists since project-bootstrap T5; design-system T9 didn't invoke it. Establishing a baseline now lets downstream FE specs see what they're inheriting (today: 0% — only smoke tests run; once `Button`, `Card`, etc. are exercised by feature tests, coverage climbs).

---

## Future Enhancements

### [S004] Add value-parity check to NFR-04

**Why:** The current token-parity test (`src/__tests__/token-parity.test.ts`) compares **token names** between the bundle's `colors_and_type.css` and `app/globals.css`. It does NOT compare **values** — a token could be renamed to the same name with a different hex on each side and the test would still pass. A v2 enhancement: parse the value of each token on both sides and assert string equality (with whitespace normalization). Would catch silent color drift.

### [S005] Switch `vite-tsconfig-paths` plugin to vite's native `resolve.tsconfigPaths: true`

**Why:** Vitest emits a deprecation warning each run: "Vite now supports tsconfig paths resolution natively via the resolve.tsconfigPaths option. You can remove the plugin and set resolve.tsconfigPaths: true in your Vite config instead." Tried during this run; the type stub for vite 5 hasn't caught up, so `// @ts-expect-error` was needed. Defer until vite types update.

### [S006] Self-host JetBrains Mono

**Why:** ADR-016 explicitly chose `next/font/google` and deferred self-hosting. Once the first downstream spec needs offline mono (or the Google Fonts CDN becomes a critical-path issue), copy the JetBrains Mono `.woff2` files to `public/fonts/` and add `@font-face` declarations matching Geist's pattern.

### [S007] Promote bundle-source size to a discoverable note

**Why:** `docs/design-system/source/` is 12 MB on disk (51 files). Some are large screen PNGs and font binaries. Future contributors may not realize the bundle is read-only history. Add a `docs/design-system/source/README.md` patch or a top-level `.gitattributes` LFS hint if size becomes a clone-time concern.

### [S008] Token-parity could include `@theme` block parity vs `:root`

**Why:** NFR-04's parity test compares the bundle's CSS to production's `:root`. The production `@theme` block is a separate layer (Tailwind utilities); a typo in `@theme` could produce a missing utility without failing the parity test. A v2 enhancement: parse both production blocks and assert each `:root` token has a matching `@theme` entry (with the `--color-*` prefix where applicable).

---

## Technical Debt

### [S009] Sidebar active-state should use `usePathname()`

**Why:** Currently Sidebar holds `active` in `useState` (initialized from prop). The first downstream FE spec that lands product routes (e.g., `dashboard-screen`) must replace this with `import { usePathname } from "next/navigation"` so the active item syncs with the URL. One-line edit; trivially safe. Captured in REQ-007's tradeoff table.

### [S010] Form primitives are deferred but appear in the preview page

**Why:** The `/design-system` preview page renders raw `<input>`, `<select>`, `<textarea>` elements with inline Tailwind classes (T8 section 7). When the first FE spec needs forms (likely `subir-pliego-screen`), it should add `Input`, `Select`, `Textarea` primitives to `src/components/ui/` and update the preview page to consume them. Today's inline pattern is acceptable for a specimen card.

### [S011] Skill candidates from project-bootstrap have not been materialized

**Why:** `nybo-curate` logged 3 skill candidates (`rebootstrap`, `ci-db-job`, `expected-failure-test`) but did not create the skill files (per the skill design — files are created via the `extract` mode). When the user runs `/nybo-curate extract`, these can be promoted into `.nybo/skills/`. Independent of design-system; carrying forward.

### [S012] `audit-known-issues.md` not yet authored

**Why:** Convention C5 ("CI audit gate is `npm audit --audit-level=high`; medium/low findings tracked in `docs/<feature>/evidence/audit-known-issues.md`") expects this file. project-bootstrap had 2 moderate findings; design-system added 1 more transitive (likely from `@testing-library/dom`). A first instance of `audit-known-issues.md` should be authored under `docs/project-bootstrap/evidence/` or as a top-level `docs/audit-known-issues.md`.

---

## Questions for the Human

### [Q001] Should `next/font/google` warm the JetBrains Mono cache at build time?

`next/font/google` downloads the font files at build time and serves them from the same origin. This shifts a runtime CDN call to a build-time CDN call. For Vercel deploys, the cache is shared; for fresh CI, the build re-downloads. Worth confirming if this is acceptable, or whether we should invest in self-hosting per [S006] now.

### [Q002] Are the 6 Lucide-shaped icons that the bundle's chat noted as "Heroicons-derived" already in our 28? Or are we missing some?

The bundle README mentioned that 2–3 glyphs (notably the stacked-database and handshake) came from Heroicons. The current 28-icon registry includes `database` (stacked-cylinder pattern). The handshake / users-handshake variant is not present (the registry uses `users` as the generic team icon). Confirm whether `Mi equipo` (Sidebar) should switch from `users` to a handshake glyph, and if so, whether to add it to the registry now or defer.

### [Q003] ✅ RESOLVED 2026-04-28 — `/design-system` route removed; Storybook is the new surface

User chose to migrate the audit surface to Storybook. The in-app route is deleted. See [deltas.md 2026-04-28](./deltas.md). Storybook runs on port 6006 (`npm run storybook`); the static export under `storybook-static/` can be deployed to Vercel previews or Chromatic in a future spec.

---

## Post-Storybook follow-ups (2026-04-28)

### [S013] Publish `storybook-static` to a hosted URL

**Why:** `npm run build-storybook` produces a static site. Today it's a CI artifact; would be more useful as a hosted preview that designers + reviewers can hit without checking out the repo. Cheapest path: a Vercel project pointed at `storybook-static/` (1 deploy hook). Alternative: Chromatic (free tier) gives visual-regression snapshots on every PR, which is a stronger gate than `play` functions.

### [S014] Re-enable a11y violation gating (currently `test: 'todo'`)

**Why:** `.storybook/preview.ts` configures `parameters.a11y.test = 'todo'` — Storybook's a11y addon shows violations in the test UI but doesn't fail CI. Once primitives are battle-tested by the first downstream FE spec, flip to `'error'` so a11y regressions block PRs.

### [S015] Migrate `docs/design-system/source/project/preview/*.html` references or remove them

**Why:** The bundle's `preview/*.html` files were the original visual-spec surface. They're still under `docs/design-system/source/` (read-only, vendored). With Storybook MDX docs covering the same ground, the `preview/*.html` files become redundant. Two options: (a) leave as bundle history; (b) collapse into a top-level "What changed from the bundle" note. Defer until the bundle's authoritative logo lands ([S001]) and we re-vendor anyway.

### [S016] Promote "audit surfaces in Storybook, not in app routes" as a project convention

**Why:** Captured in deltas.md "Impact on memory" — the rule generalizes beyond design-system. Any future internal UI (admin dashboards, observability widgets, debug panels) should default to Storybook unless production routing is structurally required. Add to `.nybo/foundation/conventions.yaml` next time `/nybo-curate` runs.

### [S017] Storybook 10 + Next.js 16 + Tailwind v4 setup recipe

**Why:** Captured as skill candidate. The combo is non-obvious (vitest workspaces, MDX patterns, `vite-tsconfig-paths` interaction, Playwright Chromium install for `@storybook/addon-vitest`). When a third project on this stack confirms the pattern, materialize as `.nybo/skills/storybook-setup.md` via `/nybo-curate extract`.
