# Verification Plan: procesos-listing

## T1: Types + Filter State

### Test Scenarios
- `serializeFilters` → `deserializeFilters` round-trip for all field types
- Empty arrays not serialized to URL params
- Multi-value arrays serialized as comma-separated strings
- `deserializeFilters` with empty URLSearchParams returns `DEFAULT_FILTER_STATE`
- `loadPreferences` returns `null` on malformed JSON without throwing
- `savePreferences` writes parseable JSON to localStorage

### Gate Criteria
Round-trip correctness; no empty array params; null on corrupt storage.

---

## T2: Fetch Hook

### Test Scenarios
- `isLoading=true` during fetch; `false` after
- `isPaging=true` on page-change only; `isLoading=false`
- `error` set on non-200; data remains empty
- In-flight request aborted when filters change before response arrives
- `hasFilters=false` with default state; `true` when departamento set
- `data` and `stats` populated correctly from mock response

### Gate Criteria
Loading state differentiation correct; abort prevents stale render; hasFilters logic verified.

---

## T3: Table Redesign

### Test Scenarios
- Skeleton: 10 skeleton rows visible when `isLoading=true`
- Overlay: existing rows visible + overlay when `isPaging=true`
- Sem indicator: `SemPill` rendered when `has_analisis=true`; grey dot when false
- "Pliego" badge: present when `has_pliego=true`, absent when false
- Row click with `has_analisis=true` navigates to `/dashboard/analisis/${id}`
- Row click without analisis navigates to `/dashboard/upload?procesoId=X`
- Upload button click does not trigger row navigation
- Empty state A shown when `isEmpty=true && hasFilters=true`
- Empty state B shown when `isEmpty=true && hasFilters=false`
- `formatCOP(null)` → "—"; `formatCOP(8750000000)` → "$ 8.750.000.000"
- `MockProceso` not imported in the component tree

### Gate Criteria
All badge, nav, and empty state scenarios pass; no mock import.

---

## T4: Filter Bar

### Test Scenarios
- Departamento chip toggle: select/deselect updates `filters.departamento`
- Every filter change includes `page: 1` in the patch
- Modalidad: selecting two options → both in filters
- "Limpiar filtros" calls `onClear`
- "Restaurar preferencias" visible when `hasPreferences=true`, hidden when false
- `q` input value reflects `filters.q`

### Gate Criteria
Multi-select works; page reset on every filter change; clear/restore buttons behave correctly.

---

## T5: Page Wiring

### Test Scenarios
- Page mount with empty URL → localStorage prefs applied if present
- Page mount with URL params → URL state used; localStorage ignored
- Filter change → `router.replace` called with serialized params; not `router.push`
- Stat cards: values match `query.stats`; "—" when `stats=null`
- Error state: visible when `query.error` non-null; retry triggers fetch
- Bundle: no reference to `@/lib/mock` in procesos page bundle
- Dev tools: no request to `datos.gov.co`

### Gate Criteria
URL is source of truth; mock removed; stat cards and error state functional.

---

## End-to-End Verification

1. `npm run build` → 0 errors; `@/lib/mock` not in procesos page chunk
2. Open `/dashboard/procesos` as authenticated user → real SECOP rows visible
3. Select "Bolívar" in departamento → URL updates, rows filter, stat cards update
4. Type "software" in search → 400ms debounce; matching rows appear
5. Navigate to page 2 → overlay shows briefly; page 2 rows appear; stat cards unchanged
6. Copy URL; open in new tab → same filter state applied
7. As empresa with a pliego for proceso X: row X shows "Pliego" badge
8. As empresa with analysis for proceso Y: row Y shows "Analizado" badge + sem pill; click → analisis page
9. Clear all filters → default state; stat cards show global totals
10. Check Network tab: zero requests to `datos.gov.co`

**Gate Criteria:** All 10 steps complete without errors. `procesos-listing` spec shipped.
