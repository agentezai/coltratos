# Use Cases: secop-ingestion-and-listing

## Actors

| Actor | Description |
|-------|-------------|
| Usuario autenticado | SME browsing open procesos in COLTRATOS |
| Vercel Cron | Scheduled job firing every 30 minutes |
| datos.gov.co SODA | External API; source of procesos data |
| Sistema (servidor) | Next.js API routes + Supabase |

## User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-01 | Usuario autenticado | Browse a paginated list of real SECOP II procesos | I can quickly identify which ones to analyze |
| US-02 | Usuario autenticado | Filter procesos by departamento, fase, modalidad, and cuantia range | I see only procesos relevant to my company profile |
| US-03 | Usuario autenticado | Search procesos by keyword | I find procesos matching my company's domain |
| US-04 | Sistema (cron) | Sync new and updated procesos from SODA every 30 min | The listing always reflects recent procurement activity |

## Use Case Scenarios

### UC-01 — Browse open procesos

**Precondition:** `secop_procesos` has rows; user authenticated.

**Main Scenario:**
1. User navigates to procesos listing page
2. Frontend calls `GET /api/procesos?sort=recent&page=1`
3. Route queries Supabase, returns 20 rows with `pagination` object
4. User sees list ordered by `fecha_publicacion desc`

### UC-02 — Filter by departamento + cuantia range

**Main Scenario:**
1. User selects "Bolívar" and sets cuantia range 10M–500M
2. Frontend calls `GET /api/procesos?departamento=Bolívar&cuantia_min=10000000&cuantia_max=500000000`
3. Route adds `departamento = 'Bolívar'` AND `cuantia BETWEEN 10000000 AND 500000000` AND `cuantia_disponible = true`
4. Results reflect combined filters

### UC-03 — Full-text search

**Main Scenario:**
1. User types "software" in search box
2. Frontend calls `GET /api/procesos?q=software`
3. Route executes `search_vector @@ websearch_to_tsquery('spanish', 'software')`
4. Results include procesos where nombre, descripcion, or entidad match

### UC-04 — Cron incremental sync

**Precondition:** `secop_sync_state.last_updated_at = T`.

**Main Scenario:**
1. Vercel Cron fires with `Authorization: Bearer <CRON_SECRET>`
2. Route reads `last_updated_at` from `secop_sync_state`
3. `client.ts` calls SODA: `$where=:updated_at > 'T' $order=:updated_at asc $limit=50000`
4. Async generator paginates through results
5. Each batch upserted into `secop_procesos`; `secop_sync_state` updated with new `last_updated_at`
6. Returns `{ rows_synced, last_updated_at, status: 'success' }`

**Alt — 0 new rows:**
- SODA returns empty; `rows_synced_last = 0`; completes in < 3s

### UC-05 — Initial backfill

**Precondition:** `secop_sync_state.last_updated_at` is null.

**Main Scenario:**
1. Cron fires
2. Route detects null `last_updated_at`; builds backfill query:
   - `fecha_de_publicacion_del_proceso > now()-90d` AND open fase conditions
3. Iterates pages; upserts in batches of 500
4. If timeout approaches: marks `partial`, saves cursor, returns
5. Next cron resumes from saved cursor

### UC-06 — Cron resumes after partial failure

**Precondition:** Previous run marked `partial` with `last_updated_at = T_partial`.

**Main Scenario:**
1. Cron fires
2. Route reads `last_updated_at = T_partial`
3. Continues incremental from `T_partial`
4. On success: `last_run_status = 'success'`
