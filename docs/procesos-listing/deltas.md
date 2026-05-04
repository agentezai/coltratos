## Delta 2026-05-04 — edit | Discovery scope alignment + cuantia_min/max

**Mode:** edit
**Rationale:** Full discovery feature scope confirmed via 6-pilot interviews. Spec needed alignment with ingesta-secop rev 3 final API contract (which had evolved significantly). User preference: `cuantia_min/max` param names over `valor_min/max` on both sides.
**Affected domains:** contratacion-publica, integrations

### Tasks added
- None (T1–T5 count unchanged)

### Tasks modified
- T1: `ProcesosFilterState` — removed `fase` (pruned by cron, not a UI filter), added `unspsc`, `cuantia_min/max` (renamed from `valor_min/max`), `fecha_cierre_from/to`, `profile_match`; removed `OPEN_FASES` constant; sort enum gains `'relevance'` (renamed `'cuantia_desc'` from `'valor_desc'`)
- T3: `ProcesosTable` — added `hasVectorSearch` prop; added `match_score` chip column (conditional); `onRowClick` callback for click-logging; empty-state B copy updated to "6 horas"
- T4: `ProcesosFilters` — removed `fase` chip group; added UNSPSC multi-select (8 codes), `fecha_cierre_from/to` date range inputs, `profile_match` toggle; `cuantia_min/max` (renamed from `valor_min/max`); sort option `relevance` added

### Tasks removed
- None

### Impact on memory
- Cuantia naming convention (`cuantia_min/max` not `valor_min/max`) should be curated as a project convention — both frontend and backend now use consistent naming

---

## Delta 2026-05-04 — edit | Add semantic search, profile-match, click logging, direct ID lookup

**Mode:** edit
**Rationale:** Discovery interviews confirmed that SECOP portal is the current status quo; pilots need in-product discovery with semantic relevance, profile-aware filtering, and full click telemetry to measure result quality.
**Affected domains:** ui, hooks, api, types

### Tasks added
- T6: Click event logging — `app/api/search-events/route.ts` POST handler + `append_clicked_id` Postgres function

### Tasks modified
- T1: `ProcesosFilterState` — added `isDefaultState()`; `profile_match=false` omitted from URL serialization
- T2: `useProcesosQuery` — added `searchId: string | null`, `hasVectorSearch: boolean`; `X-Search-Id` custom header on every fetch; UUID generated per request, stored in state after success
- T3: `ProcesosTable` — added `hasVectorSearch` prop + conditional match_score column with percentage chip; added `onRowClick(row, position)` prop wired from parent
- T4: `ProcesosFilters` — added "Relevancia" sort option independent of `q`; profile_match toggle shows/hides "Perfil activo" badge
- T5: `ProcesosPageClient` — added `handleRowClick` with fire-and-forget POST to `/api/search-events`; added `DirectProcesoLookup` component with 404 inline error; wired `hasVectorSearch` + `onRowClick` to `ProcesosTable`

### Tasks removed
- None

### Impact on memory
- None identified — no curated conventions were invalidated by this change
