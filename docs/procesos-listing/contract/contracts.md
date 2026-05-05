# TDD Contract: procesos-listing

Write each failing test before implementing the corresponding behavior.

---

## Phase T1: Types + Filter State

### Behavior: serialize/deserialize round-trip (REQ-002)

**Given** a `ProcesosFilterState` with `departamento: ['Bolívar', 'Cundinamarca']`, `q: 'software'`, `page: 2`
**When** `serializeFilters(state)` then `deserializeFilters(result)`
**Then** output deep-equals input

**Test file:** `src/__tests__/filter-state.test.ts`
**Framework:** vitest

### Behavior: empty arrays not serialized (REQ-003)

**Given** `ProcesosFilterState` with `departamento: []`
**When** `serializeFilters(state)`
**Then** result does not contain `departamento` key

**Test file:** `src/__tests__/filter-state.test.ts`
**Framework:** vitest

### Behavior: multi-value arrays as comma-sep (REQ-003)

**Given** `departamento: ['Bolívar', 'Cundinamarca']`
**When** `serializeFilters(state)`
**Then** URLSearchParams has `departamento=Bolívar,Cundinamarca`

**Test file:** `src/__tests__/filter-state.test.ts`
**Framework:** vitest

### Behavior: empty URLSearchParams returns defaults (REQ-004)

**Given** `new URLSearchParams('')`
**When** `deserializeFilters(params)`
**Then** result deep-equals `DEFAULT_FILTER_STATE`

**Test file:** `src/__tests__/filter-state.test.ts`
**Framework:** vitest

### Behavior: loadPreferences returns null on corrupt JSON (REQ-006)

**Given** localStorage key contains `"{{broken json"`
**When** `loadPreferences()`
**Then** returns `null`; no throw

**Test file:** `src/__tests__/filter-state.test.ts`
**Framework:** vitest

### Behavior: profile_match=false not serialized (REQ-021)

**Given** `ProcesosFilterState` with `profile_match: false`
**When** `serializeFilters(state)`
**Then** result does not contain `profile_match` key

**Test file:** `src/__tests__/filter-state.test.ts`
**Framework:** vitest

### Behavior: profile_match=true serialized as "1" (REQ-021)

**Given** `ProcesosFilterState` with `profile_match: true`
**When** `serializeFilters(state)`
**Then** URLSearchParams has `profile_match=1`

**Test file:** `src/__tests__/filter-state.test.ts`
**Framework:** vitest

### Behavior: unspsc multi-value serialized as comma-sep (REQ-022)

**Given** `unspsc: ['43', '80']`
**When** `serializeFilters(state)`
**Then** URLSearchParams has `unspsc=43,80`

**Test file:** `src/__tests__/filter-state.test.ts`
**Framework:** vitest

### Behavior: cuantia_min null not serialized

**Given** `ProcesosFilterState` with `cuantia_min: null`
**When** `serializeFilters(state)`
**Then** result does not contain `cuantia_min` key

**Test file:** `src/__tests__/filter-state.test.ts`
**Framework:** vitest

### Behavior: isDefaultState true for DEFAULT_FILTER_STATE

**Given** `DEFAULT_FILTER_STATE` with all defaults
**When** `isDefaultState(DEFAULT_FILTER_STATE)`
**Then** returns `true`

**Test file:** `src/__tests__/filter-state.test.ts`
**Framework:** vitest

---

## Phase T2: Fetch Hook

### Behavior: isLoading true during fetch (REQ-014)

**Given** fetch pending
**When** `useProcesosQuery(filters)` renders mid-fetch
**Then** `isLoading=true`, `data=[]`, `error=null`

**Test file:** `src/__tests__/use-procesos-query.test.ts`
**Framework:** vitest + React Testing Library

### Behavior: isPaging true on page-only change (REQ-015)

**Given** current filters `{ page: 1, departamento: ['Bolívar'] }`
**When** `page` changes to `2` (same other fields)
**Then** `isPaging=true`, `isLoading=false`

**Test file:** `src/__tests__/use-procesos-query.test.ts`
**Framework:** vitest

### Behavior: in-flight request aborted on filter change

**Given** fetch in progress for filter state A
**When** filters change to B before response
**Then** AbortController signal is aborted; response A not applied to state

**Test file:** `src/__tests__/use-procesos-query.test.ts`
**Framework:** vitest (mocked fetch)

### Behavior: error state on non-200 (REQ-018)

**Given** fetch returns 500
**When** response processed
**Then** `error` non-null; `data=[]`; `isLoading=false`

**Test file:** `src/__tests__/use-procesos-query.test.ts`
**Framework:** vitest

### Behavior: hasVectorSearch true when q non-empty (REQ-023)

**Given** `filters.q = 'software ERP'`
**When** fetch succeeds
**Then** `hasVectorSearch=true`

**Test file:** `src/__tests__/use-procesos-query.test.ts`
**Framework:** vitest

### Behavior: hasVectorSearch false when q empty (REQ-023)

**Given** `filters.q = ''`
**When** fetch succeeds
**Then** `hasVectorSearch=false`

