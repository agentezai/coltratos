# T2: Self-host Geist; load JetBrains Mono via next/font/google

## Scope

- `public/fonts/Geist-VariableFont_wght.ttf` — copied from bundle
- `public/fonts/Geist-Thin.ttf` — copied from bundle
- `public/fonts/Geist-ExtraLight.ttf` — copied from bundle
- `public/fonts/Geist-Light.ttf` — copied from bundle
- `public/fonts/Geist-Regular.ttf` — copied from bundle
- `public/fonts/Geist-Medium.ttf` — copied from bundle
- `public/fonts/Geist-SemiBold.ttf` — copied from bundle
- `public/fonts/Geist-Bold.ttf` — copied from bundle
- `public/fonts/Geist-ExtraBold.ttf` — copied from bundle
- `public/fonts/Geist-Black.ttf` — copied from bundle
- `app/layout.tsx` — add Geist preload `<link>`; configure JetBrains Mono via `next/font/google` and expose its variable as `--font-mono`

## Changes

### Copy fonts to public

- `cp docs/design-system/source/project/fonts/Geist-*.ttf public/fonts/`
- Verify all 10 files copied: `ls public/fonts/Geist-*.ttf | wc -l` prints `10`.
- Each file is a byte-identical copy of the bundle file. No optimization or subsetting in v1 (deferred until LCP measurements show a need).

### `app/layout.tsx`

- The `RootLayout` component is created by `project-bootstrap` T2 with a placeholder. T2 here augments it.
- Inside `<head>`: add `<link rel="preload" as="font" type="font/ttf" crossorigin href="/fonts/Geist-VariableFont_wght.ttf" />`. The `crossorigin` attribute is required for self-hosted fonts even on same-origin (browser quirk).
- Import `import { JetBrains_Mono } from 'next/font/google'` and configure: `const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });`.
- On `<html>` add `className={jetbrainsMono.variable}` so `--font-mono` is available globally. The Geist `--font-display` and `--font-sans` come from `globals.css` (T4).
- Inside `<body>` apply the base typography class via `font-sans` (Tailwind utility resolves to `var(--font-sans)`).

### Verification stub (will move to T9)

- Add a temporary `console.log("[design-system] Geist preload wired")` inside the layout if helpful for local debugging. Remove before T9 ships.

### Design Rationale (ADR-016)

- Self-hosted Geist eliminates the third-party CDN round-trip on first paint. Variable file is preloaded because the preview route uses multiple weights — the Variable file serves all weights from one HTTP response.
- JetBrains Mono is loaded via `next/font/google` because the marginal cost of CDN access for monospace (rarely the LCP element) does not justify another 10 `@font-face` blocks. Reverse the decision in a future spec if offline-mono is required.

## Dependencies

Requires T1 — ADR-016 must be in place before fonts are wired (the ADR is the canonical justification for the self-host decision).

## Done When

- [ ] `ls public/fonts/Geist-*.ttf | wc -l` prints `10`
- [ ] Each `public/fonts/Geist-*.ttf` is byte-identical to its bundle source: `for f in public/fonts/Geist-*.ttf; do diff -q "$f" "docs/design-system/source/project/fonts/$(basename "$f")"; done` prints nothing
- [ ] `app/layout.tsx` contains a `<link rel="preload" ... href="/fonts/Geist-VariableFont_wght.ttf" />` element
- [ ] `app/layout.tsx` imports `JetBrains_Mono` from `next/font/google` with `variable: '--font-mono'`
- [ ] `<html>` element carries the `--font-mono` variable className
- [ ] `npm run typecheck` exits 0
- [ ] `npm run dev` starts without font-related errors; DevTools Network tab shows Geist Variable loading from `/fonts/`
