# T2: Fetch Hook

## Scope

- `src/hooks/use-procesos-query.ts` — `useProcesosQuery` hook: fetch, loading states, error, pagination, match_score awareness, search_id tracking

## Changes

### `useProcesosQuery`

```ts
interface UseProcesosQueryResult {
  data:        ProcesoListItem[]     // includes match_score per row
  stats:       ProcesosStats | null
  pagination:  { page: number; page_size: number; total: number; total_pages: number } | null
  searchId:    string | null         // last successful search UUID (from search_log; passed to click events)
  isLoading:   boolean    // true on first fetch and filter changes (show skeleton)
  isPaging:    boolean    // true only on pagination change (show overlay, not skeleton)
  hasVectorSearch: boolean  // true when q is non-empty (match_score visible)
  error:       string | null
  isEmpty:     boolean    // data.length === 0
  hasFilters:  boolean    // any non-default filter active (for empty state differentiation)
}

export function useProcesosQuery(filters: ProcesosFilterState): UseProcesosQueryResult
```

**Fetch behavior:**
- On `filters` change: set `isLoading = true`, clear `error`, fetch with `filtersToApiParams(filters)`
- On pagination-only change (`page` changes, other fields same): set `isPaging = true` (not `isLoading`)
- On success: set `data`, `stats`, `pagination`, clear loading flags; set `hasVectorSearch = !!filters.q`
- On non-200: set `error = await res.text()`, clear loading flags
- On network error: set `error = 'Error de red'`
- `hasFilters = true` when any filter differs from `DEFAULT_FILTER_STATE` (excluding `page`, `page_size`, `sort`)

**searchId tracking:**

The API response does not include `searchId` directly. Instead, the frontend generates a UUID before each request and sends it as a custom header `X-Search-Id`. The search_log INSERT in the API reads this header and uses it as the `search_log.id`. After a successful fetch, the hook stores this ID so `ProcesoRow` can include it in click events.

```ts
const searchIdRef = useRef<string>(crypto.randomUUID())

// Before fetch:
const searchId = crypto.randomUUID()
searchIdRef.current = searchId

// In fetch call:
headers: { 'X-Search-Id': searchId }

// After success:
setSearchId(searchId)
```

**Detecting pagination-only change:**
```ts
const prevFiltersRef = useRef(filters)
const isPaginationOnly = filters.page !== prevFiltersRef.current.page
  && JSON.stringify({ ...filters, page: 1 }) === JSON.stringify({ ...prevFiltersRef.current, page: 1 })
```

**Abort controller:** cancel in-flight requests on filter change to prevent stale results.

```ts
useEffect(() => {
  const controller = new AbortController()
  fetchProcesos(filters, searchId, controller.signal).then(...)
  return () => controller.abort()
}, [filters])
```

## Dependencies

Requires T1 (`ProcesosFilterState`, `filtersToApiParams`, `DEFAULT_FILTER_STATE`).

## Done When

- [ ] `isLoading=true` during first fetch and on filter change
- [ ] `isPaging=true` during page-only change; `isLoading=false`
- [ ] `error` set on non-200 response; `data` empty
- [ ] In-flight request aborted when filters change (no stale result rendered)
- [ ] `hasFilters=false` with default state; `true` when any non-pagination field changed
- [ ] `hasVectorSearch=true` when `q` non-empty; `false` otherwise
- [ ] `searchId` updated on each successful fetch
- [ ] `X-Search-Id` header included in each fetch request
- [ ] `npm run test` passes (vitest, mocked fetch)