**Test file:** `src/__tests__/use-procesos-query.test.ts`
**Framework:** vitest

### Behavior: searchId updated after successful fetch (REQ-024)

**Given** initial `searchId = null`
**When** fetch completes successfully
**Then** `searchId` equals the UUID that was sent in `X-Search-Id` header

**Test file:** `src/__tests__/use-procesos-query.test.ts`
**Framework:** vitest

### Behavior: X-Search-Id header present in fetch (REQ-024)

**Given** any filter state
**When** `useProcesosQuery` fires a fetch
**Then** request headers include `X-Search-Id` with a valid UUID v4

**Test file:** `src/__tests__/use-procesos-query.test.ts`
**Framework:** vitest (mocked fetch, header inspection)

---

## Phase T3: Table Redesign

### Behavior: skeleton on isLoading (REQ-014)

**Given** `isLoading=true`
**When** `ProcesosTable` renders
**Then** 10 skeleton rows present; no real data rows

**Test file:** `src/__tests__/procesos-table.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: sem pill for analyzed row (REQ-011)

**Given** row with `has_analisis=true, last_sem='verde'`
**When** `ProcesoRow` renders
**Then** `SemPill` with status `verde` visible

**Test file:** `src/__tests__/procesos-table.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: grey dot for unanalyzed row (REQ-011)

**Given** row with `has_analisis=false`
**When** `ProcesoRow` renders
**Then** no `SemPill`; grey indicator visible

**Test file:** `src/__tests__/procesos-table.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: row click with analisis navigates to analisis (REQ-013, TC-008)

**Given** row with `has_analisis=true, last_analisis_id='ANA-123'`
**When** user clicks row
**Then** `router.push('/dashboard/analisis/ANA-123')` called

**Test file:** `src/__tests__/procesos-table.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: row click without analisis navigates to upload (REQ-013, TC-009)

**Given** row with `has_analisis=false, id_proceso='CO1.BDOS.X'`
**When** user clicks row
**Then** `router.push('/dashboard/upload?procesoId=CO1.BDOS.X')` called

**Test file:** `src/__tests__/procesos-table.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: empty state A when filters active (REQ-016, TC-011)

**Given** `isEmpty=true, hasFilters=true`
**When** `ProcesosTable` renders
**Then** "Sin procesos con estos filtros" visible; "Limpiar filtros" button present

**Test file:** `src/__tests__/procesos-table.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: empty state B when no filters (REQ-017, TC-012)

**Given** `isEmpty=true, hasFilters=false`
**When** `ProcesosTable` renders
**Then** "Aún no hay procesos sincronizados" visible; no "Limpiar filtros" button

**Test file:** `src/__tests__/procesos-table.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: match column visible when hasVectorSearch (REQ-023)

**Given** `hasVectorSearch=true`, row with `match_score=0.87`
**When** `ProcesosTable` renders
**Then** match column header visible; "87% relevante" chip shown in row

**Test file:** `src/__tests__/procesos-table.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: match column hidden when no vector search (REQ-023)

**Given** `hasVectorSearch=false`
**When** `ProcesosTable` renders
**Then** match column header not in DOM; no match chip rendered

**Test file:** `src/__tests__/procesos-table.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: onRowClick fires with position before navigation (REQ-024)

**Given** row at position index 2
**When** user clicks the row
**Then** `onRowClick(row, 2)` called before `router.push`

**Test file:** `src/__tests__/procesos-table.test.tsx`
**Framework:** vitest + React Testing Library

---

## Phase T4: Filter Bar

### Behavior: chip toggle adds to multi-select (REQ-003)

**Given** `filters.departamento=[]`
**When** user clicks "Bolívar" chip
**Then** `onFiltersChange` called with `{ departamento: ['Bolívar'], page: 1 }`

**Test file:** `src/__tests__/procesos-filters.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: chip toggle removes from multi-select

**Given** `filters.departamento=['Bolívar', 'Cundinamarca']`
**When** user clicks "Bolívar" chip
**Then** `onFiltersChange` called with `{ departamento: ['Cundinamarca'], page: 1 }`

**Test file:** `src/__tests__/procesos-filters.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: restore prefs button hidden when no prefs (REQ-006)

**Given** `hasPreferences=false`
**When** `ProcesosFilters` renders
**Then** "Restaurar preferencias" not visible

**Test file:** `src/__tests__/procesos-filters.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: profile_match toggle activates badge (REQ-021)

**Given** `filters.profile_match=false`
**When** user activates the "Coincide con mi perfil" toggle
**Then** `onFiltersChange` called with `{ profile_match: true, page: 1 }`; "Perfil activo" badge visible

**Test file:** `src/__tests__/procesos-filters.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: profile_match off hides badge (REQ-021)

**Given** `filters.profile_match=true`
**When** user deactivates the toggle
**Then** `onFiltersChange` called with `{ profile_match: false, page: 1 }`; "Perfil activo" badge not visible

**Test file:** `src/__tests__/procesos-filters.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: UNSPSC chip toggle (REQ-022)

**Given** `filters.unspsc=[]`
**When** user clicks "43 - Tecnologías de la información" chip
**Then** `onFiltersChange` called with `{ unspsc: ['43'], page: 1 }`

