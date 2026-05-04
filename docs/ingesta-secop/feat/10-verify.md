# Verification Plan: secop-ingestion-and-listing

## P1: Schema + Env

### Test Scenarios
- `npx supabase db push` applies without error (including pgvector extension)
- `select * from secop_procesos limit 1` → empty result, no error
- `\d secop_procesos` shows `embedding vector(1536)` and `embedded_at timestamptz` columns
- `select * from secop_sync_state` → one row `(p6dx-8zbt, null, null, null, ...)`
- `select * from embedding_cost_log limit 0` → succeeds (table exists)
- `select * from search_log limit 0` → succeeds (table exists)
- TS types regenerated include all four new tables
- Build fails with Zod error when `OPENAI_API_KEY` unset
- Build succeeds when all vars set

### Gate Criteria
Migration clean (pgvector + all four tables); initial row in sync_state; build fails fast on missing env.

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
- Mapper: `fase` field absent → `null` (no throw)
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
- GET with correct auth, SODA returns 0 rows → `{ rows_synced: 0, rows_pruned: 0, status: 'success' }`
- `last_updated_at` null → query uses open-fase filter (backfill mode)
- `last_updated_at = T` → query uses `$where=:updated_at > T`
- Upsert 10 rows, run again with same data → still 10 rows (idempotent)
- After sync: rows with `fecha_cierre < now()` deleted from `secop_procesos`
- Mid-run timeout: breaks at budget, returns `partial`, `last_updated_at` saved
- `vercel.json` has cron entry with schedule `0 */6 * * *`
- Response includes `rows_embedded` field from embedding phase

### Gate Criteria
Auth gate works; idempotency verified; prune runs after sync; partial resume tested; cron cadence is 6h.

---

## P5: Embeddings

### Test Scenarios
- Rows with `embedded_at IS NULL` → OpenAI called; `embedding IS NOT NULL`; `embedded_at` set to now
- Rows with `socrata_updated_at > embedded_at` → re-embedded; `embedded_at` updated
- Rows with `socrata_updated_at <= embedded_at` → OpenAI not called for those rows
- Run with 0 pending rows → OpenAI not called at all; `embedding_cost_log` row has `rows_embedded=0`
- `embedding_cost_log` has exactly 1 new row per cron invocation
- `OPENAI_API_KEY` value does not appear in any log output
- Batches of 20: 40 rows → 2 OpenAI calls; not 40 individual calls

### Gate Criteria
Change-detection gate works; cost always logged; no key leakage; batch calls correct.

---

## P4: /api/procesos

### Test Scenarios
- GET no filters → 20 rows, `pagination.total` correct, `sort=recent` order; `match_score=null`
- GET `departamento=Bolívar,Cundinamarca` → rows from both departamentos
- GET `modalidad=Mínima+cuantía,Licitación+pública` → rows matching either modalidad
- GET `unspsc=43232300,72000000` → rows with either UNSPSC code
- GET `cuantia_min=10000000&cuantia_max=500000000` → only rows in range with `cuantia_disponible=true`
- GET `fecha_cierre_from=2026-06-01&fecha_cierre_to=2026-08-31` → date range filter works
- GET `q=software` → OpenAI called once; `match_score` float on all rows; ordered descending
- GET `q=software` + `departamento=Bolívar` → vector search AND structural filter combined
- GET no `q` → OpenAI not called; `match_score=null`
- GET `profile_match=true` → UNSPSC/valor/departamento from company_profiles applied
- GET `sort=closing_soon` → ascending `fecha_cierre`, excludes past dates
- GET `sort=valor_desc` → descending cuantia, nulls last
- GET `page=2&page_size=20` with 50 rows → 20 rows, `pagination.page=2`, `total_pages=3`
- GET `page_size=101` → 400
- GET unauthenticated → 401
- Response includes `Cache-Control: private` (not `public`)
- `search_log` row created on each 200 response with correct `company_id`, `query`, `filter_object`, `result_count`
- Enrichment: empresa with pliego+analisis → `has_pliego=true`, `last_sem` set
- Enrichment: empresa with no interaction → all null/false
- Enrichment: empresa A cannot see empresa B enrichment for same proceso
- Stats: `total_abiertos` changes when `departamento` filter applied
- Stats: `cierran_esta_semana` only counts future `fecha_cierre` within 7d
- Direct lookup `GET /api/procesos/CO1.BDOS.X` → returns row from local index
- Direct lookup → if not in index, calls SODA; returns SODA row or 404

### Gate Criteria
Both search paths tested; profile-match derivation verified; search_log populated; enrichment tenant-isolated; stats filter-aware; direct lookup works; auth gate works; cache header is `private`.

---

## End-to-End Verification

1. Apply migration via `npx supabase db push`; verify `get_empresa_enrichment` and `search_procesos_semantic` functions exist; verify pgvector extension enabled
2. Trigger cron manually: `GET /api/cron/sync-secop` with correct Bearer token
3. Verify `secop_sync_state.last_run_status = 'success'`, `rows_synced_last > 0`
4. Query `select count(*) from secop_procesos where embedding is not null` → > 0
5. Query `select * from embedding_cost_log order by run_at desc limit 1` → `rows_embedded > 0`
6. Verify no row with `fecha_cierre < now()` in `secop_procesos`
7. Call `GET /api/procesos` as authenticated user → valid JSON with `data`, `pagination`, `stats`; `match_score=null`
8. Call `GET /api/procesos?q=software` → `match_score` float on rows; ordered desc
9. Enable profile-match toggle → row subset matches company UNSPSC/valor range
10. Click a result → verify `search_log.clicked_ids` updated (after T6 ships)
11. Run cron again → `rows_synced_last` updated; unchanged rows have 0 in embedding phase
12. Check Vercel build: `DATOS_GOV_APP_TOKEN`, `CRON_SECRET`, `OPENAI_API_KEY` absent from `.next/static`

**Gate Criteria:** Steps 1–12 complete. `procesos-listing` spec can now be executed.
