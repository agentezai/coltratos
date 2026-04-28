# T8: Preview route at `/design-system`

## Scope

- `src/app/(internal)/design-system/page.tsx` — new route. Server Component.
- `src/app/(internal)/layout.tsx` — minimal layout (the `(internal)` group is shared by future internal-only routes)

## Changes

### Why a route group `(internal)`

`(internal)` is a Next.js 16 App Router route group: it does not affect the URL but lets us share a layout for internal/dev-only routes (design system, future status dashboards). The path stays `/design-system`.

### `src/app/(internal)/layout.tsx`

```tsx
import type { ReactNode } from 'react';
export default function InternalLayout({ children }: { children: ReactNode }) {
  return <main className="bg-[var(--surface-canvas)] min-h-screen">{children}</main>;
}
```

### `src/app/(internal)/design-system/page.tsx`

Server Component renders 10 specimen cards in this order. Each card mirrors the layout of the corresponding `preview/*.html` file from the bundle (REQ-008).

```tsx
import { Card, CardHead, CardBody, Button, Chip, Well, Banner, Icon, type IconName } from '@/components/ui';

export default function DesignSystemPage() {
  return (
    <div className="max-w-[1280px] mx-auto p-8 flex flex-col gap-6">
      <header>
        <h1 className="text-[30px] font-bold tracking-[-0.02em] font-display">Design system</h1>
        <p className="text-[var(--fg-3)] text-sm mt-1">
          Tokens, primitives, and shell components consumed by every COLTRATOS screen.
        </p>
      </header>

      <SectionAnchorColors />     {/* preview/color-anchor.html */}
      <SectionPrimaryAndGreen />  {/* preview/color-primary.html */}
      <SectionSemaforo />         {/* preview/color-semaforo.html */}
      <SectionTypeScale />        {/* preview/type-scale.html */}
      <SectionSpacingRadiiShadow /> {/* preview/spacing-radii-shadow.html */}
      <SectionButtonsAndChips />  {/* preview/components-buttons-chips.html */}
      <SectionForms />            {/* preview/components-forms.html */}
      <SectionKpi />              {/* preview/components-kpi.html */}
      <SectionLogo />             {/* preview/brand-logo.html */}
      <SectionIconography />      {/* preview/brand-iconography.html */}
    </div>
  );
}
```

Each `Section*` is a small inline component (or co-located file under `src/app/(internal)/design-system/sections/`) that renders a `<Card>`:

- `SectionAnchorColors` — two ramps: navy 950→500 and graphite 50→900. Each swatch is a `bg-navy-900 w-16 h-16 rounded-md` block with the token name + hex below.
- `SectionPrimaryAndGreen` — blue 50→800 ramp + green 50→700 ramp.
- `SectionSemaforo` — three large circles (`Well` analog) green/amber/red 500 with labels Elegible / Observaciones / No elegible.
- `SectionTypeScale` — Display XL / Display LG / H1 / H2 / H3 / Body / Sm / Xs lines using the bundle's exact font sizes.
- `SectionSpacingRadiiShadow` — three rows: spacing tokens as horizontal bars 4→80px; radii as squares; shadow specimens with token names.
- `SectionButtonsAndChips` — grid of all 4 Button variants × 3 sizes; all 6 Chip variants; one Well example per tint.
- `SectionForms` — text input, select-style input, textarea — using the inline classes from T6's primitives or raw Tailwind (since input primitives are deferred).
- `SectionKpi` — one `Card` with a `Well` + display number + sub-label + delta `Chip`. Layout per `preview/components-kpi.html`.
- `SectionLogo` — two panels: white background showing `<img src="/logo/coltratos-lockup.svg">`, and navy background showing the same.
- `SectionIconography` — grid of all 28 registered icons with their names labeled; below, a row of 6 `Well` instances with a representative icon in each tint.

### Banner usage

Add one `<Banner variant="info" icon="shield">Tu archivo se analiza de forma privada y segura. No compartimos tu información con terceros.</Banner>` near the top of the page (above the first section) to verify the Banner primitive renders.

### Design Rationale (REQ-008, US-02)

- One page surfaces every token + primitive — the audit-at-one-URL story (UC-02).
- Sections mirror the bundle's `preview/*.html` files 1:1 so a reviewer can compare side-by-side.
- The route is grouped `(internal)` so it's discoverable but doesn't pollute marketing routes.
- Server Component because the page has no interactivity in v1.

## Dependencies

Requires T6 (primitives) and T7 (shell — used to render Sidebar/Topbar in Section examples? — no, this page does not use Sidebar/Topbar. T7 is technically not a hard dep for T8; included in dep graph because the dep graph shows the natural composition order). Actually requires only T6 strictly.

## Done When

- [ ] `src/app/(internal)/design-system/page.tsx` exists
- [ ] `src/app/(internal)/layout.tsx` exists
- [ ] All 10 Section components render without errors
- [ ] One `<Banner>` renders on the page
- [ ] All 4 Button variants × 3 sizes render in the buttons section
- [ ] All 6 Chip variants render in the chips section
- [ ] All 6 Well tints render in the iconography section
- [ ] All 28 icons render in the icon grid (visual confirmation)
- [ ] `npm run dev` and visit `/design-system` — page loads, no console errors
- [ ] `npm run build` succeeds; the route appears in build output as static
- [ ] `npm run typecheck` exits 0
