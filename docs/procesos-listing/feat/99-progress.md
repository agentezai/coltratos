# Progress: procesos-listing

### T1: Types + Filter State
- [ ] Implement T1: Add `ProcesosFilterState` to domain types; write `filter-state.ts` (serialize/deserialize/defaults); write `preferences.ts` (localStorage read/write)
- [ ] Verify T1: Round-trip test; empty array suppression; corrupt-storage null return

### T2: Fetch Hook
- [ ] Implement T2: Write `useProcesosQuery` with `isLoading`, `isPaging`, `hasFilters`, abort controller
- [ ] Verify T2: Loading state differentiation; abort on filter change; error propagation

### T3: Table Redesign
- [ ] Pre-code: confirm `StatCard`, `SemPill`, `Icon` component APIs (no changes needed)
- [ ] Implement T3: Rewrite `ProcesosTable` + new `ProcesoRow`; add `format.ts` helpers; remove mock dependency
- [ ] Verify T3: All badge/nav/empty state/skeleton scenarios; mock not imported

### T4: Filter Bar
- [ ] Implement T4: Rewrite `ProcesosFilters` with multi-select chips, search, range, sort, clear, restore buttons
- [ ] Verify T4: Multi-select; page reset; clear/restore behavior

### T5: Page Wiring
- [ ] Implement T5: Rewrite `page.tsx` + new `ProcesosPageClient` + new `ProcesoStatCards`
- [ ] Verify T5: URL source of truth; mock removed from bundle; stat cards; error state; E2E flow
