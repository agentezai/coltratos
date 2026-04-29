# ADR-018 — Icons as an inline SVG path registry, no external icon library

## Status
Accepted (2026-04-28)

**Owner spec:** [design-system](../../../docs/design-system/spec/spec.md)

## Context

The COLTRATOS design bundle's prototype (`shell.jsx`, lines 7–37) ships a single inline `Icon` component with 28 paths — Lucide-shaped at 1.75–2px stroke weight, round line caps and joins, `viewBox="0 0 24 24"`. The bundle's README explicitly notes the icon system is "Lucide-shaped" and identifies which 2–3 glyphs were sourced from Heroicons because Lucide lacks them at the right weight.

We need to decide how this set lands in production: as an inline registry, as a dependency on `lucide-react` (or `react-icons` umbrella), or as an SVG sprite generated at build time. The decision affects bundle size, type safety, audit-ability, and the friction of adding a 29th icon.

## Decision

**Author `src/components/ui/icon.tsx` as a single file** with:

1. A string-keyed `PATHS` object whose values are React fragments containing the SVG path / circle / rect / ellipse elements (copied byte-identical from the bundle).
2. A typed `IconName` union derived from `keyof typeof PATHS`.
3. An `Icon` component that takes `name: IconName`, optional `size: number`, optional `className: string`, and renders an `<svg>` with `viewBox="0 0 24 24"`, `stroke="currentColor"`, `strokeWidth={1.75}`, `strokeLinecap="round"`, `strokeLinejoin="round"`, `fill="none"`, `aria-hidden="true"`.

**Adding a new icon** is a single file edit: append one entry to `PATHS`. The `IconName` union updates automatically via `keyof typeof PATHS`. The type-test at `src/components/ui/__tests__/icon.test-d.ts` (REQ-011 in the design-system spec) asserts the union matches a documented `Expected` set; updating either side without the other fails the test.

**No external icon library.** `lucide-react`, `react-icons`, `@heroicons/react`, icon fonts, and SVG sprites are explicitly forbidden (encoded in RN-004 of the design-system spec). When a new icon path is needed, the developer copies it from Lucide's source (https://github.com/lucide-icons/lucide) or another freely-licensed source and pastes it into `PATHS`.

## Alternatives Considered

- **`lucide-react`.** ~10 kB gzip baseline + per-icon tree-shaken weight. Hides the registry behind an import — adding `<UploadCloud />` doesn't immediately reveal which paths are in use across the codebase. Fights tree-shaking past 50+ icons because most bundlers can't fully eliminate unused exports from a single barrel. Pinning a specific Lucide version becomes a dependency-management surface. Rejected — the bundle's prototype already inlines the registry; we keep that pattern.
- **`react-icons`.** Larger umbrella package (multiple icon families). Same drawbacks as `lucide-react` plus more. Rejected.
- **SVG sprite generated at build time** (e.g., `svg-sprite-loader`). Adds a build step. Each icon use becomes `<svg><use href="#upload"/></svg>` — workable but harder to type. Rejected — registry inline is simpler at this scale.
- **`next/dynamic` per icon.** Lazily imports each icon. Overengineered for 28 icons that ship at < 5 kB total in source. Rejected.

## Consequences

- **(+) Zero icon dependencies.** No version pin, no transitive vulnerability surface, no tree-shaking gamble.
- **(+) Typed `IconName` union.** Derived from `keyof typeof PATHS` — adding an icon to the registry updates the union automatically. The type-test asserts the union matches the documented set; renames are caught at compile time.
- **(+) Greppable registry.** `grep -A1 '"upload":' src/components/ui/icon.tsx` shows the icon's path. `grep -rn 'name="upload"' src/` shows every consumer.
- **(+) Server-Component-friendly.** No state, no event handlers, no `useEffect`. Composable inside any RSC tree without bundle-size cost.
- **(+) `aria-hidden="true"` by default.** Icons inside primitives that already carry text labels (per RN-007) don't pollute the accessibility tree.
- **(−) Manual path updates.** Adding a new icon means copying the path data from Lucide's source. Captured as a future skill (`add-icon.md`) once the workflow stabilizes.
- **(−) Single-file growth.** As the registry grows past ~80 icons, `icon.tsx` may need to be split (e.g., one file per category). Defer until the file exceeds 300 lines.
