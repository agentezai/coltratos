# T1: Vendor source bundle + write 3 ADRs

## Scope

- `docs/design-system/source/**` — verify the bundle was vendored verbatim during spec authoring (`/nybo-plan` step). The directory should already contain the 50 expected files.
- `.nybo/foundation/adrs/ADR-016-geist-self-hosted.md` — new file
- `.nybo/foundation/adrs/ADR-017-tailwind-v4-theme-tokens.md` — new file
- `.nybo/foundation/adrs/ADR-018-inline-icon-component.md` — new file

## Changes

### Bundle vendoring (verification only)

- Run `find docs/design-system/source -type f | wc -l`. It must print `51`.
- The bundle was unwrapped during `/nybo-plan` (contents of the archive's top-level `coltratos-design-system/` directory live directly under `docs/design-system/source/`).
- The bundle is read-only per RN-001. Never edit files under `docs/design-system/source/` — corrections happen in production locations.

### ADR-016 — Geist self-hosted

- Title: "Geist + JetBrains Mono — self-host Geist, Google-load mono"
- Status: Accepted
- Context: The bundle ships 10 Geist `.ttf` files (1 variable + 9 static weights Thin → Black). The bundle's chat transcript shows Geist was chosen over Inter, Plus Jakarta Sans, Satoshi, and Manrope after explicit comparison. Self-hosting eliminates the third-party CDN round-trip on first paint and survives offline development.
- Decision: Self-host all 10 Geist files at `public/fonts/`. Wire via 10 `@font-face` blocks in `src/app/globals.css`. Preload Geist Variable via `<link rel="preload">` in `app/layout.tsx`. Load JetBrains Mono via `next/font/google` (deferred from self-host until a downstream spec needs offline mono).
- Alternatives: (a) `next/font/google` for both — adds Google CDN dependency; rejected; (b) self-host both — costs more bytes for negligible benefit on mono; deferred.
- Consequences: (+) zero external font requests for Geist; (+) variable file ships as progressive enhancement; (−) `public/fonts/` adds ~600 kB; (−) one `@font-face` block per static weight (10 total).

### ADR-017 — Tailwind v4 `@theme` + CSS custom properties dual layer

- Title: "Tokens via Tailwind v4 `@theme` + `:root` CSS custom properties (dual layer)"
- Status: Accepted
- Context: Tailwind v4 reads tokens from a `@theme` block natively, generating utility classes (`bg-navy-900`, `text-graphite-700`). The bundle authors tokens as plain CSS custom properties at `:root`. We need both: components want Tailwind utilities (IntelliSense, class-name autocompletion); raw CSS files (Sidebar's complex backdrop, third-party widgets) want `var(--token)` access.
- Decision: Define every token twice in `src/app/globals.css` — once in `@theme` (Tailwind utility generation) and once at `:root` (CSS custom property). Names are identical (`--blue-600` in `:root`, `--color-blue-600` in `@theme`'s color scale). NFR-04's parity test enforces 1:1.
- Alternatives: (a) Pure `@theme` — third-party CSS can't read; (b) Pure `:root` — components write `style={{ background: 'var(--blue-600)' }}` everywhere, lose IntelliSense; (c) Inline JS theme object — locks us to runtime theming we don't need.
- Consequences: (+) Tailwind classes work everywhere; (+) raw CSS works everywhere; (−) tokens defined twice — parity test (NFR-04) is the safety net; (−) when adding a token, both sides must be updated (one-line each).

### ADR-018 — Inline SVG `<Icon>` registry

- Title: "Icons as an inline SVG path registry, no external icon library"
- Status: Accepted
- Context: The bundle's prototype uses an inline 28-path Lucide-shaped registry in `shell.jsx`. The icon set is small enough that an external library (`lucide-react`, ~10 kB gz; `react-icons`, larger) is unjustified overhead and obscures the registry.
- Decision: Author `src/components/ui/icon.tsx` as a single file with a string-keyed paths object and a typed `IconName` union derived from those keys. The 28 paths are copied byte-identical from the bundle. New icons are added by appending to the paths object and the union (REQ-011's type-test enforces the pair).
- Alternatives: (a) `lucide-react` — adds dep, hides registry, fights tree-shaking past 50 icons; (b) SVG sprite — needs build step, harder to type; (c) `next/dynamic` per icon — overengineered at 28 icons.
- Consequences: (+) zero icon dependencies; (+) `IconName` union typed automatically; (+) registry is greppable (`grep -A1 '"upload":' src/components/ui/icon.tsx`); (−) adding a new icon requires copying its path data manually (Lucide source as reference).

### Design Rationale (Single Source of Truth)

The three ADRs lock the **how** of the system: where tokens live, where fonts come from, where icons come from. Every downstream FE spec inherits these decisions; auditing a screen's compliance reduces to "does it import from `@/components/ui` and use Tailwind classes?". Without the ADRs, future contributors face fork temptation each time they need an icon or color.

## Dependencies

None — foundational task. Must run before T2 / T3 / T5 because the ADRs justify their decisions.

## Done When

- [ ] `find docs/design-system/source -type f | wc -l` prints `51`
- [ ] `.nybo/foundation/adrs/ADR-016-geist-self-hosted.md` exists with all 5 required sections
- [ ] `.nybo/foundation/adrs/ADR-017-tailwind-v4-theme-tokens.md` exists with all 5 required sections
- [ ] `.nybo/foundation/adrs/ADR-018-inline-icon-component.md` exists with all 5 required sections
- [ ] Each ADR header contains `Status: Accepted`
- [ ] No file under `docs/design-system/source/` has been edited (read-only)
