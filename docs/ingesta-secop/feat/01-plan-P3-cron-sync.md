# P3: Cron Sync

## Scope

- `app/api/cron/sync-secop/route.ts` — GET handler
- `vercel.json` — cron schedule config (6-hour cadence)
- `src/__tests__/cron-sync-secop.test.ts` — unit tests

## Changes

### `app/api/cron/sync-secop/route.ts`

```ts
export async function GET(req: NextRequest): Promise<NextResponse>
```

**Auth guard:**
```ts
const authHeader = req.headers.get('Authorization')
if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Sync algorithm:**
1. Read `secop_sync_state` for `dataset_id = 'p6dx-8zbt'` (service role Supabase client)
2. Determine mode:
   - `last_updated_at` is null → backfill mode (open-fase filter only — avoids 5M+ rows)
   - Otherwise → incremental mode (`sinceUpdatedAt = last_updated_at`)
3. `let lastSeenUpdatedAt = sinceUpdatedAt; let rowsSynced = 0`
4. For each page from `fetchProcesosIncremental(sinceUpdatedAt)`:
   - Map rows via `mapSodaRow`; filter out rows where mapper returned null
   - Upsert batch of 500 into `secop_procesos` (conflict on `id_proceso`)
   - Update `lastSeenUpdatedAt = max(batch[].socrata_updated_at)`
   - Increment `rowsSynced += batch.length`
   - **Timeout check**: if `Date.now() - startTime > TIMEOUT_BUFFER_MS` (8000ms for Hobby, 55000ms for Pro), break and mark `partial`
5. **Prune closed procesos** (runs only if sync completed without timeout):
   ```ts
   const { count: rowsPruned } = await supabaseService
     .from('secop_procesos')
     .delete({ count: 'exact' })
     .lt('fecha_cierre', new Date().toISOString())
   ```
6. **Call embedder**: `await runEmbeddingPhase(supabaseService)` — see P5
7. Update `secop_sync_state`:
   - `last_updated_at = lastSeenUpdatedAt`
   - `last_run_at = now()`
   - `last_run_status = partial | success`
   - `rows_synced_last = rowsSynced`
   - `rows_synced_total += rowsSynced`
8. Return `{ rows_synced: rowsSynced, rows_pruned: rowsPruned ?? 0, rows_embedded, status }`

**Error handling:** wrap in try/catch; on error update `secop_sync_state` with `last_run_status = 'error'`, `last_error = err.message`; return 500.

### `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/sync-secop", "schedule": "0 */6 * * *" }
  ]
}
```

> Cadence: every 6 hours. Reduces embedding API cost vs 30-minute cadence while keeping discovery data fresh enough for MVP pilots.

### Timeout strategy

Read `VERCEL_PLAN` env var (set manually to `hobby` or `pro`). Map to timeout budget:
- `hobby` → 8000ms buffer (10s limit)
- `pro` → 55000ms buffer (60s limit)
- Default → 8000ms (conservative)

### GitHub Action alternative

If upgrading to Pro is not desirable, use a GitHub Action cron:

```yaml
on:
  schedule:
    - cron: '0 */6 * * *'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X GET "$APP_URL/api/cron/sync-secop" -H "Authorization: Bearer $CRON_SECRET"
        env:
          APP_URL: ${{ secrets.APP_URL }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
```

GitHub Actions free tier has no timeout constraint issue. Choose one — not both.

## Dependencies

Requires P1 (DB + env), P2 (client + mapper). P5 (embeddings) is called from this route after sync completes.

## Done When

- [ ] GET without auth → 401
- [ ] GET with correct auth, 0 SODA rows → `{ rows_synced: 0, rows_pruned: 0, status: 'success' }` in < 3s
- [ ] Backfill: `last_updated_at` null → query uses open-fase filter
- [ ] Incremental: uses `sinceUpdatedAt` cursor correctly
- [ ] Partial: when timeout budget exceeded mid-run, returns `partial`; `last_updated_at` saved at last successful batch
- [ ] Prune: rows with `fecha_cierre < now()` deleted after successful sync
- [ ] Re-run is idempotent (same 10 rows upserted twice → 10 rows in table, not 20)
- [ ] `vercel.json` cron entry shows `0 */6 * * *`
- [ ] `npm run build` no type errors
