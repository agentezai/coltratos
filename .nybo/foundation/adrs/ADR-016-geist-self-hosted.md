# ADR-016 — Geist + JetBrains Mono: self-host Geist, Google-load mono

- **Status:** Accepted
- **Date:** 2026-04-28
- **Owner spec:** [design-system](../../../docs/design-system/spec/spec.md)

## Context

The COLTRATOS design bundle (vendored at [docs/design-system/source/](../../../docs/design-system/source/)) ships Geist as the display + UI typeface and JetBrains Mono for monospace contexts (process IDs like `LP-2024-0025`, file sizes, currency in dense tables). The bundle's chat transcript shows Geist was chosen after explicit comparison against Plus Jakarta Sans, Inter, Satoshi, and Manrope — its geometric, generous-aperture, modern-neutral character lands the "trustworthy + Colombian-startup" tone the eligibility-analysis SaaS needs.

The bundle includes 10 Geist `.ttf` files: one variable file (`Geist-VariableFont_wght.ttf`, weight axis 100–900) and 9 static weights (Thin → Black). JetBrains Mono is intentionally not vendored — the bundle relies on Google Fonts.

We need to decide how the production app (Next.js 16 App Router on Vercel) loads these fonts, weighing first-paint latency, offline development, bundle size, and dependency surface.

## Decision

1. **Self-host all 10 Geist files.** They live at `public/fonts/Geist-*.ttf`, served from the same origin as the app. Wired via 10 explicit `@font-face` blocks in `src/app/globals.css` matching the bundle's blocks at [project/colors_and_type.css:11-26](../../../docs/design-system/source/coltratos-design-system/project/colors_and_type.css#L11-L26).
2. **Preload Geist Variable.** `app/layout.tsx` carries `<link rel="preload" as="font" type="font/ttf" crossorigin href="/fonts/Geist-VariableFont_wght.ttf">` so the browser fetches it on the critical path.
3. **JetBrains Mono via `next/font/google`.** The Next.js Google Fonts integration handles the CDN round-trip + caching automatically. Configured in `app/layout.tsx` with `weight: ['400', '500']`, `display: 'swap'`, exposed as the CSS custom property `--font-mono`.
4. **No deferred self-host of JetBrains Mono in v1.** Reverse the decision in a future spec only when offline-mono becomes a real constraint.

## Alternatives Considered

- **`next/font/google` for both** — Adds a Google CDN dependency to the critical path; first-paint regresses by one extra DNS resolution + TLS handshake. Rejected.
- **`next/font/local` for Geist** — Functionally equivalent to manual `@font-face` for our case, but less flexible: `next/font/local` insists on its own subsetting + class-name strategy and doesn't compose cleanly with our Tailwind v4 `@theme`-based `--font-display` token. Manual `@font-face` is simpler.
- **Self-host JetBrains Mono** — Adds another set of `@font-face` blocks and ~100 kB to `public/fonts/` for negligible perceived benefit (mono is rarely the LCP element). Deferred, not rejected.
- **Inter or Plus Jakarta** — Considered and rejected during design (see bundle's chat transcript). Geist's tighter tracking and matching mono make it a stronger fit.

## Consequences

- **(+) Zero external requests for Geist.** First paint isolates the network behavior to our own origin. Vercel's edge network serves the `.ttf` files with appropriate cache headers.
- **(+) Variable file as progressive enhancement.** Modern browsers consume the variable file (one HTTP response covering all weights); older browsers fall back to the static weights via the `format("truetype")` fallback in the cascading `@font-face` blocks.
- **(+) Offline development works.** No network dependency for typography during local dev or in disconnected CI environments.
- **(−) `public/fonts/` adds ~600 kB.** Acceptable (a single static asset, gzip-compressed by Vercel), but worth measuring under NFR-01 once the system ships.
- **(−) Ten `@font-face` blocks** in `globals.css` duplicates the variable's declaration with each static weight. Mitigated by keeping the blocks consecutive at the top of the file; visual noise is minimal.
- **(−) Manual font updates.** When Geist publishes a new version, we must `cp` the new `.ttf` files into `public/fonts/`. Captured as a future curation note.
