# Use Cases: secop-ingestion-and-listing

## Actors

| Actor | Description |
|-------|-------------|
| Pilot (usuario autenticado) | Colombian company rep discovering SECOP II opportunities in COLTRATOS |
| Cron job | Scheduled job firing every 6 hours |
| datos.gov.co SODA | External API; source of procesos data |
| OpenAI API | Embedding service (`text-embedding-3-small`) |
| Sistema (servidor) | Next.js API routes + Supabase |

## User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-01 | Pilot | Browse a paginated list of real open SECOP II procesos | I can quickly identify which ones to analyze |
| US-02 | Pilot | Search procesos by free-text keyword | I find procesos semantically matching my company's domain, not just exact keywords |
| US-03 | Pilot | Apply structural filters (modalidad, departamento, valor range, fecha cierre) | I narrow results to procesos I'm eligible for |
| US-04 | Pilot | Toggle "match my profile" to filter by my company's UNSPSC codes, valor range, and preferred departments | I see only procesos where my company plausibly qualifies |
| US-05 | Sistema (cron) | Sync new and updated procesos from SODA every 6 hours | The listing always reflects recent open procurement activity |
| US-06 | Sistema (cron) | Prune closed procesos from the index automatically | Pilots never see expired opportunities in search results |
| US-07 | Sistema (cron) | Compute embeddings for new or changed procesos | Semantic search stays accurate without manual intervention |
| US-08 | Sistema (admin) | See embedding cost per cron run in `embedding_cost_log` | Infra costs are observable and predictable |

## Use Case Scenarios

### UC-01 — Browse open procesos

**Precondition:** `secop_procesos` has rows; user authenticated.

**Main Scenario:**
1. User navigates to procesos listing page
2. Frontend calls `GET /api/procesos?sort=recent&page=1`
3. Route queries Supabase (structural path — no OpenAI call), returns 20 rows with `pagination` object
4. User sees list ordered by `fecha_publicacion desc`; `match_score` absent

### UC-02 — Semantic search

**Main Scenario:**
1. User types "software gestión documental" in search box
2. Frontend calls `GET /api/procesos?q=software+gestión+documental`
3. Route embeds query via OpenAI; performs `<=>` cosine similarity against `secop_procesos.embedding`
4. Results ordered by `match_score desc` (combined with active structural filters)
5. Each row includes `match_score` float

**Alt — no `q`:**
- Plain SQL path; OpenAI not called; `match_score = null`

### UC-03 — Profile-match filter

**Precondition:** Company profile has `alcance_comercial` with `unspsc`, `valor_max`, preferred `departamentos`.

**Main Scenario:**
1. User enables "Coincide con mi perfil" toggle
2. Frontend calls `GET /api/procesos?profile_match=true`
3. Route reads `company_profiles.alcance_comercial` for the authenticated empresa
4. Derives additional SQL constraints: `unspsc IN (...)`, `cuantia <= valor_max`, `departamento IN (...)`
5. Combined with any other active filters; results reflect intersection

### UC-04 — Cron incremental sync

**Precondition:** `secop_sync_state.last_updated_at = T`.

**Main Scenario:**
1. Cron fires with `Authorization: Bearer <CRON_SECRET>`
2. Route reads `last_updated_at` from `secop_sync_state`
3. `client.ts` calls SODA: `$where=:updated_at > 'T' $order=:updated_at asc $limit=50000`
4. Each batch upserted into `secop_procesos` (500 rows/batch)
5. After all batches: `DELETE FROM secop_procesos WHERE fecha_cierre < now()` (prune closed)
6. Embedding phase: SELECT rows WHERE `embedded_at IS NULL OR socrata_updated_at > embedded_at`; batch-embed via OpenAI; UPDATE; log cost
7. Returns `{ rows_synced, rows_pruned, rows_embedded, status: 'success' }`

### UC-05 — Initial backfill

**Precondition:** `secop_sync_state.last_updated_at` is null.

**Main Scenario:**
1. Cron fires
2. Route detects null `last_updated_at`; builds backfill query with open-fase filter
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

### UC-07 — Embedding sync (change-detection)

**Precondition:** Sync batch has completed; some rows have `embedded_at IS NULL` or `socrata_updated_at > embedded_at`.

**Main Scenario:**
1. Embedder queries for rows needing embedding (change-detection gate)
2. Batches rows into groups of 20
3. Calls `openai.embeddings.create` with concatenated texts
4. Updates each row: `SET embedding = $vector, embedded_at = now()`
5. Appends one `embedding_cost_log` row with aggregated `tokens_used` and `cost_usd`

**Alt — no changes:**
- 0 rows selected; OpenAI not called; cost log row has `rows_embedded = 0`

### UC-08 — Cost logging

**Precondition:** Any cron run completes (success or partial).

**Main Scenario:**
1. After embedding phase: INSERT into `embedding_cost_log` with `run_at`, `rows_embedded`, `tokens_used`, `cost_usd`
2. Cost computed from OpenAI response (`usage.total_tokens × $0.00002 / 1000`)
3. Row persists indefinitely; no TTL
