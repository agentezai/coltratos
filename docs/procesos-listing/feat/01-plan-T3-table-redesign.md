# T3: Table Redesign

## Scope

- `app/dashboard/procesos/_components/procesos-table.tsx` — full rewrite; remove `MockProceso` dependency
- `app/dashboard/procesos/_components/proceso-row.tsx` — new: per-row component with badges, match_score chip, click handler

## Changes

### `ProcesosTable` props

```ts
interface ProcesosTableProps {
  rows:            ProcesoListItem[]
  isLoading:       boolean   // skeleton rows
  isPaging:        boolean   // overlay spinner
  isEmpty:         boolean
  hasFilters:      boolean
  hasVectorSearch: boolean   // when true: show match_score column
  onClearFilters:  () => void
  onRowClick:      (row: ProcesoListItem, position: number) => void
  pagination:      { page: number; total_pages: number } | null
  onPageChange:    (page: number) => void
}
```

### Column layout

| Column | Data source | Visible when |
|--------|-------------|--------------|
| Sem indicator | `last_sem` if `has_analisis=true`; grey dot otherwise | always |
| Proceso | `nombre` (line-clamp-1) + `id_proceso` (mono xs) | always |
| Entidad | `entidad` | always |
| Modalidad | `modalidad` | always |
| Cuantía | `cuantia` formatted as COP; `cuantia_disponible=false` → "—" | always |
| Cierre | `fecha_cierre` formatted as "DD MMM YYYY"; null → "—" | always |
| Badges | "Pliego" chip if `has_pliego`; "Analizado" chip if `has_analisis` | always |
| Match | `match_score` as "87% relevante"; rounded to integer | `hasVectorSearch=true` |
| Actions | Upload icon; chevron-right | always |

### Match score chip

```tsx
{hasVectorSearch && row.match_score !== null && (
  <span className="chip chip-match">
    {Math.round(row.match_score * 100)}% relevante
  </span>
)}
```

Show only when `hasVectorSearch=true` AND `match_score` is a non-null number. When `q` is cleared: column header disappears; no chip rendered.

### Loading states

**Skeleton (`isLoading`):** render 10 `<tr>` with `<td>` containing `<div className="h-4 bg-graphite-100 rounded animate-pulse" />`.

**Paging overlay (`isPaging`):** render existing rows wrapped in relative container with `<div className="absolute inset-0 bg-white/60 flex items-center justify-center">` containing a spinner.

### Empty states

```tsx
if (isEmpty && hasFilters) return (
  <div>
    <p>Sin procesos con estos filtros.</p>
    <button onClick={onClearFilters}>Limpiar filtros</button>
  </div>
)
if (isEmpty && !hasFilters) return (
  <div>
    <p>Aún no hay procesos sincronizados.</p>
    <p className="text-xs text-graphite-400">El sistema sincroniza datos cada 6 horas.</p>
  </div>
)
```

### `ProcesoRow` click handler

```ts
function handleRowClick(p: ProcesoListItem, position: number) {
  onRowClick(p, position)   // fires click logging in parent
  if (p.has_analisis && p.last_analisis_id) {
    router.push(`/dashboard/analisis/${p.last_analisis_id}`)
  } else {
    router.push(`/dashboard/upload?procesoId=${encodeURIComponent(p.id_proceso)}`)
  }
}
```

Upload button (`onClick` with `stopPropagation`) always navigates to upload page regardless of analisis state.

### Helpers (`src/lib/procesos/format.ts`)

```ts
export function formatCOP(value: number | null): string
// null | 0 → "—"; else "$ 8.750.000.000"

export function formatDate(iso: string | null): string
// null → "—"; else format as "DD MMM YYYY" in es-CO locale
```

### Pagination controls

Simple prev/next buttons below table. Show "Página X de Y". Disabled when on first/last page. Clicking next/prev calls `onPageChange(page ± 1)`.

## Dependencies

Requires T2 (`ProcesoListItem` incl. `match_score`, `useProcesosQuery` result types including `hasVectorSearch`).

## Done When

- [ ] No `MockProceso` import in file or its imports
- [ ] Skeleton renders 10 rows during `isLoading`
- [ ] Overlay visible during `isPaging`; existing rows still rendered underneath
- [ ] Sem indicator: `SemPill` for analyzed rows; grey dot for unanalyzed
- [ ] Badges: "Pliego" chip present only when `has_pliego=true`
- [ ] Match column: visible and shows `match_score * 100` percentage only when `hasVectorSearch=true`
- [ ] Match column: hidden when `hasVectorSearch=false`
- [ ] Row click calls `onRowClick(row, position)` then navigates
- [ ] Row click with analisis → analisis route; without → upload route with procesoId
- [ ] Upload button does not trigger row click navigation
- [ ] Empty state A shown with "Limpiar filtros" when `isEmpty && hasFilters`
- [ ] Empty state B shows "6 horas" sync cadence message when `isEmpty && !hasFilters`
- [ ] Cuantía null/0 → "—"; valid number → COP formatted
- [ ] `npm run build` no type errors; `npm run test` passes
