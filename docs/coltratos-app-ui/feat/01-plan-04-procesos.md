# T4: Procesos page

## Scope

| File | Change |
|------|--------|
| `app/dashboard/procesos/page.tsx` | New — stat cards + filter bar + table |
| `app/dashboard/procesos/_components/procesos-table.tsx` | New — `'use client'` table with search/filter state |

## Changes

### Page (`page.tsx`)

Server Component. Computes counts from `PROCESOS` mock. Renders:
1. `<PageHeader title="Procesos" subtitle="..." actions={[Ver análisis, Nuevo proceso]}/>`
2. 4 x `<StatCard>`: Total (slate), Elegibles (green), Con observaciones (amber), No elegibles (red)
3. `<ProcesosTable procesos={PROCESOS}/>`

### `ProcesosTable` (`'use client'`)

Local state: `q: string`, `filterSem: string`, `filterModalidad: string`, `filterCierre: string`.

**Filter bar** (grid layout `2fr 1fr 1fr 1fr auto`):
- Search input with magnifier icon
- Semáforo `<select>`
- Modalidad `<select>` (Licitación pública, Selección abreviada, Mínima cuantía, Concurso de méritos)
- Cierre `<select>` (Todos, Esta semana, Este mes)
- "Limpiar" button

**Table columns**: Semáforo | Proceso (nombre bold + ID mono) | Entidad | Modalidad | Pliegos (badge) | Presupuesto | Cierre | Upload icon | Chevron right.

Row click: `router.push(`/dashboard/analisis/${p.analisisId}`)`.

Upload icon click (stop propagation): `router.push(`/dashboard/upload?procesoId=${p.id}`)`.

**Presupuesto** format: already formatted in mock data as `$2.450.000.000 COP`.

## Design Rationale

Filter state lives in a child Client Component (`ProcesosTable`) to keep the parent a Server Component. This matches the RSC pattern used across the app.

## Dependencies

T1 (Sidebar route active), T2 (StatCard, SemPill, PageHeader, mock data).

## Done When

- [ ] `/dashboard/procesos` renders with 4 stat counts accurate to mock data
- [ ] Search filters table by nombre, ID, entidad
- [ ] Semáforo filter narrows to matching rows
- [ ] Row click navigates to the linked analisis result
- [ ] Upload icon click navigates to upload with pre-selected procesoId
- [ ] `npm run build` no type errors
