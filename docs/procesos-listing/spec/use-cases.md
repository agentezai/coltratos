# Use Cases: procesos-listing

## Actors

| Actor | Description |
|-------|-------------|
| Usuario autenticado | SME browsing SECOP procesos in COLTRATOS dashboard |
| Sistema (frontend) | Next.js client; manages URL state, fetch, and render |
| `/api/procesos` | Backend endpoint delivering enriched SECOP data |

## User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-01 | Usuario autenticado | See real SECOP procesos without setting up filters | I can immediately assess available opportunities |
| US-02 | Usuario autenticado | Filter procesos by departamento, modalidad, and fase | I see only procesos relevant to my company's profile |
| US-03 | Usuario autenticado | Search by keyword | I find procesos matching my domain |
| US-04 | Usuario autenticado | Know which procesos I've already worked on | I don't waste time re-reviewing analyzed procesos |
| US-05 | Usuario autenticado | Share a filtered view with a colleague | We collaborate on the same opportunity set |
| US-06 | Usuario autenticado | Quickly navigate to an existing analysis | I continue from where I left off |

## Use Case Scenarios

### UC-01 — Personalized listing on first visit

**Precondition:** User authenticated; `ingesta-secop` P4 live; localStorage may or may not have saved preferences.

**Main Scenario:**
1. User navigates to `/dashboard/procesos`
2. Page checks URL params — none present
3. Page checks localStorage for `coltratos_procesos_filter_prefs`
4. If preferences found: URL updated with saved params; fetch fires
5. If no preferences: defaults applied (fase=open set, sort=recent, page_size=20); fetch fires
6. Table renders real SECOP rows; stat cards show filtered aggregates

**Alt — no data synced:**
1. Fetch returns `data: [], total: 0` with no filters
2. Empty state B shown: "Aún no hay procesos sincronizados"

### UC-02 — Multi-filter by departamento + modalidad

**Main Scenario:**
1. User opens departamento multi-select; selects "Bolívar" and "Cundinamarca"
2. URL updates to `departamento=Bolívar%2CCundinamarca`; `page` resets to 1
3. Skeleton rows shown while fetch in-flight
4. Results update; stat cards refresh to reflect filtered subset
5. User additionally selects "Mínima cuantía" in modalidad
6. URL updates; fetch fires again; results narrow further

### UC-03 — Keyword search

**Main Scenario:**
1. User types "software" in search input
2. After 400ms debounce: URL updates `q=software`; fetch fires
3. Results show only procesos matching full-text search
4. User clears the input: `q` removed from URL; previous results restored

### UC-04 — Paginate

**Main Scenario:**
1. Table shows page 1 of 18 (`total=342, page_size=20`)
2. User clicks "Siguiente"
3. URL updates `page=2`; overlay shown on table during fetch
4. Page 2 rows replace page 1; stat cards do not re-fetch

### UC-05 — Share filtered view

**Main Scenario:**
1. User copies URL: `/dashboard/procesos?departamento=Bolívar&modalidad=Mínima+cuantía`
2. Colleague opens the URL
3. Colleague's page loads with the same filter state applied
4. Both see the same subset of procesos (modulo enrichment differences — pliego/analisis badges differ per empresa)

### UC-06 — See empresa badges + navigate

**Main Scenario:**
1. User sees row with "Pliego" and "Analizado" badges
2. User clicks the row
3. Navigated to `/dashboard/analisis/${last_analisis_id}`

**Alt — pliego but no analisis:**
1. User sees row with "Pliego" badge only
2. User clicks the row
3. Navigated to `/dashboard/upload?procesoId=${id_proceso}` (upload flow)

**Alt — no interaction:**
1. User sees row with no badges, grey sem dot
2. User clicks
3. Navigated to `/dashboard/upload?procesoId=${id_proceso}`

### UC-07 — Empty state: no matching procesos

**Main Scenario:**
1. User applies filters that return no results
2. Empty state A shown: "Sin procesos con estos filtros"
3. "Limpiar filtros" CTA visible
4. User clicks it → filters reset; global listing shown

### UC-09 — Restore saved preferences

**Main Scenario:**
1. User previously saved preferences (departamento=Bogotá, modalidad=Licitación Pública)
2. User navigated away and URL has no params
3. User clicks "Restaurar preferencias"
4. URL updates with saved params; fetch fires; filtered view shown
