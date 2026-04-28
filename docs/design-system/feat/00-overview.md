# design-system - Overview

## Spec Reference

[spec.md](../spec/spec.md) · [use-cases.md](../spec/use-cases.md)

## Problem + Solution

- **Problem.** The codebase has approved backend specs (domain-model, pdf-ingestion, requisitos-extraction, semaforo-aggregation, project-bootstrap) but no FE foundation. Building 9 product screens (Dashboard → Configuración) without a shared visual language guarantees drift, redundant components, and tokens defined in multiple places.
- **Solution.** Translate the user's Claude Design bundle (vendored under [docs/design-system/source/](../source/)) into a thin foundation: tokens in `src/app/globals.css`, self-hosted Geist + JetBrains Mono, COLTRATOS logo SVGs, a typed `<Icon>` registry, 5 primitives (Button, Card, Chip, Well, Banner), and the navy app shell (Sidebar, Topbar). Every downstream FE spec composes this layer.
- **Approach.** Tailwind v4 `@theme` + CSS custom properties dual layer (ADR-017). Inline SVG icon registry, no external icon dep (ADR-018). Self-hosted Geist all 9 weights (ADR-016). Server Components by default; Sidebar is the only Client Component in v1.
- **Output.** 4 ADR / spec edits, 50 vendored bundle files, 10 font files in `public/`, 3 SVG files in `public/`+`app/`, 1 globals.css rewrite, 6 component files + 2 barrels in `src/components/`, 1 preview page at `/design-system`, 4 test files. After ship: any future FE spec lands without inventing tokens or primitives.

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Bundle["docs/design-system/source/ (read-only)"]
        SrcCss["colors_and_type.css"]
        SrcFonts["fonts/Geist-*.ttf"]
        SrcLogo["assets/logo/*.svg"]
        SrcShell["ui_kits/.../shell.jsx"]
        SrcPrev["preview/*.html"]
    end

    subgraph Production["Production code"]
        Globals["src/app/globals.css<br/>@font-face + @theme + :root"]
        PubFonts[("public/fonts/Geist-*.ttf")]
        PubLogo[("public/logo/*.svg<br/>app/icon.svg")]
        Icon["src/components/ui/icon.tsx<br/>28-path registry"]
        Prims["src/components/ui/<br/>Button · Card · Chip · Well · Banner"]
        Shell["src/components/shell/<br/>Sidebar · Topbar"]
        PrevRoute["src/app/(internal)/design-system/page.tsx"]
        Tests["src/__tests__/<br/>token-parity · rsc-purity"]
    end

    subgraph ADRs[".nybo/foundation/adrs/"]
        A16["ADR-016 Geist self-hosted"]
        A17["ADR-017 Tailwind @theme + :root"]
        A18["ADR-018 Inline Icon registry"]
    end

    SrcCss -->|verbatim parity| Globals
    SrcFonts -->|verbatim copy| PubFonts
    SrcLogo -->|verbatim copy + warning comment| PubLogo
    SrcShell -->|translate to TSX| Icon
    SrcShell -->|translate to TSX| Shell
    SrcPrev -->|translate to TSX| PrevRoute

    Globals --> PrevRoute
    Icon --> Prims
    Icon --> Shell
    Prims --> PrevRoute
    Shell --> PrevRoute

    A16 -.justifies.-> PubFonts
    A17 -.justifies.-> Globals
    A18 -.justifies.-> Icon

    style Globals fill:#e1f5ff
    style Icon fill:#e1f5ff
    style Prims fill:#e1f5ff
    style Shell fill:#e1f5ff
