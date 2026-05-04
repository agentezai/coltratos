# procesos-listing — Software Design Document

## Intention

Redesign the `/dashboard/procesos` page to replace mock data with real SECOP II procesos from `/api/procesos` (delivered by `ingesta-secop`). The listing enables pilots to discover SECOP II opportunities matching their profile criteria directly inside COLTRATOS — without needing to use SECOP's own portal. Discovery is the entry point to the product. The page supports semantic free-text search (powered by pgvector embeddings in `ingesta-secop`), a "Coincide con mi perfil" toggle that auto-applies company profile filters, sidebar structural filters, URL-persistent state, filter-aware stat cards, match score display, and three distinct loading/empty/error states. Clicking any result navigates to the upload flow with the Proceso pre-selected.

## Depends On

- `ingesta-secop` P4 fully shipped: `/api/procesos` must be live with enrichment + stats + vector search + search_log before this spec executes.
- `ingesta-secop` P5 fully shipped: embeddings must be populated so vector search returns match_score.
- `src/types/domain/procesos.ts` (frozen contract): `ProcesoListItem` (incl. `match_score`), `ProcesosResponse`, `ProcesosStats`, `ProcesosFilterState`, `SearchLogEntry`.

## Out of Scope

- Semáforo live-calculation for unanalyzed procesos — verdict only shown for rows where `has_analisis = true`
- Empresa profile filter preferences stored in DB — MVP uses localStorage; DB column is post-MVP
- UNSPSC autocomplete — multi-select with fixed list (no typeahead) in MVP
- Watchlists, saved searches, email alerts, push notifications — v2
- "Similar Procesos", side-by-side comparisons — v2
- `/mi-actividad` page (empresa stats dashboard) — separate spec

## Use Cases

Detailed scenarios in [use-cases.md](./use-cases.md).

| Use Case | Description |
|----------|-------------|
| UC-01 — Personalized listing on first visit | User lands on procesos page; localStorage defaults applied (if any); real SECOP rows visible |
| UC-02 — Multi-filter by departamento + modalidad | User selects multiple values; URL updates; stat cards reflect filtered subset |
| UC-03 — Semantic keyword search | User types in search box; debounced embed-and-search; match_score shown on rows |
| UC-04 — Paginate through results | User clicks next page; URL `page` param updates |
| UC-05 — Share filtered view via URL | User copies URL with filter params; colleague sees same filtered view |
| UC-06 — See empresa badges + navigate to upload | Rows show pliego/analisis badges; click navigates to upload with procesoId pre-filled |
| UC-07 — Empty state: no matching procesos | Filters return 0 results; clear-filters CTA visible |
| UC-08 — Empty state: no data synced | `secop_procesos` table empty; system message shown |
| UC-09 — Restore saved preferences | User clicks "Restaurar preferencias"; localStorage defaults reapplied |
| UC-10 — Profile-match toggle | User enables toggle; API applies UNSPSC/valor/departamento filters from company profile |
| UC-11 — Match score visible | With `q` active and profile_match on, each result card shows a match percentage |
| UC-12 — Direct Proceso ID lookup | User enters a specific proceso ID; falls back to direct datos.gov.co lookup for closed/pre-publication procesos |

---

## Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| REQ-001 | Page fetches from `GET /api/procesos` with current filter state serialized as URL query params |
| REQ-002 | Filter state serialized to URL on every change; browser back/forward navigates filter history |
| REQ-003 | Supported filters: `departamento` (multi-select), `modalidad` (multi-select), `unspsc` (multi-select), `cuantia_min`, `cuantia_max`, `fecha_cierre_from`, `fecha_cierre_to`, `q` (free-text), `profile_match` (toggle), `sort`, `page`, `page_size` |
| REQ-004 | On first visit with no URL params: apply saved localStorage preferences (if any); otherwise default to open-only sort=recent page_size=20 |
| REQ-005 | "Limpiar filtros" button resets all filters to global defaults (no localStorage reapplication) |
| REQ-006 | "Restaurar preferencias" button reapplies localStorage-saved filter state |
| REQ-007 | Filter changes reset `page` to 1 (avoid stale pagination) |
| REQ-008 | `q` input debounced 400ms before triggering fetch |
| REQ-009 | Stat cards display `total_abiertos`, `cierran_esta_semana`, `cuantia_total` from `response.stats`; values reflect active filters |
| REQ-010 | Table columns: sem indicator, Proceso (nombre + id_proceso), Entidad, Modalidad, Cuantía (formatted), Cierre (formatted), Badges (pliego/análisis), Match (when active) |
| REQ-011 | Sem indicator: shows `SemPill` if `has_analisis=true` with `last_sem` value; shows neutral grey dot if `has_analisis=false` |
| REQ-012 | Empresa badges: "Pliego" chip if `has_pliego=true`; "Analizado" chip if `has_analisis=true` |
| REQ-013 | Row click: navigate to `/dashboard/upload?procesoId=${id_proceso}` (if `has_analisis=false`) or `/dashboard/analisis/${last_analisis_id}` (if `has_analisis=true`) |
| REQ-014 | Loading state on filter change: table shows skeleton rows; stat cards show spinner |
| REQ-015 | Pagination loading state: subtle overlay on table (not skeleton) |
| REQ-016 | Empty state A ("no matching"): triggered when `data.length === 0` AND active filters exist; shows "Sin procesos con estos filtros" + "Limpiar filtros" CTA |
| REQ-017 | Empty state B ("no data synced"): triggered when `data.length === 0` AND no active filters; shows "Aún no hay procesos sincronizados" system message |
| REQ-018 | Error state: fetch returns non-200; shows "Error al cargar procesos" + retry button |
| REQ-019 | `datos.gov.co` never called from browser; dev tools show only requests to `/api/procesos` |
| REQ-020 | When `profile_match=true`: toggle visible and active; API derives UNSPSC/valor/departamento filters from company profile; filter badge shown in UI |
| REQ-021 | When `q` non-empty AND `match_score` present in response: each result card shows match percentage (e.g. "87% relevante") |
| REQ-022 | When `q` absent: `match_score` null; match percentage column hidden |
| REQ-023 | Direct Proceso ID lookup: text input accepts `id_proceso` (e.g. `CO1.BDOS.XXXXXXX`); on submit calls `GET /api/procesos/[id]`; navigates to upload with that proceso pre-filled |
| REQ-024 | Click event logged: on row click, POST to `/api/search-events` with `{ search_id, id_proceso, position }`; failure never blocks navigation |
| REQ-025 | UNSPSC multi-select: fixed list of 8 top-level UNSPSC codes; user selects one or more; applies `unspsc` filter |

### Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | Filter change to table update < 500ms p95 (structural queries); < 800ms (vector search) |
| NFR-02 | UX | URL updates synchronously on filter change (no debounce on URL write) |
| NFR-03 | Correctness | No mock data imported anywhere in procesos page or its components |
| NFR-04 | Correctness | `DATOS_GOV_APP_TOKEN`, `CRON_SECRET`, `OPENAI_API_KEY` absent from `.next/static` bundle |
| NFR-05 | Accessibility | Filter selects and search input have visible labels; table has proper `<th>` headers |

### Business Rules

| Rule | Description |
|------|-------------|
| RN-001 | Sem indicator only shown when `has_analisis=true`; never infer verdict from SECOP data |
| RN-002 | Filter state serialized as URL params; URL is the single source of truth for active filters |
| RN-003 | localStorage preferences are defaults only — URL params override them; never push URL state to localStorage |
| RN-004 | `cuantia_total` displayed as COP formatted string (e.g. "$8.750.000.000"); null/zero shown as "—" |
| RN-005 | Row click destination depends on enrichment; always prefer analisis view over upload if analysis exists |
| RN-006 | `profile_match` toggle defaults to off in MVP — measure adoption before enabling by default |
| RN-007 | Match score displayed only when `q` is active (semantic search path); never shown for structural-only queries |
| RN-008 | Click event logging is best-effort; POST failure must not block navigation or show error |
| RN-009 | Direct Proceso ID lookup uses `GET /api/procesos/[id]` which may call datos.gov.co for closed procesos; this is an intentional exception to RN-002 of ingesta-secop (on the request path, not the listing path) |

---

## Test Cases

### TC-001 — Page fetches from /api/procesos on mount (REQ-001)
**Given** user navigates to `/dashboard/procesos` with no URL params
**When** page mounts
**Then** fetch to `/api/procesos?sort=recent&page=1&page_size=20` made; mock not called