**Test file:** `src/__tests__/procesos-filters.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: all 8 UNSPSC options rendered (REQ-022)

**When** `ProcesosFilters` renders
**Then** 8 UNSPSC chip buttons visible with codes 43, 72, 80, 81, 83, 84, 85, 92

**Test file:** `src/__tests__/procesos-filters.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: fecha_cierre_from input fires change (REQ-020)

**Given** `filters.fecha_cierre_from=null`
**When** user sets date input to `"2026-06-01"`
**Then** `onFiltersChange` called with `{ fecha_cierre_from: '2026-06-01', page: 1 }`

**Test file:** `src/__tests__/procesos-filters.test.tsx`
**Framework:** vitest + React Testing Library

---

## Phase T5: Page Wiring

### Behavior: no mock import in bundle (NFR-03, TC-015)

**When** production build analyzed
**Then** `@/lib/mock` not in procesos page JS chunk

**Verification method:** `grep -r "lib/mock" .next/static` → 0 matches

### Behavior: URL params applied on load (REQ-002)

**Given** URL `/dashboard/procesos?departamento=Bolívar`
**When** `ProcesosPageClient` mounts
**Then** `useProcesosQuery` called with `filters.departamento=['Bolívar']`

**Test file:** `src/__tests__/procesos-page-client.test.tsx`
**Framework:** vitest + React Testing Library (mocked `useSearchParams`)

### Behavior: profile_match URL param activates toggle on load (REQ-021)

**Given** URL `/dashboard/procesos?profile_match=1`
**When** `ProcesosPageClient` mounts
**Then** `filters.profile_match=true`; profile_match toggle shown as active

**Test file:** `src/__tests__/procesos-page-client.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: row click fires POST fire-and-forget (REQ-024, REQ-025)

**Given** `query.searchId='uuid-abc'`, user clicks row at position 0
**When** `handleRowClick(row, 0)` called
**Then** `fetch('/api/search-events', { method: 'POST', body: JSON.stringify({ search_id: 'uuid-abc', id_proceso: row.id_proceso, position: 0 }) })` called; navigation proceeds regardless of POST result

**Test file:** `src/__tests__/procesos-page-client.test.tsx`
**Framework:** vitest + React Testing Library (mocked fetch)

### Behavior: direct lookup navigates on 200 (REQ-025)

**Given** `GET /api/procesos/CO1.BDOS.X` returns 200
**When** user submits ID "CO1.BDOS.X" in `DirectProcesoLookup`
**Then** `router.push('/dashboard/upload?procesoId=CO1.BDOS.X')` called

**Test file:** `src/__tests__/directo-proceso-lookup.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: direct lookup shows 404 error (REQ-025)

**Given** `GET /api/procesos/UNKNOWN` returns 404
**When** user submits "UNKNOWN"
**Then** "Proceso no encontrado en SECOP" visible inline; no navigation

**Test file:** `src/__tests__/directo-proceso-lookup.test.tsx`
**Framework:** vitest + React Testing Library

---

## Phase T6: Click Event Logging

### Behavior: POST logs click (REQ-024)

**Given** authenticated session; valid `search_id` in `search_log`; `id_proceso='CO1.BDOS.X'`
**When** `POST /api/search-events` with `{ search_id, id_proceso: 'CO1.BDOS.X', position: 2 }`
**Then** response 200 `{ ok: true }`; `search_log.clicked_ids` contains `'CO1.BDOS.X'`

**Test file:** `src/__tests__/search-events.test.ts`
**Framework:** vitest

### Behavior: POST without auth returns 401

**Given** no authenticated session
**When** `POST /api/search-events`
**Then** 401 response; `search_log` unchanged

**Test file:** `src/__tests__/search-events.test.ts`
**Framework:** vitest

### Behavior: POST with missing search_id returns 400

**Given** authenticated session
**When** `POST /api/search-events` with body `{ id_proceso: 'X', position: 0 }` (no search_id)
**Then** 400 response

**Test file:** `src/__tests__/search-events.test.ts`
**Framework:** vitest

### Behavior: POST with invalid UUID returns 400

**Given** authenticated session
**When** `POST /api/search-events` with `search_id: 'not-a-uuid'`
**Then** 400 response

**Test file:** `src/__tests__/search-events.test.ts`
**Framework:** vitest

### Behavior: duplicate click not added twice (REQ-024)

**Given** `search_log.clicked_ids` already contains `'CO1.BDOS.X'`
**When** `POST /api/search-events` with same `id_proceso='CO1.BDOS.X'`
**Then** 200 `{ ok: true }`; `clicked_ids` still has exactly one entry for `'CO1.BDOS.X'`

**Test file:** `src/__tests__/search-events.test.ts`
**Framework:** vitest

### Behavior: non-existent search_id silently succeeds

**Given** authenticated session; `search_id` not in `search_log`
**When** `POST /api/search-events` with that `search_id`
**Then** 200 `{ ok: true }`; no error thrown; `search_log` unchanged

**Test file:** `src/__tests__/search-events.test.ts`
**Framework:** vitest
