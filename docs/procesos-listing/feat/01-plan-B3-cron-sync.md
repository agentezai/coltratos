# B3: Cron Sync Route

## Scope

- `src/app/api/cron/sync-secop/route.ts` — Vercel cron route handler
- `vercel.json` — cron schedule entry (every 6 h)
- No embedding in this task — B4 handles that

## Logic

1. Validate `Authorization: Bearer <CRON_SECRET>` header → 401 if mismatch
2. Call `fetchOpenProcesos()` from B2 (handles SODA pagination)
3. Map each raw row via `mapSodaRow()` from B2
4. Upsert mapped rows into `procesos_index` on conflict `numero_proceso` (UPDATE all columns except `embedding` and `embedded_at` — preserve existing embeddings)
5. Prune rows where `fecha_limite_de_recepcion < now()` (these Procesos have closed; delete from index)
6. Return rows that are new or had `objeto_a_contratar` change to the B4 embedding job (call `runEmbeddingSync(changedIds)` — or enqueue via a simple array; B4 defines the interface)
7. Return 200 with `{ synced: number, pruned: number, toEmbed: number }`

## Deduplication

Upsert SQL pattern (service-role client):

```sql
INSERT INTO procesos_index (numero_proceso, socrata_id, entidad, objeto_a_contratar, modalidad,
  cuantia_proceso, fecha_de_publicacion_del_proceso, fecha_limite_de_recepcion, ciudad, unspsc, synced_at)
VALUES (...)
ON CONFLICT (numero_proceso) DO UPDATE SET
  socrata_id = EXCLUDED.socrata_id,
  entidad = EXCLUDED.entidad,
  objeto_a_contratar = EXCLUDED.objeto_a_contratar,
  modalidad = EXCLUDED.modalidad,
  cuantia_proceso = EXCLUDED.cuantia_proceso,
  fecha_de_publicacion_del_proceso = EXCLUDED.fecha_de_publicacion_del_proceso,
  fecha_limite_de_recepcion = EXCLUDED.fecha_limite_de_recepcion,
  ciudad = EXCLUDED.ciudad,
  unspsc = EXCLUDED.unspsc,
  synced_at = now()
-- embedding and embedded_at NOT in the SET list — preserved
```

## Changed-Row Detection

Compare `objeto_a_contratar` from SODA vs existing row. If different (or row is new), include in `changedIds` for B4. Use a single `SELECT numero_proceso, objeto_a_contratar FROM procesos_index WHERE numero_proceso = ANY($1)` before upsert to get current values.

## vercel.json Entry

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-secop",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Vercel sends the request with `Authorization: Bearer <CRON_SECRET>` automatically when configured via Vercel's cron dashboard.

## Error Handling

- SODA failure: catch, log to stderr with structured line, return 200 `{ ok: false, error: message }`
- DB upsert partial failure: log failed rows; continue batch; return summary including `failed` count
- Never return 5xx (Vercel retries on 5xx; we prefer explicit failure reporting)

## Dependencies

- B2: `fetchOpenProcesos()`, `mapSodaRow()` must be implemented
- B4: `runEmbeddingSync(ids: string[])` interface must be agreed before this task ships (ok to stub)
- `CRON_SECRET` env var set (B1)

## Done When

- [ ] POST to `/api/cron/sync-secop` without correct `CRON_SECRET` returns 401
- [ ] POST with correct secret and mocked SODA (3 rows) inserts 3 rows into `procesos_index`
- [ ] Re-running with same rows does not create duplicates (1 row per `numero_proceso`)
- [ ] Row with `fecha_limite_de_recepcion` = yesterday is deleted after sync
- [ ] `embedding` column value is NOT overwritten during upsert (preserved)
- [ ] `vercel.json` has cron entry with `"schedule": "0 */6 * * *"` for `/api/cron/sync-secop`
- [ ] Response is 200 with `{ synced, pruned, toEmbed }` fields
