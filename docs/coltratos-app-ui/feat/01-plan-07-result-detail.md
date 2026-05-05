# T7: Resultado del análisis page

## Scope

| File | Change |
|------|--------|
| `app/dashboard/analisis/[id]/page.tsx` | New — hero card + tab navigation |
| `app/dashboard/analisis/[id]/_components/result-tabs.tsx` | New — `'use client'` tab + accordion state |

## Changes

### Page (`page.tsx`)

Server Component. Reads `params.id`, looks up `RESULT_DETAIL` mock (single object for this spec — real impl fetches by ID). Renders:

**Back button**: `<Link href="/dashboard/analisis">← Volver a mis análisis</Link>`.

**Page header row**: title "Resultado del análisis" + ID/proceso/entidad meta + Exportar PDF / Compartir / Nuevo análisis buttons.

**Hero card** (`result-hero` layout: `grid-cols-[auto_1fr_auto_auto]`):
- Left: 72px circle icon (color by semáforo: green ✓ / amber △ / red ✗)
- Center: state title + description + % pill
- Right-1: Resumen summary table (cumple/con obs/no cumple/total rows)
- Right-2: Recommendation panel (title + text + amber alert box + "Ver recomendaciones" button)

**`<ResultTabs result={RESULT_DETAIL}/>`** — client child.

**Sidebar** (right column, ~1/3 width):
- Información del proceso card (proceso, entidad, objeto, cierre, modalidad, presupuesto)
- Archivos card (PDF badge row)
- Proceso de análisis card (completed timestamp)

### `ResultTabs` (`'use client'`)

State: `tab: "resumen" | "juridico" | "financiero" | "tecnico" | "experiencia"`, `openAccordion: number | null`.

**Tab bar**: 5 tabs with icons (Target, ShieldCheck, DollarSign, Settings, BarChart3).

**Tab content** (shared for all tabs — design shows same accordion list):

Each req row (`req-accordion`):
- Header: ChevronDown (rotates when open) | title + subtitle | SemPill | observation count
- Body (when open): reasoning text based on `req.status`

The mock `reqs` array drives all tabs; for this spec, all tabs show the same list (real impl will filter by categoria).

## Design Rationale

Hero card and sidebar are static RSC. Only the tab switching + accordion expansion require client state, isolated in `ResultTabs`.

The two-column layout (`grid-cols-[minmax(0,2fr)_minmax(0,1fr)]`) matches the design's `two-col` class.

## Dependencies

T2 (SemPill, Card), T6 (route structure: `analisis/[id]` lives inside `analisis/`).

## Done When

- [ ] `/dashboard/analisis/ANA-2026-00048` renders hero card with "conditional" semáforo (amber)
- [ ] Hero card shows 70% pill and correct summary counts (16/3/1/20)
- [ ] Tab bar renders 5 tabs; clicking switches content
- [ ] Accordion row click toggles body text; ChevronDown rotates
- [ ] Sidebar shows proceso info correctly (LP-2024-00123, Alcaldía de Medellín, etc.)
- [ ] Back button navigates to `/dashboard/analisis`
- [ ] `npm run build` no type errors
