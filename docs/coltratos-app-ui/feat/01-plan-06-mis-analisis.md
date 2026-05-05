# T6: Mis Análisis page

## Scope

| File | Change |
|------|--------|
| `app/dashboard/analisis/page.tsx` | New — stat cards + filter toolbar + análisis table + pagination |
| `app/dashboard/analisis/_components/analisis-table.tsx` | New — `'use client'` filterable table |

## Changes

### Page (`page.tsx`)

Server Component. Renders:

1. `<PageHeader>` with "Mis análisis" + "Exportar" + "Nuevo análisis" buttons.
2. 5-column stat grid: Total análisis (blue) / Elegibles (green, 58%) / Con observaciones (amber, 31%) / No elegibles (red, 11%) / Tiempo promedio (purple, "48 seg").
3. `<AnalisisTable analisis={ANALISIS}/>`.

### `AnalisisTable` (`'use client'`)

State: `q`, `filterEstado`, `filterSem`, `filterEntidad`, `filterFecha`, `page`.

**Toolbar** (horizontal flex):
- Search input
- Estado `<select>`
- Semáforo `<select>`
- Entidad `<select>`
- Rango de fechas `<select>`
- Filtros button (stub)

**Table columns**: ID Análisis (mono) | Proceso/Objeto (proceso mono bold + objeto secondary) | Entidad | Fecha ↓ | Semáforo | Resultado% (mono bold) | Requisitos (3 colored dots) | Acciones (Ver análisis + ···).

**Requisitos dots**: 3 inline colored dots (green/amber/red) + count numbers (`ok`, `warn`, `fail`).

**Row click**: `router.push(`/dashboard/analisis/${a.id}`)`.

**"Ver análisis" button**: same navigation (stop propagation).

**Pagination**: `<Pagination total={48} page={page} perPage={8}/>`. Mock shows 8 rows, total 48.

## Design Rationale

Same RSC-with-client-child pattern as Procesos. Parent does data fetch (mock import), child owns filter/page state.

## Dependencies

T1 (nav), T2 (StatCard, SemPill, DataTable, Pagination, mock data).

## Done When

- [ ] `/dashboard/analisis` renders 5 stat cards with correct values
- [ ] Table renders all 8 mock análisis rows
- [ ] SemPill renders correct color per row
- [ ] Requisito dots show 3 colored dots with counts
- [ ] Search filters table
- [ ] Row click navigates to detail page
- [ ] Pagination renders with correct total/page display
- [ ] `npm run build` no type errors
