# Use Cases: procesos-listing

## Actors

| Actor | Description |
|-------|-------------|
| Pilot (usuario autenticado) | Colombian company rep discovering SECOP II opportunities in COLTRATOS |
| Sistema (frontend) | Next.js client; manages URL state, fetch, render, and click logging |
| `/api/procesos` | Backend endpoint delivering enriched SECOP data (from ingesta-secop) |
| `/api/search-events` | Backend endpoint receiving click tracking events |
| `/api/procesos/[id]` | Direct lookup endpoint for closed or pre-publication procesos |

## User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-01 | Pilot | See real SECOP procesos without setting up filters | I can immediately assess available opportunities |
| US-02 | Pilot | Filter procesos by departamento, modalidad, UNSPSC, valor range, and fecha cierre | I see only procesos matching my company's scope |
| US-03 | Pilot | Search by free text and see semantic match scores | I find procesos that match my domain even if exact keywords differ |
| US-04 | Pilot | Enable "Coincide con mi perfil" toggle to auto-filter by my company profile | I skip manual filter setup for procesos I'm plausibly eligible for |
| US-05 | Pilot | Know which procesos I've already worked on | I don't waste time re-reviewing analyzed procesos |
| US-06 | Pilot | Share a filtered view with a colleague | We collaborate on the same opportunity set |
| US-07 | Pilot | Click a result and land on the upload flow | I can immediately start analyzing a Proceso I found |
| US-08 | Pilot | Look up a specific Proceso by its ID | I can still access closed or pre-publication procesos not in the index |

## Use Case Scenarios

### UC-01 — Personalized listing on first visit

**Precondition:** User authenticated; `ingesta-secop` P4 + P5 live; localStorage may or may not have saved preferences.

**Main Scenario:**
1. User navigates to `/dashboard/procesos`
2. Page checks URL params — none present
3. Page checks localStorage for `coltratos_procesos_filter_prefs`
4. If preferences found: URL updated with saved params; fetch fires
5. If no preferences: defaults applied (sort=recent, page_size=20); fetch fires
6. Table renders real SECOP rows; stat cards show filtered aggregates

**Alt — no data synced:**
- Fetch returns `data: [], total: 0` with no filters
- Empty state B shown: "Aún no hay procesos sincronizados"

### UC-02 — Multi-filter by departamento + modalidad

**Main Scenario:**
1. User opens departamento multi-select; selects "Bolívar" and "Cundinamarca"
2. URL updates to `departamento=Bolívar%2CCundinamarca`; `page` resets to 1
3. Skeleton rows shown while fetch in-flight
4. Results update; stat cards refresh to reflect filtered subset
5. User additionally selects "Mínima cuantía" in modalidad
6. URL updates; fetch fires again; results narrow further

### UC-03 — Semantic keyword search

**Main Scenario:**
1. User types "software gestión documental" in search input
2. After 400ms debounce: URL updates `q=software+gestión+documental`; fetch fires
3. API embeds query; results include `match_score` per row
4. Table shows "Match" column with "87% relevante" per row; ordered by relevance descending
5. User clears the input: `q` removed from URL; match column hidden; results re-fetched

### UC-04 — Profile-match toggle

**Precondition:** Company profile has `alcance_comercial` with UNSPSC codes, valor range, preferred departamentos.

**Main Scenario:**
1. User enables "Coincide con mi perfil" toggle
2. URL updates `profile_match=true`; fetch fires
3. API reads company profile; applies UNSPSC/valor/departamento constraints
4. Results narrowed to procesos matching company's profile
5. Filter bar shows "Perfil activo" badge to indicate auto-filters in effect
6. Combinable with free-text search: toggle ON + `q` → semantic search within profile scope

### UC-05 — Paginate

**Main Scenario:**
1. Table shows page 1 of 18 (`total=342, page_size=20`)
2. User clicks "Siguiente"
3. URL updates `page=2`; overlay shown on table during fetch (not skeleton)
4. Page 2 rows replace page 1; stat cards do not re-fetch

### UC-06 — Share filtered view

**Main Scenario:**
1. User copies URL: `/dashboard/procesos?departamento=Bolívar&profile_match=true`
2. Colleague opens the URL
3. Colleague's page loads with the same filter state applied
4. Both see the same subset of procesos (modulo enrichment — pliego/analisis badges differ per empresa)

### UC-07 — Click to upload flow

**Main Scenario:**
1. User sees a row with no badges (no pliego, no analisis yet)
2. User clicks the row
3. Navigates to `/dashboard/upload?procesoId=CO1.BDOS.XXXXXXX`
4. Upload flow has the Proceso pre-selected; user does not need to search again

**Alt — row has analisis:**
1. User clicks row with "Analizado" badge
2. Navigates to `/dashboard/analisis/${last_analisis_id}`

### UC-08 — Empty state: no matching procesos

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

### UC-10 — Profile-match filter active state

**Precondition:** profile_match=true; company profile has alcance_comercial.

**Main Scenario:**
1. Filter bar shows "Perfil activo" badge
2. Sidebar shows which profile-derived filters are in effect (e.g. "UNSPSC: 43 - Tecnología")
3. User can still manually override by adding extra departamento/modalidad filters
4. Extra filters combine with profile constraints (intersection)

### UC-11 — Match score display

**Precondition:** `q` is non-empty; API returns rows with `match_score` float.

**Main Scenario:**
1. Each result card shows a match score chip: "87% relevante"
2. Results ordered descending by match_score (API handles ordering)
3. Sort dropdown switches to "Relevancia" automatically when `q` is active
4. User can override sort to see results ordered by cierre date instead

### UC-12 — Direct Proceso ID lookup

**Precondition:** Pilot has a specific Proceso ID (e.g. from a colleague's email or SECOP UI).

**Main Scenario:**
1. User finds the "Buscar por ID" input at the bottom of the filter bar
2. User types "CO1.BDOS.XXXXXXX" and clicks Buscar
3. Frontend calls `GET /api/procesos/CO1.BDOS.XXXXXXX`
4. If found: navigates to `/dashboard/upload?procesoId=CO1.BDOS.XXXXXXX`
5. If 404: shows inline error "Proceso no encontrado en SECOP"

**Alt — proceso is in local index:**
- Same as main scenario; API returns immediately from `secop_procesos` (no SODA call)