### TC-002 — Filter change updates URL (REQ-002)
**Given** user is on procesos page
**When** user selects "Bolívar" in departamento filter
**Then** URL changes to include `departamento=Bolívar`; new fetch triggered

### TC-003 — Multi-select departamento (REQ-003)
**Given** user selects "Bolívar" then "Cundinamarca"
**When** fetch fires
**Then** request includes `departamento=Bolívar%2CCundinamarca`

### TC-004 — Filter change resets page (REQ-007)
**Given** user is on page 3
**When** user changes departamento filter
**Then** URL `page=1`; fetch uses `page=1`

### TC-005 — q debounce (REQ-008)
**Given** user types "softw" then "software" within 400ms
**When** 400ms passes
**Then** exactly one fetch with `q=software`; no fetch for "softw"

### TC-006 — Stat cards from response.stats (REQ-009)
**Given** API returns `stats.total_abiertos=47`, `cierran_esta_semana=8`, `cuantia_total=8750000000`
**When** page renders
**Then** stat cards show "47", "8", "$8.750.000.000"

### TC-007 — Badges shown correctly (REQ-012)
**Given** row with `has_pliego=true, has_analisis=false`
**And** another row with `has_pliego=true, has_analisis=true`
**When** table renders
**Then** first row: "Pliego" chip visible, no "Analizado" chip; second row: both chips visible

### TC-008 — Row click with analisis → analisis page (REQ-013)
**Given** row with `has_analisis=true, last_analisis_id="ANA-123"`
**When** user clicks row
**Then** navigate to `/dashboard/analisis/ANA-123`

### TC-009 — Row click without analisis → upload page with procesoId (REQ-013)
**Given** row with `has_analisis=false, id_proceso="CO1.BDOS.X"`
**When** user clicks row
**Then** navigate to `/dashboard/upload?procesoId=CO1.BDOS.X`

### TC-010 — Skeleton on filter change (REQ-014)
**Given** user changes a filter while table has rows
**When** new fetch is in-flight
**Then** skeleton rows visible; stat cards show spinner

### TC-011 — Empty state A: filters active (REQ-016)
**Given** API returns `data: [], pagination.total: 0` with active `departamento=Xyz` filter
**When** table renders
**Then** "Sin procesos con estos filtros" message; "Limpiar filtros" button visible

### TC-012 — Empty state B: no data synced (REQ-017)
**Given** API returns `data: [], pagination.total: 0` with NO active filters
**When** table renders
**Then** "Aún no hay procesos sincronizados" system message; no "Limpiar filtros" button

### TC-013 — Error state (REQ-018)
**Given** API returns 500
**When** fetch completes
**Then** "Error al cargar procesos" message; retry button visible; no rows or skeleton

### TC-014 — Restore preferences (REQ-006)
**Given** localStorage has `{ departamento: ['Bolívar'], modalidad: ['Mínima cuantía'] }`
**When** user clicks "Restaurar preferencias"
**Then** URL updates to `departamento=Bolívar&modalidad=Mínima+cuantía`; fetch fires with those params

### TC-015 — No mock imported (NFR-03)
**When** production build analyzed
**Then** `@/lib/mock` not imported by any module in the procesos page bundle

### TC-016 — Profile-match toggle (REQ-020)
**Given** user enables "Coincide con mi perfil" toggle
**When** fetch fires
**Then** request includes `profile_match=true`; UI shows profile-match badge active

### TC-017 — Match score shown when q active (REQ-021)
**Given** API returns rows with `match_score: 0.87`
**When** table renders with `q` active
**Then** each row shows "87% relevante" (or equivalent); column header visible

### TC-018 — Match score hidden when no q (REQ-022)
**Given** API returns rows with `match_score: null`
**When** table renders without `q`
**Then** match score column not visible; no "% relevante" text on any row

### TC-019 — Direct ID lookup (REQ-023)
**Given** user types "CO1.BDOS.XXXXXXX" in ID lookup input and submits
**When** lookup resolves
**Then** navigates to `/dashboard/upload?procesoId=CO1.BDOS.XXXXXXX`

### TC-020 — Click event logged (REQ-024)
**Given** user clicks on a result row
**When** navigation begins
**Then** POST to `/api/search-events` fires (non-blocking); navigation proceeds regardless of POST outcome

