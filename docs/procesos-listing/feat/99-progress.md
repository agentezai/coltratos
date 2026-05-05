# Progress: procesos-listing

### T1: Types + Filter State
- [ ] Implement T1: Add `ProcesosFilterState` (with `unspsc`, `cuantia_min/max`, `fecha_cierre_from/to`, `profile_match`; no `fase`) to domain types; write `filter-state.ts` (serialize/deserialize/defaults); write `preferences.ts` (localStorage read/write)
- [ ] Verify T1: Round-trip test; empty array suppression; null suppression; profile_match=false suppression; corrupt-storage null return

### T2: Fetch Hook
- [ ] Implement T2: Write `useProcesosQuery` with `isLoading`, `isPaging`, `hasFilters`, abort controller
- [ ] Verify T2: Loading state differentiation; abort on filter change; error propagation

### T3: Table Redesign
- [ ] Pre-code: confirm `StatCard`, `SemPill`, `Icon` component APIs (no changes needed)
- [ ] Implement T3: Rewrite `ProcesosTable` + new `ProcesoRow`; add `format.ts` helpers; add match_score chip (conditional on `hasVectorSearch`); remove mock dependency
- [ ] Verify T3: All badge/nav/empty state/skeleton/match_score scenarios; mock not imported

### T4: Filter Bar
- [ ] Implement T4: Rewrite `ProcesosFilters` with multi-select chips (departamento, modalidad, UNSPSC), search, cuantia range, fecha_cierre date range, profile_match toggle, sort, clear, restore buttons
- [ ] Verify T4: Multi-select; profile_match toggle; UNSPSC; date range; page reset; clear/restore behavior

### T5: Page Wiring
- [ ] Implement T5: Rewrite `page.tsx` + new `ProcesosPageClient` + new `ProcesoStatCards`; add `handleRowClick` with fire-and-forget POST to `/api/search-events`; add `DirectProcesoLookup`; pass `hasVectorSearch` + `onRowClick` to table
- [ ] Verify T5: URL source of truth; mock removed from bundle; stat cards; error state; row click fires POST; direct lookup navigates or shows inline error

### T6: Click Event Logging
- [ ] Implement T6: Write `app/api/search-events/route.ts` POST handler with auth gate, Zod validation, `append_clicked_id` RPC call; add `append_clicked_id` Postgres function to P1 migration
- [ ] Verify T6: Auth gate (401); Zod validation (400); search_log.clicked_ids updated; duplicate-safe deduplication; POST failure never blocks navigation
