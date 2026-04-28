# ADR-017 — Tokens via Tailwind v4 `@theme` + `:root` CSS custom properties (dual layer)

- **Status:** Accepted
- **Date:** 2026-04-28
- **Owner spec:** [design-system](../../../docs/design-system/spec/spec.md)

## Context

The design bundle defines tokens as plain CSS custom properties in [`colors_and_type.css`](../../../docs/design-system/source/coltratos-design-system/project/colors_and_type.css) (lines 30–199): colors, surfaces, fg / border tokens, shadows, radii, spacing, type families / scale / line-heights / font-weights, motion, layout. Components in the bundle's HTML/JSX prototype consume these via `var(--token)`.

Our production stack adopts Tailwind CSS v4 (per [project-bootstrap](../../../docs/project-bootstrap/spec/spec.md)). Tailwind v4 reads tokens from a `@theme` block in CSS and generates utility classes (`bg-navy-900`, `text-graphite-700`, `font-display`, `rounded-lg`, `shadow-sm`) — a major shift from v3's JavaScript config. Components written in Tailwind v4 strongly prefer utility classes for IntelliSense, class-name autocompletion, and the consistency that comes from utility-only authoring.

But Tailwind utilities cover only what `@theme` exposes. Raw CSS files (rare but unavoidable: backdrop blurs, third-party widgets, modal layers, `@keyframes`) and components that need `style={{ background: 'var(--token)' }}` (rare, but legitimate for dynamic colors) need `var()` access.

We need a single source of truth for tokens that satisfies both consumption modes without tempting drift.

## Decision

**Define every token twice in `src/app/globals.css`** — once in a Tailwind v4 `@theme` block (utility generation), once at `:root` (CSS custom property). Token names are identical (`--blue-600` in `:root`; `--color-blue-600` in `@theme`'s color scale, where Tailwind v4 mandates the `--color-*` prefix to namespace color tokens).

**Naming convention:**

- `@theme` block: Tailwind v4 conventional prefixes — `--color-*` (colors), `--font-*` (fonts), `--radius-*` (radii), `--shadow-*` (shadows), `--spacing-*` (spacing — only if we extend Tailwind's default spacing scale; we don't in v1 since the bundle's scale matches Tailwind's defaults closely).
- `:root` block: bundle-original names — `--navy-900`, `--graphite-100`, `--blue-600`, `--green-500`, `--tint-blue`, `--surface-canvas`, `--fg-1`, `--shadow-sm`, `--radius-lg`, `--space-4`, `--font-display`, `--fs-h1`, `--fw-bold`, `--ease-out`, `--dur-base`, `--app-sidebar-w`, etc. Names match [colors_and_type.css:30-199](../../../docs/design-system/source/coltratos-design-system/project/colors_and_type.css#L30-L199) byte-for-byte.

**Parity is enforced** by the test at `src/__tests__/token-parity.test.ts` (NFR-04 in the design-system spec). The test reads both files, extracts the `--*-NNN:` token names from the bundle's `colors_and_type.css` lines 30–199 and from the production `:root` block, and asserts the two sets are equal.

## Alternatives Considered

- **Pure `@theme` (no `:root` block).** Components write Tailwind utilities exclusively; raw CSS files cannot read tokens. Loses the ability to use `var()` in `@keyframes`, modal layers, or third-party CSS. Rejected — too restrictive.
- **Pure `:root` (no `@theme`).** Components write `style={{ background: 'var(--blue-600)' }}` everywhere or attach class hooks like `bg-blue-600` defined in component CSS. Loses Tailwind's IntelliSense, autocompletion, and the visual auditability of utility-only authoring. Rejected — UX regression.
- **Single source via build step.** A custom PostCSS plugin or Tailwind plugin generates `:root` from `@theme` (or vice versa). Adds build complexity for marginal benefit; the parity test is simpler. Rejected.
- **Tailwind v3 + `tailwind.config.js`.** Tokens live in JS. Loses the v4 ergonomics (`@theme` is part of the CSS, no JS round-trip). Rejected — we adopt v4 elsewhere.

## Consequences

- **(+) Tailwind utilities work everywhere.** `bg-navy-900`, `text-graphite-700`, `font-display`, `shadow-sm`, `rounded-lg` resolve to the bundle's exact values. Component authoring stays utility-first.
- **(+) Raw CSS works everywhere.** Sidebar's complex `inset 2px 0 0 var(--blue-500)` shadow, modal backdrop layers, and `@keyframes` can use `var()` access.
- **(+) Single source of truth, two views.** When a token's value changes, both definitions update in one file (`globals.css`) — no cross-file drift.
- **(−) Tokens defined twice.** Adding a new token requires two edits (one in `@theme`, one in `:root`). The parity test (NFR-04) catches name drift but not value drift; a v2 enhancement could add value-parity (parse hex literals on both sides).
- **(−) Naming convergence cost.** The `@theme` block requires Tailwind's `--color-*` prefix; the `:root` block uses the bundle's original names (`--blue-600`). Slight cognitive overhead until the convention is internalized.