```

## Data Model

This spec adds **no domain entities and no database tables**. The "data" is asset / config / component code.

**Key TypeScript contracts (immutable once shipped):**

```mermaid
classDiagram
    class IconProps {
      +name: IconName
      +size?: number
      +className?: string
    }
    class ButtonProps {
      +variant: 'primary'|'secondary'|'ghost'|'success'
      +size: 'sm'|'md'|'lg'
      +leadingIcon?: IconName
      +trailingIcon?: IconName
      +disabled?: boolean
    }
    class ChipProps {
      +variant: 'green'|'amber'|'red'|'blue'|'violet'|'gray'
      +dot?: boolean
    }
    class WellProps {
      +tint: 'blue'|'green'|'amber'|'red'|'violet'|'sky'
    }
    class BannerProps {
      +variant: 'info'
      +icon?: IconName
    }
    class CardProps {
      +className?: string
    }
    ButtonProps --> IconProps : leadingIcon
    WellProps --> IconProps : child
    BannerProps --> IconProps : icon
```

## Task Index

| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| T1 | [01-plan-01-vendor-and-adrs.md](./01-plan-01-vendor-and-adrs.md) | Vendor source bundle (already done) + verify file count + write 3 ADRs (016 / 017 / 018) | None |
| T2 | [01-plan-02-self-host-fonts.md](./01-plan-02-self-host-fonts.md) | Copy 10 Geist `.ttf` files to `public/fonts/`; preload Variable in `app/layout.tsx`; load JetBrains Mono via `next/font/google` | T1 |
| T3 | [01-plan-03-logo-and-favicon.md](./01-plan-03-logo-and-favicon.md) | Copy 2 logo SVGs to `public/logo/`; create `app/icon.svg` favicon; add warning comment per REQ-013 | T1 |
| T4 | [01-plan-04-token-layer.md](./01-plan-04-token-layer.md) | Rewrite `src/app/globals.css` with `@import "tailwindcss"`, 10 `@font-face` blocks, Tailwind v4 `@theme` block, `:root` mirror block | T2 |
| T5 | [01-plan-05-icon-component.md](./01-plan-05-icon-component.md) | Author `src/components/ui/icon.tsx` with 28-path registry + typed `IconName` union; type-test at `__tests__/icon.test-d.ts` | T1 |
| T6 | [01-plan-06-primitives.md](./01-plan-06-primitives.md) | Author Button, Card+CardHead+CardBody, Chip, Well, Banner under `src/components/ui/`; barrel at `index.ts` | T4, T5 |
| T7 | [01-plan-07-shell.md](./01-plan-07-shell.md) | Author `Sidebar` (Client) and `Topbar` (Server) under `src/components/shell/`; barrel at `index.ts` | T4, T5, T6 |
| T8 | [01-plan-08-preview-route.md](./01-plan-08-preview-route.md) | Author `src/app/(internal)/design-system/page.tsx` rendering 10 specimen cards translated from `preview/*.html` | T6, T7 |
| T9 | [01-plan-09-smoke-and-parity-tests.md](./01-plan-09-smoke-and-parity-tests.md) | Token-parity test, RSC-purity grep test, preview-page smoke test | T8 |

## Dependency Graph

```mermaid
flowchart LR
    T1["T1: Vendor + ADRs"]
    T2["T2: Self-host fonts"]
    T3["T3: Logo + favicon"]
    T4["T4: Token layer"]
    T5["T5: Icon component"]
    T6["T6: Primitives"]
    T7["T7: Shell"]
    T8["T8: Preview route"]
    T9["T9: Smoke + parity tests"]

    T1 --> T2
    T1 --> T3
    T1 --> T5
    T2 --> T4
    T4 --> T6
    T5 --> T6
    T4 --> T7
    T5 --> T7
    T6 --> T7
    T6 --> T8
    T7 --> T8
    T8 --> T9

    style T1 fill:#d4edda
    style T2 fill:#d4edda
    style T3 fill:#d4edda
    style T4 fill:#d4edda
    style T5 fill:#d4edda
    style T6 fill:#d4edda
    style T7 fill:#d4edda
    style T8 fill:#d4edda
    style T9 fill:#d4edda
```

**External dependency:** [project-bootstrap](../../project-bootstrap/spec/spec.md) MUST ship before any task here runs. It provides the `package.json`, `tsconfig.json`, Tailwind v4 wiring, `app/`, and `src/` that every task assumes.
