# T5: Page Wiring

## Scope

- `app/dashboard/procesos/page.tsx` — full rewrite: remove mock, wire stat cards, `ProcesosPageClient`
- `app/dashboard/procesos/_components/procesos-page-client.tsx` — new "use client" root; owns URL state, hook, preference logic
- `app/dashboard/procesos/_components/procesos-stat-cards.tsx` — new: 3 stat cards from `stats` object

## Changes

### `app/dashboard/procesos/page.tsx`

```tsx
// Server component — no data fetching; mounts client root
export default function ProcesosPage() {
  return <ProcesosPageClient />
}
```

No mock import. No `PROCESOS` constant.

### `ProcesosPageClient`

```tsx
'use client'

export function ProcesosPageClient() {
  const router  = useRouter()
  const searchParams = useSearchParams()

  // 1. Deserialize URL → filter state
  const [filters, setFilters] = useState<ProcesosFilterState>(() => {
    const fromUrl = deserializeFilters(searchParams)
    // If URL has no meaningful params, try localStorage defaults
    if (isDefaultState(fromUrl)) {
      const prefs = loadPreferences()
      if (prefs) return { ...DEFAULT_FILTER_STATE, ...prefs }
    }
    return fromUrl
  })

  // 2. Sync filter state → URL (replace, not push, to avoid polluting history with every keystroke)
  useEffect(() => {
    const params = serializeFilters(filters)
    router.replace(`/dashboard/procesos?${params}`, { scroll: false })
  }, [filters])

  // 3. Fetch
  const query = useProcesosQuery(filters)

  // 4. Handlers
  const handleFiltersChange = (patch: Partial<ProcesosFilterState>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }))
  const handleClear = () => setFilters(DEFAULT_FILTER_STATE)
  const handleRestorePrefs = () => {
    const prefs = loadPreferences()
    if (prefs) setFilters({ ...DEFAULT_FILTER_STATE, ...prefs })
  }
  const hasPreferences = loadPreferences() !== null

  return (
    <div>
      <PageHeader title="Procesos" subtitle="Oportunidades de contratación pública de SECOP II." />

      <ProcesoStatCards stats={query.stats} isLoading={query.isLoading} />

      <ProcesosFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClear={handleClear}
        onRestorePrefs={handleRestorePrefs}
        hasPreferences={hasPreferences}
      />

      <ProcesosTable
        rows={query.data}
        isLoading={query.isLoading}
        isPaging={query.isPaging}
        isEmpty={query.isEmpty}
        hasFilters={query.hasFilters}
        onClearFilters={handleClear}
        pagination={query.pagination}
        onPageChange={(page) => handleFiltersChange({ page })}
      />

      {query.error && (
        <div className="...">
          <p>Error al cargar procesos. {query.error}</p>
          <button onClick={() => setFilters((f) => ({ ...f }))}>Reintentar</button>
        </div>
      )}
    </div>
  )
}
```

### `ProcesoStatCards`

```ts
interface ProcesoStatCardsProps {
  stats:     ProcesosStats | null
  isLoading: boolean
}
```

Three `StatCard` instances (existing component):

| Card | `label` | `value` | `icon` | `tint` |
|------|---------|---------|--------|--------|
| Procesos abiertos | "Procesos abiertos" | `stats.total_abiertos` | `"file-text"` | `"blue"` |
| Cierran esta semana | "Cierran esta semana" | `stats.cierran_esta_semana` | `"clock"` | `"amber"` |
| Cuantía disponible | "Cuantía disponible" | `formatCOP(stats.cuantia_total)` | `"coins"` | `"green"` |

When `isLoading=true` or `stats=null`: render cards with `value="—"` and a spinner overlay.

## Dependencies

Requires T2 (hook result), T3 (table), T4 (filters).

## Done When

- [ ] `PROCESOS` mock not imported anywhere in the procesos route bundle
- [ ] Page mounts, URL empty → localStorage prefs applied if present; default state otherwise
- [ ] Filter change → URL updates without full navigation (`router.replace`)
- [ ] URL with `?departamento=Bolívar` on load → filters pre-applied, fetch fires with that filter
- [ ] Stat cards show `stats` values from API; show "—" while loading
- [ ] Error state visible when hook returns `error`; retry triggers re-fetch
- [ ] `npm run build` no type errors; `npm run test` passes
- [ ] Dev tools: no requests to `datos.gov.co` from browser
