# T4: Token layer — rewrite `src/app/globals.css`

## Scope

- `src/app/globals.css` — full rewrite. Owned by this task going forward.

## Changes

### File structure (in this exact order)

1. **Tailwind import** at the very top:
   ```css
   @import "tailwindcss";
   ```

2. **`@font-face` block** — copy verbatim from [docs/design-system/source/project/colors_and_type.css:11-26](../source/project/colors_and_type.css#L11-L26), adjusting the `url()` paths from the bundle's relative paths to the production paths (`fonts/Geist-*.ttf` → `/fonts/Geist-*.ttf`):
   - Variable: `font-weight: 100 900`, `format("truetype-variations")`
   - Static weights ×9: Thin 100 → Black 900, `format("truetype")`
   - All declarations use `font-display: swap`
   - JetBrains Mono is NOT declared here — it comes from `next/font/google` (T2)

3. **`@theme` block** (Tailwind v4 native theme tokens):
   ```css
   @theme {
     /* Brand · Navy */
     --color-navy-50: #e8ecf3;
     --color-navy-500: #3a5590;
     --color-navy-600: #2a4075;
     --color-navy-700: #1a2f5c;
     --color-navy-800: #102448;
     --color-navy-900: #0b1a3a;
     --color-navy-950: #060f24;

     /* Brand · Graphite */
     --color-graphite-50: #f8fafc;
     --color-graphite-100: #f1f5f9;
     --color-graphite-200: #e2e8f0;
     --color-graphite-300: #cbd5e1;
     --color-graphite-400: #94a3b8;
     --color-graphite-500: #64748b;
     --color-graphite-600: #475569;
     --color-graphite-700: #334155;
     --color-graphite-800: #1e293b;
     --color-graphite-900: #0f172a;

     /* Accent · Royal Blue */
     --color-blue-50:  #eff6ff;
     --color-blue-100: #dbeafe;
     --color-blue-200: #bfdbfe;
     --color-blue-400: #60a5fa;
     --color-blue-500: #3b82f6;
     --color-blue-600: #2563eb;
     --color-blue-700: #1d4ed8;
     --color-blue-800: #1e40af;

     /* Brand · Green / Semáforo */
     --color-green-50:  #ecfdf5;
     --color-green-100: #d1fae5;
     --color-green-200: #a7f3d0;
     --color-green-400: #34d399;
     --color-green-500: #22c55e;
     --color-green-600: #16a34a;
     --color-green-700: #15803d;

     /* Semáforo · Amber */
     --color-amber-50:  #fffbeb;
     --color-amber-100: #fef3c7;
     --color-amber-200: #fde68a;
     --color-amber-400: #fbbf24;
     --color-amber-500: #f59e0b;
     --color-amber-600: #d97706;
     --color-amber-700: #b45309;

     /* Semáforo · Red */
     --color-red-50:  #fef2f2;
     --color-red-100: #fee2e2;
     --color-red-200: #fecaca;
     --color-red-400: #f87171;
     --color-red-500: #ef4444;
     --color-red-600: #dc2626;
     --color-red-700: #b91c1c;

     /* Tints (for icon wells) */
     --color-tint-blue:   #e7eeff;
     --color-tint-green:  #e4f7ec;
     --color-tint-amber:  #fff2d6;
     --color-tint-red:    #fde6e6;
     --color-tint-violet: #ece9fe;
     --color-tint-sky:    #e0f2fe;

     /* Type families */
     --font-display: "Geist", ui-sans-serif, system-ui, -apple-system, sans-serif;
     --font-sans:    "Geist", ui-sans-serif, system-ui, -apple-system, sans-serif;
     --font-mono:    "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;

     /* Radii */
     --radius-xs: 4px;
     --radius-sm: 6px;
     --radius-md: 8px;
     --radius-lg: 12px;
     --radius-xl: 16px;
     --radius-2xl: 20px;

     /* Shadows */
     --shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04);
     --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.05);
     --shadow-md: 0 4px 10px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.04);
     --shadow-lg: 0 12px 28px -8px rgba(15, 23, 42, 0.12), 0 4px 10px -2px rgba(15, 23, 42, 0.05);
     --shadow-xl: 0 24px 48px -12px rgba(15, 23, 42, 0.18);
   }
   ```

4. **`:root` block** — every token from [project/colors_and_type.css:30-199](../source/project/colors_and_type.css#L30-L199) reproduced 1:1. Names match the bundle byte-for-byte. This block also includes tokens that don't fit the `@theme` model (semantic fg/border tokens, layout vars, motion vars, focus shadows). See RN-003 for the canonical list.

5. **Body / typography defaults** — copy `body` and base typography rules from [project/colors_and_type.css:298-305](../source/project/colors_and_type.css#L298-L305):
   ```css
   body {
     background: var(--surface-canvas);
     color: var(--fg-1);
     font-family: var(--font-sans);
     font-size: var(--fs-body);
     -webkit-font-smoothing: antialiased;
     -moz-osx-font-smoothing: grayscale;
   }
   ```

### What NOT to copy

- Do NOT copy the `.coltratos-typo`, `.coltratos-app`, or `.h1`/`.h2`/`.h3` etc. utility classes from the bundle. Those are bundle-style helpers; in production we use Tailwind utilities.
- Do NOT copy `app.css` rules for `.btn`, `.card`, `.chip`, `.well`, etc. Those become React components in T6 — Tailwind utilities inside the component, not class hooks in CSS.

### Design Rationale (ADR-017, RN-002, RN-003)

- The `@theme` block makes Tailwind utilities work (`bg-navy-900`, `text-graphite-700`, `font-display`).
- The `:root` block makes CSS custom properties work for raw CSS / third-party / `style={{ var(--token) }}` cases.
- Token names match the bundle byte-for-byte (RN-003) — NFR-04's parity test enforces this.

## Dependencies

Requires T2 — `app/layout.tsx` must wire `--font-mono` from `next/font/google` before this file references it. Strictly speaking T4 only references `--font-mono`; the wiring at runtime depends on T2.

## Done When

- [ ] `src/app/globals.css` exists with `@import "tailwindcss"` on line 1
- [ ] 10 `@font-face` blocks present, all pointing to `/fonts/Geist-*.ttf`
- [ ] `@theme` block contains all colors / fonts / radii / shadows from REQ-004 (subset above)
- [ ] `:root` block contains every token name from [project/colors_and_type.css:30-199](../source/project/colors_and_type.css#L30-L199) — verified by NFR-04's parity test (T9)
- [ ] `body` rule applied
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run build` succeeds (Tailwind v4 picks up `@theme`)
- [ ] In a hand-written test page (`app/_test/page.tsx`, deleted after verification), `<div className="bg-navy-900 text-white p-6 rounded-lg shadow-sm font-display">Hello</div>` renders with the expected colors / radius / shadow
