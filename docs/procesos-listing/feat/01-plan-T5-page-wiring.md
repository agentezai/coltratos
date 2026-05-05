# T5: Page Wiring

## Scope

- `app/dashboard/procesos/page.tsx` — full rewrite: remove mock, wire stat cards, `ProcesosPageClient`
- `app/dashboard/procesos/_components/procesos-page-client.tsx` — new "use client" root; owns URL state, hook, preference logic, click logging, direct ID lookup
- `app/dashboard/procesos/_components/procesos-stat-cards.tsx` — new: 3 stat cards from `stats` object
- `app/dashboard/procesos/_components/directo-proceso-lookup.tsx` — new: ID lookup input + fallback

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
  const router       = useRouter()
  const searchParams = useSearchParams()

  // 1. Deserialize URL → filter state
  const [filters, setFilters] = useState<ProcesosFilterState>(() => {
    const fromUrl = deserializeFilters(searchParams)
    if (isDefaultState(fromUrl)) {
      const prefs = loadPreferences()
      if (prefs) return { ...DEFAULT_FILTER_STATE, ...prefs }
    }
    return fromUrl
  })

  // 2. Sync filter state → URL (replace, not push)
  useEffect(() => {
    const params = serializeFilters(filters)
    router.replace(`/dashboard/procesos?${params}`, { scroll: false })
  }, [filters])

  // 3. Fetch
  const query = useProcesosQuery(filters)

  // 4. Click logging
  const handleRowClick = useCallback((row: ProcesoListItem, position: number) => {
    // Fire-and-forget: POST to /api/search-events
    if (query.searchId) {
      fetch('/api/search-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_id:  query.searchId,
          id_proceso: row.id_proceso,
          position,
        }),
      }).catch(() => {})  // never throw; never block navigation
    }
  }, [query.searchId])

  // 5. Handlers
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
        hasVectorSearch={query.hasVectorSearch}
        onClearFilters={handleClear}
        onRowClick={handleRowClick}
        pagination={query.pagination}
        onPageChange={(page) => handleFiltersChange({ page })}
      />

      {query.error && (
        <div className="...">
          <p>Error al cargar procesos. {query.error}</p>
          <button onClick={() => setFilters((f) => ({ ...f }))}>Reintentar</button>
        </div>
      )}

      <DirectProcesoLookup />
    </div>
  )
}
```

### `DirectProcesoLookup`

```tsx
'use client'

export function DirectProcesoLookup() {
  const router  = useRouter()
  const [id, setId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLookup() {
    if (!id.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/procesos/${encodeURIComponent(id.trim())}`)
      if (res.ok) {
        router.push(`/dashboard/upload?procesoId=${encodeURIComponent(id.trim())}`)
      } else if (res.status === 404) {
        setError('Proceso no encontrado en SECOP')
      } else {
        setError('Error al buscar proceso')
      }
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="...">
      <p className="text-xs text-graphite-500">¿Tienes el ID del proceso? Búscalo directamente:</p>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="CO1.BDOS.XXXXXXX"
          value={id}
          onChange={(e) => setId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
        />
        <button onClick={handleLookup} disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
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

Three `StatCard` instances:

| Card | `label` | `value` | `icon` | `tint` |
|------|---------|---------|--------|--------|
| Procesos abiertos | "Procesos abiertos" | `stats.total_abiertos` | `"file-text"` | `"blue"` |
| Cierran esta semana | "Cierran esta semana" | `stats.cierran_esta_semana` | `"clock"` | `"amber"` |
| Cuantía disponible | "Cuantía disponible" | `formatCOP(stats.cuantia_total)` | `"coins"` | `"green"` |

When `isLoading=true` or `stats=null`: render cards with `value="—"` and a spinner overlay.

## Dependencies

Requires T2 (hook result incl. `searchId`, `hasVectorSearch`), T3 (table), T4 (filters).

## Done When

- [ ] `PROCESOS` mock not imported anywhere in the procesos route bundle
- [ ] Page mounts, URL empty → localStorage prefs applied if present; default state otherwise
- [ ] Filter change → URL updates without full navigation (`router.replace`)
- [ ] URL with `?departamento=Bolívar` on load → filters pre-applied, fetch fires with that filter
- [ ] `profile_match=true` in URL → toggle shown as active on load
- [ ] Stat cards show `stats` values from API; show "—" while loading
- [ ] Error state visible when hook returns `error`; retry triggers re-fetch
- [ ] Row click: `handleRowClick` called with row + position; POST to /api/search-events fires; navigation proceeds
- [ ] Direct Proceso ID lookup: enter ID → navigates to upload; 404 shows inline error
- [ ] `DirectProcesoLookup` uses `GET /api/procesos/[id]` (not the listing endpoint)
- [ ] `npm run build` no type errors; `npm run test` passes
- [ ] Dev tools: no requests to `datos.gov.co` from browser (except via direct lookup which may hit SODA server-side)
