# T3: Table Redesign

## Scope

- `app/dashboard/procesos/_components/procesos-table.tsx` — full rewrite; remove `MockProceso` dependency
- `app/dashboard/procesos/_components/proceso-row.tsx` — new: per-row component with badges + click handler

## Changes

### `ProcesosTable` props

```ts
interface ProcesosTableProps {
  rows:      ProcesoListItem[]
  isLoading: boolean   // skeleton rows
  isPaging:  boolean   // overlay spinner
  isEmpty:   boolean
  hasFilters: boolean
  onClearFilters: () => void
  pagination: { page: number; total_pages: number } | null
  onPageChange: (page: number) => void
}
```

### Column layout

| Column | Data source | Notes |
|--------|-------------|-------|
| Sem indicator | `last_sem` if `has_analisis=true`; grey dot otherwise | `SemPill` component or neutral dot |
| Proceso | `nombre` (line-clamp-1) + `id_proceso` (mono xs) | |
| Entidad | `entidad` | |
| Modalidad | `modalidad` | |
| Cuantía | `cuantia` formatted as COP; `cuantia_disponible=false` → "—" | `formatCOP(cuantia)` helper |
| Cierre | `fecha_cierre` formatted as "DD MMM YYYY"; null → "—" | `formatDate(fecha_cierre)` helper |
| Badges | "Pliego" chip if `has_pliego`; "Analizado" chip if `has_analisis` | |
| Actions | Upload icon always; chevron-right | Upload navigates to upload page |

### Loading states

**Skeleton (isLoading):** render 10 `<tr>` with `<td>` containing `<div className="h-4 bg-graphite-100 rounded animate-pulse" />`. Skeleton rows have no interactive behavior.

**Paging overlay (isPaging):** render existing rows but wrap table in relative container with `<div className="absolute inset-0 bg-white/60 flex items-center justify-center">` containing a spinner.

### Empty states

```tsx
if (isEmpty && hasFilters) return (
  <div className="...">
    <p>Sin procesos con estos filtros.</p>
    <button onClick={onClearFilters}>Limpiar filtros</button>
  </div>
)
if (isEmpty && !hasFilters) return (
  <div className="...">
    <p>Aún no hay procesos sincronizados.</p>
    <p className="text-xs text-graphite-400">El sistema sincroniza datos cada 30 minutos.</p>
  </div>
)
```

### `ProcesoRow` click handler

```ts
function handleRowClick(p: ProcesoListItem) {
  if (p.has_analisis && p.last_analisis_id) {
    router.push(`/dashboard/analisis/${p.last_analisis_id}`)
  } else {
    router.push(`/dashboard/upload?procesoId=${encodeURIComponent(p.id_proceso)}`)
  }
}
```

Upload button (`onClick` with `stopPropagation`) always navigates to upload page regardless of analisis state.

### Helpers

```ts
// src/lib/procesos/format.ts
export function formatCOP(value: number | null): string
// null | 0 → "—"; else "$ 8.750.000.000"

export function formatDate(iso: string | null): string
// null → "—"; else format as "DD MMM YYYY" in es-CO locale
```

### Pagination controls

Simple prev/next buttons below table. Show "Página X de Y". Disabled when on first/last page. Clicking next/prev calls `onPageChange(page ± 1)`.

## Dependencies

Requires T2 (`ProcesoListItem`, `useProcesosQuery` result types).

## Done When

- [ ] No `MockProceso` import in file or its imports
- [ ] Skeleton renders 10 rows during `isLoading`
- [ ] Overlay visible during `isPaging`; existing rows still rendered underneath
- [ ] Sem indicator: `SemPill` for analyzed rows; grey dot for unanalyzed
- [ ] Badges: "Pliego" chip present only when `has_pliego=true`
- [ ] Row click with analisis → analisis route; without → upload route
- [ ] Upload button does not trigger row click navigation
- [ ] Empty state A shown with "Limpiar filtros" when `isEmpty && hasFilters`
- [ ] Empty state B shown without CTA when `isEmpty && !hasFilters`
- [ ] Cuantía null/0 → "—"; valid number → COP formatted
- [ ] `npm run build` no type errors; `npm run test` passes
