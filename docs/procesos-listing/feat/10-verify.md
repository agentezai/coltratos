# Verification Plan: procesos-listing

## T1: Types + Filter State

### Test Scenarios
- `serializeFilters` → `deserializeFilters` round-trip for all field types
- Empty arrays not serialized to URL params
- Multi-value arrays serialized as comma-separated strings (`departamento`, `modalidad`, `unspsc`)
- `deserializeFilters` with empty URLSearchParams returns `DEFAULT_FILTER_STATE`
- `loadPreferences` returns `null` on malformed JSON without throwing
- `savePreferences` writes parseable JSON to localStorage
- `profile_match=false` not serialized to URL; `profile_match=true` serialized as `"1"`
- `unspsc: ['43', '80']` serialized as `unspsc=43,80`
- `cuantia_min=1000000` serialized; `cuantia_min=null` omitted
- `fecha_cierre_from='2026-06-01'` serialized; null omitted
- `isDefaultState(DEFAULT_FILTER_STATE)` returns `true`; any non-default field returns `false`

### Gate Criteria
Round-trip correctness; no empty array/null params; profile_match excluded at false; isDefaultState correct.

---

## T2: Fetch Hook

### Test Scenarios
- `isLoading=true` during fetch; `false` after
- `isPaging=true` on page-change only; `isLoading=false`
- `error` set on non-200; data remains empty
- In-flight request aborted when filters change before response arrives
- `hasFilters=false` with default state; `true` when departamento set
- `data` and `stats` populated correctly from mock response
- `hasVectorSearch=true` when `filters.q` non-empty; `false` when empty
- `searchId` updated after each successful fetch
- `X-Search-Id` header present in every fetch request
- Same UUID sent in `X-Search-Id` stored in `searchId` state after success
- `profile_match=true` → `profile_match=1` query param sent to API

### Gate Criteria
Loading state differentiation correct; abort prevents stale render; hasFilters, hasVectorSearch, searchId all verified; X-Search-Id header included.

---

## T3: Table Redesign

### Test Scenarios
- Skeleton: 10 skeleton rows visible when `isLoading=true`
- Overlay: existing rows visible + overlay when `isPaging=true`
- Sem indicator: `SemPill` rendered when `has_analisis=true`; grey dot when false
- "Pliego" badge: present when `has_pliego=true`, absent when false
- Match column: visible when `hasVectorSearch=true`; hidden when false
- Match chip: shows `Math.round(match_score * 100)` + "% relevante" when non-null
- Match chip: not rendered when `match_score=null` (structural search)
- Row click with `has_analisis=true` navigates to `/dashboard/analisis/${id}`
- Row click without analisis navigates to `/dashboard/upload?procesoId=X`
- Row click calls `onRowClick(row, position)` before navigation
- Upload button click does not trigger row navigation
- Empty state A shown when `isEmpty=true && hasFilters=true`
- Empty state B shown when `isEmpty=true && hasFilters=false`; "6 horas" message present
- `formatCOP(null)` → "—"; `formatCOP(8750000000)` → "$ 8.750.000.000"
- `MockProceso` not imported in the component tree

### Gate Criteria
All badge, nav, match column, and empty state scenarios pass; onRowClick fires; no mock import.

---

## T4: Filter Bar

### Test Scenarios
- Departamento chip toggle: select/deselect updates `filters.departamento`
- Modalidad multi-select: 5 options; toggling adds/removes correctly
- UNSPSC multi-select: 8 top-level codes visible; toggling updates `filters.unspsc`
- `profile_match` toggle: on → `filters.profile_match=true` + "Perfil activo" badge shown
- `profile_match` toggle: off → badge hidden
- Every filter change includes `page: 1` in the patch
- `fecha_cierre_from` input change fires `onFiltersChange({ fecha_cierre_from: '2026-06-01', page: 1 })`
- `fecha_cierre_to` input change fires correctly
- `cuantia_min` blur fires `onFiltersChange({ cuantia_min: 5000000, page: 1 })`
- `cuantia_min` cleared → `onFiltersChange({ cuantia_min: null, page: 1 })`
- "Limpiar filtros" calls `onClear`; all filters reset including `profile_match` and `unspsc`
- "Restaurar preferencias" visible when `hasPreferences=true`, hidden when false
- `q` input value reflects `filters.q`
- Sort dropdown includes "Relevancia" option; can be selected independently of `q`

### Gate Criteria
Multi-select works for all three chip groups; profile_match toggle shows/hides badge; page reset on every filter change; date and valor inputs fire correctly; clear/restore buttons behave correctly.

---

## T5: Page Wiring

### Test Scenarios
- Page mount with empty URL → localStorage prefs applied if present
- Page mount with URL params → URL state used; localStorage ignored
- Filter change → `router.replace` called with serialized params; not `router.push`
- `profile_match=1` in URL → toggle active on load; "Perfil activo" badge shown
- Stat cards: values match `query.stats`; "—" when `stats=null`
- Error state: visible when `query.error` non-null; retry triggers fetch
- Row click: `handleRowClick(row, position)` called; POST fires to `/api/search-events`
- Row click: navigation proceeds regardless of POST outcome
- Direct ID lookup: valid ID → navigates to `/dashboard/upload?procesoId=X`
- Direct ID lookup: 404 → inline error "Proceso no encontrado en SECOP"
- Direct ID lookup: network error → inline error "Error de red"
- Bundle: no reference to `@/lib/mock` in procesos page bundle
- Dev tools: no request to `datos.gov.co`

### Gate Criteria
URL is source of truth; mock removed; stat cards, error state, click logging, direct lookup all functional.

---

## T6: Click Event Logging

### Test Scenarios
- POST `/api/search-events` with `{ search_id, id_proceso, position }` → 200 `{ ok: true }`
- POST without `Authorization` header / unauthenticated session → 401
- POST with missing `search_id` → 400
- POST with invalid `search_id` (not UUID) → 400
- POST with missing `id_proceso` → 400
- POST with invalid `position` (negative) → 400
- POST with non-existent `search_id` → 200 (silently does nothing)
- POST for same `id_proceso` twice → `clicked_ids` array contains it once (deduplication)
- POST failure (500) does not prevent row navigation in client
- `search_log.clicked_ids` contains `id_proceso` after valid POST

### Gate Criteria
Auth gate enforced; Zod validation catches malformed payloads; search_log updated; duplicate-safe; POST never blocks navigation.

---

## End-to-End Verification

1. `npm run build` → 0 errors; `@/lib/mock` not in procesos page chunk
2. Open `/dashboard/procesos` as authenticated user → real SECOP rows visible
3. Select "Bolívar" in departamento → URL updates, rows filter, stat cards update
4. Select UNSPSC code "43 - Tecnologías de la información" → rows filtered by UNSPSC
5. Toggle "Coincide con mi perfil" → toggle active; "Perfil activo" badge shown; rows re-fetched
6. Type "software" in search → match_score column appears; rows sorted by relevance; match % chips shown
7. Click first row → POST fires to `/api/search-events`; navigate to analisis or upload
8. Navigate to page 2 → overlay shows briefly; page 2 rows appear; stat cards unchanged
9. Paste URL in new tab → same filter state applied (including profile_match toggle)
10. Enter known Proceso ID in direct lookup → navigates to upload with procesoId
11. Enter unknown ID in direct lookup → "Proceso no encontrado en SECOP" inline error
12. Check Network tab: zero requests to `datos.gov.co`; search-events POST fired on row click

**Gate Criteria:** All 12 steps complete without errors. `procesos-listing` spec shipped.
