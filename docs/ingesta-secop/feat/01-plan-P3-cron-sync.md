# P3: Cron Sync

## Scope

- `app/api/cron/sync-secop/route.ts` — GET handler
- `vercel.json` — cron schedule config
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
   - `last_updated_at` is null → backfill mode (90 days + open fase filter)
   - Otherwise → incremental mode (`sinceUpdatedAt = last_updated_at`)
3. `let lastSeenUpdatedAt = sinceUpdatedAt; let rowsSynced = 0`
4. For each page from `fetchProcesosIncremental(sinceUpdatedAt)`:
   - Map rows via `mapSodaRow`; filter out rows where mapper returned null
   - Upsert batch of 500 into `secop_procesos` (conflict on `id_proceso`)
   - Update `lastSeenUpdatedAt = max(batch[].socrata_updated_at)`
   - Increment `rowsSynced += batch.length`
   - **Timeout check**: if `Date.now() - startTime > TIMEOUT_BUFFER_MS` (e.g. 8000ms for Hobby, 55000ms for Pro), break and mark `partial`
5. Update `secop_sync_state`:
   - `last_updated_at = lastSeenUpdatedAt`
   - `last_run_at = now()`
   - `last_run_status = partial | success`
   - `rows_synced_last = rowsSynced`
   - `rows_synced_total += rowsSynced`
6. Return `{ rows_synced: rowsSynced, last_updated_at: lastSeenUpdatedAt, status }`

**Error handling:** wrap in try/catch; on error update `secop_sync_state` with `last_run_status = 'error'`, `last_error = err.message`; return 500.

### `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/sync-secop", "schedule": "*/30 * * * *" }
  ]
}
```

### Timeout strategy

Read `VERCEL_PLAN` env var (set manually to `hobby` or `pro`). Map to timeout budget:
- `hobby` → 8000ms buffer (10s limit)
- `pro` → 55000ms buffer (60s limit)
- Default → 8000ms (conservative)

## Dependencies

Requires P1 (DB + env), P2 (client + mapper).

## Done When

- [ ] GET without auth → 401
- [ ] GET with correct auth, 0 SODA rows → `{ rows_synced: 0, status: 'success' }` in < 3s
- [ ] Backfill: `last_updated_at` null → query uses 90-day filter
- [ ] Incremental: uses `sinceUpdatedAt` cursor correctly
- [ ] Partial: when timeout budget exceeded mid-run, returns `partial`; `last_updated_at` saved at last successful batch
- [ ] Re-run is idempotent (same 10 rows upserted twice → 10 rows in table, not 20)
- [ ] `vercel.json` cron entry present
- [ ] `npm run build` no type errors
