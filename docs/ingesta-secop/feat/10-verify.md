# Verification Plan: secop-ingestion-and-listing

## P1: Schema + Env

### Test Scenarios
- `npx supabase db push` applies without error
- `select * from secop_procesos limit 1` → empty result, no error
- `select * from secop_sync_state` → one row `(p6dx-8zbt, null, null, null, ...)`
- TS types regenerated include `secop_procesos` and `secop_sync_state`
- Build fails with Zod error when `DATOS_GOV_APP_TOKEN` unset
- Build succeeds when all vars set

### Gate Criteria
Migration clean; initial row in sync_state; build fails fast on missing env.

---

## P2: SODA Client

### Test Scenarios
- Mapper: valid ISO date → parsed correctly
- Mapper: invalid date string → `null`
- Mapper: cuantia `"45.000.000"` → `45000000` (number)
- Mapper: cuantia `"0"` → `null`
- Mapper: cuantia `"No Definido"` → `null`
- Mapper: `urlproceso` as object with `.url` → `url_secop` extracted correctly
- Mapper: `urlproceso` null → `null`
- `fetchProcesosIncremental` paginates (test with `limit: 2`, 5 fixture rows → 3 pages)
- Retry fires on 429 (mock response), not on 404
- No `DATOS_GOV_APP_TOKEN` value appears in any `console.log` output

### Gate Criteria
All mapper scenarios covered; pagination correct; retry tested; secrets not logged.

---

## P3: Cron Sync

### Test Scenarios
- GET without auth header → 401
- GET with wrong secret → 401
- GET with correct auth, SODA returns 0 rows → `{ rows_synced: 0, status: 'success' }`
- `last_updated_at` null → query uses 90-day backfill filter
- `last_updated_at = T` → query uses `$where=:updated_at > T`
- Upsert 10 rows, run again with same data → still 10 rows (idempotent)
- Mid-run timeout: breaks at budget, returns `partial`, `last_updated_at` saved
- `vercel.json` has cron entry for `*/30 * * * *`

### Gate Criteria
Auth gate works; idempotency verified; partial resume tested.

---

## P4: /api/procesos

### Test Scenarios
- GET no filters → 20 rows, `pagination.total` correct, `sort=recent` order
- GET `departamento=Bolívar,Cundinamarca` → rows from both departamentos
- GET `fase=Presentación de oferta,Borrador` → rows matching either fase
- GET `cuantia_min=10000000&cuantia_max=500000000` → only rows in range with `cuantia_disponible=true`
- GET `q=software` → rows where search_vector matches
- GET `sort=closing_soon` → ascending `fecha_cierre`, excludes past dates
- GET `sort=cuantia_desc` → descending `cuantia`, nulls last
- GET `page=2&page_size=20` with 50 rows → 20 rows, `pagination.page=2`, `total_pages=3`
- GET `page_size=101` → 400
- GET unauthenticated → 401
- Response includes `Cache-Control: private` (not `public`)
- Enrichment: empresa with pliego+analisis → `has_pliego=true`, `last_sem` set
- Enrichment: empresa with no interaction → all null/false
- Enrichment: empresa A cannot see empresa B enrichment for same proceso
- Stats: `total_abiertos` changes when `departamento` filter applied
- Stats: `cierran_esta_semana` only counts future `fecha_cierre` within 7d

### Gate Criteria
All filter combinations tested; enrichment tenant-isolated; stats filter-aware; auth gate works; cache header is `private`.

---

## End-to-End Verification

1. Apply migration via `npx supabase db push`; verify `get_empresa_enrichment` function exists
2. Trigger cron manually: `GET /api/cron/sync-secop` with correct Bearer token
3. Verify `secop_sync_state.last_run_status = 'success'`, `rows_synced_last > 0`
4. Query `select count(*) from secop_procesos` → >0 rows
5. Call `GET /api/procesos` as authenticated user → valid JSON with `data`, `pagination`, `stats`
6. Apply `departamento=Bolívar` → `stats.total_abiertos` changes from unfiltered value
7. Search `q=software` → matching procesos appear; non-matching absent
8. Change sort to `closing_soon` → ordered by `fecha_cierre` ascending, past dates absent
9. Upload a pliego for proceso X → re-call `/api/procesos`; that row shows `has_pliego=true`
10. Wait 30 min → cron fires again, `rows_synced_last` updated in sync_state
11. Check Vercel build: `DATOS_GOV_APP_TOKEN` and `CRON_SECRET` absent from `.next/static`

**Gate Criteria:** Steps 1–11 complete. `procesos-listing` spec can now be executed.
