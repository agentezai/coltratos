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