---

## Architecture

### Data Flow

```mermaid
flowchart TD
    URL["URL query params\n(source of truth)"]
    FilterBar["ProcesosFilters\n(incl. profile_match toggle\n+ UNSPSC + fecha_cierre)"]
    Hook["useProcesosQuery\nhook"]
    API["GET /api/procesos\n(vector search or SQL)"]
    Table["ProcesosTable\n(incl. match_score col)"]
    StatCards["ProcesoStatCards"]
    LS["localStorage\n(preferences only)"]
    ClickAPI["POST /api/search-events\n(best-effort)"]
    DirectLookup["GET /api/procesos/[id]\n(fallback for closed procesos)"]

    URL -->|parse on mount| Hook
    FilterBar -->|user action| URL
    URL -->|trigger| Hook
    Hook -->|fetch| API
    API -->|data + stats + match_score| Hook
    Hook -->|rows| Table
    Hook -->|stats| StatCards
    LS -->|read on mount if URL empty| Hook
    Table -->|row click| ClickAPI
    Table -->|row click| Navigate
    DirectLookup -->|resolved proceso| Navigate
```

### Component Tree

```
app/dashboard/procesos/page.tsx          ← server component wrapper
└── ProcesosPageClient                    ← "use client" root; owns URL state + click logging
    ├── ProcesoStatCards                  ← 3 stat cards
    ├── ProcesosFilters                   ← filter bar (incl. profile_match toggle + UNSPSC + fecha range)
    ├── ProcesosTable                     ← table with match_score column
    │   └── ProcesoRow                    ← badges, sem indicator, match_score chip, click handler
    └── DirectProcesoLookup              ← ID input + fallback lookup
```

### Data Model Changes

No DB changes. This spec is frontend-only. Depends on `secop_procesos`, `secop_sync_state`, `search_log`, `embedding_cost_log`, `proceso`, `pliego`, `analisis` tables from `ingesta-secop`.

### API Contract (frozen)

Imported from `src/types/domain/procesos.ts` — do not redeclare locally. Key additions vs original:
- `ProcesoListItem.match_score: number | null`
- `ProcesosFilterState` adds `unspsc`, `fecha_cierre_from`, `fecha_cierre_to`, `cuantia_min`, `cuantia_max`, `profile_match`
- `SearchLogEntry` for click logging

### Tradeoffs

| Tradeoff | We chose | Over | Rationale |
|----------|----------|------|-----------|
| Filter state location | URL params | React state / Zustand | URL = shareable, bookmarkable, browser-native history |
| Fetch strategy | native `fetch` + `useState` | SWR / React Query | No extra dep; MVP traffic volume is low |
| localStorage for preferences | write on "Save" action | sync on every filter change | Prevents URL from being overwritten on load; URL is always truth |
| Empty state differentiation | two distinct states | single "no results" | User needs to know if it's their filters or the system |
| profile_match default | off | on | Measure adoption first; avoid surprising pilots with auto-filtered results |
| Click logging | best-effort POST | synchronous wait | Navigation must never block on analytics |

---

## Success Criteria

- [ ] Mock data fully removed from procesos page and its components
- [ ] Real procesos visible in UI with correct SECOP fields
- [ ] Empresa badges shown for rows with pliego/analisis
- [ ] All filter types (departamento, modalidad, UNSPSC, valor range, fecha cierre range, q, profile_match) functional
- [ ] URL persists and restores filter state on reload
- [ ] Stat cards always reflect current filter subset
- [ ] match_score visible on result rows when `q` active
- [ ] Profile-match toggle applies company profile filters
- [ ] Direct Proceso ID lookup navigates to upload with procesoId pre-filled
- [ ] Click events POSTed to /api/search-events on each row click
- [ ] All three loading/empty/error states reachable and correct

---

## Pre-Approval Gate

1. Confirm `ingesta-secop` P4 + P5 shipped (endpoint live, embeddings populated, types in `src/types/domain/procesos.ts` incl. `match_score`)
2. Confirm UNSPSC code list to show in multi-select (8 top-level codes or full list)
3. Confirm localStorage key name: `coltratos_procesos_filter_prefs`
4. Confirm stat card labels and icons match design system (`StatCard` component)
5. Confirm "Coincide con mi perfil" toggle label (or use English equivalent)
