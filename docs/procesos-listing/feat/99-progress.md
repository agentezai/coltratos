# Progress: procesos-listing

---

## Backend Tasks (B-series — rev 3 additions)

### B1: Schema + Env Confirmation
- [ ] Confirm domain-model-mvp rev 3 is merged and `procesos_index` has `socrata_id`, `unspsc`, `ciudad`, `embedded_at` columns
- [ ] Set `SECOP_SODA_DATASET_ID`, `SECOP_SODA_TOKEN`, `OPENAI_API_KEY`, `CRON_SECRET` in `.env.local` and Vercel project settings
- [ ] Verify none of the four vars appear in the compiled frontend bundle

### B2: SODA Client + Mapper
- [ ] Implement `lib/secop/client.ts`: `fetchOpenProcesos()`, `fetchProcesoByCodigo()`
- [ ] Implement `lib/secop/mapper.ts`: `mapSodaRow()` with field-name translation table (verify SODA field names against live dataset before coding)
- [ ] Implement `lib/secop/soql.ts`: `buildOpenProcesosQuery()`
- [ ] Verify B2: `id_proceso` → `numero_proceso` mapping; missing-field null handling; SODA client 200/503 behavior; SOQL builder

### B3: Cron Sync
- [ ] Implement `src/app/api/cron/sync-secop/route.ts`: auth gate, SODA fetch, upsert, prune, enqueue for B4
- [ ] Add cron entry to `vercel.json`: `"schedule": "0 */6 * * *"`
- [ ] Verify B3: auth gate (401); upsert idempotent (no duplicates); prune closed Procesos; embedding column preserved; SODA failure returns 200 not 5xx

### B4: Embeddings
- [ ] Implement `lib/secop/embeddings.ts`: `runEmbeddingSync(ids?)` with batch-embed, `embedded_at` update, cost logging
- [ ] Verify B4: stale-only embedding (skip unchanged rows); batch size ≤ 100; `embedding_events` row per batch; existing vectors preserved on failure; summary counts correct

### B5: Procesos Endpoint
- [ ] Implement `src/app/api/procesos/route.ts`: vector path (q non-empty) + structural path (q absent); profile-match; telemetry
- [ ] Implement `src/app/api/procesos/[numero_proceso]/route.ts`: index-first, SODA fallback (24h TTL), 404 on miss
- [ ] Create/extend `src/types/domain/procesos.ts`: `ProcesoListItem`, `ProcesosResponse`, `ProcesosStats`
- [ ] Verify B5: both code paths; profile-match filters; enrichment fields (has_pliego, has_analisis); telemetry written; direct lookup 200/404; no browser requests to datos.gov.co

---

## Frontend Tasks (T-series — unchanged from rev 2)

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
- [ ] Implement T6: Write `app/api/search-events/route.ts` POST handler with auth gate, Zod validation, `array_append` update on `search_events.clicked_ids`
- [ ] Verify T6: Auth gate (401); Zod validation (400); search_events.clicked_ids updated; duplicate-safe; POST failure never blocks navigation
