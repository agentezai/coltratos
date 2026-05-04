# TDD Contract: secop-ingestion-and-listing

Write each failing test before implementing the corresponding behavior.

---

## Phase P1: Schema + Env

### Behavior: build fails on missing OPENAI_API_KEY (REQ-020)

**Given** `OPENAI_API_KEY` not set in process.env
**When** `lib/env.ts` is imported (at build time)
**Then** Zod throws with message referencing `OPENAI_API_KEY`

**Test file:** `src/__tests__/env.test.ts`
**Framework:** vitest

### Behavior: build fails on missing DATOS_GOV_APP_TOKEN (REQ-020)

**Given** `DATOS_GOV_APP_TOKEN` not set in process.env
**When** `lib/env.ts` is imported
**Then** Zod throws with message referencing `DATOS_GOV_APP_TOKEN`

**Test file:** `src/__tests__/env.test.ts`
**Framework:** vitest

---

## Phase P2: SODA Client

### Behavior: mapper parses valid date (RN-004)

**Given** `SodaRow` with `fecha_de_publicacion_del_proceso: "2026-04-15T10:00:00.000"`
**When** `mapSodaRow(row)` called
**Then** `fecha_publicacion` is a valid ISO Date string, not null

**Test file:** `src/__tests__/secop-mapper.test.ts`
**Framework:** vitest

### Behavior: mapper returns null for invalid date (RN-004)

**Given** `SodaRow` with `fecha_de_publicacion_del_proceso: "invalid"`
**When** `mapSodaRow(row)` called
**Then** `fecha_publicacion` is `null`; no throw

**Test file:** `src/__tests__/secop-mapper.test.ts`
**Framework:** vitest

### Behavior: mapper parses cuantia with separators (RN-003)

**Given** `SodaRow` with `precio_base: "45.000.000"`
**When** `mapSodaRow(row)` called
**Then** `cuantia === 45000000` (number)

**Test file:** `src/__tests__/secop-mapper.test.ts`
**Framework:** vitest

### Behavior: mapper returns null for zero cuantia (RN-003)

**Given** `SodaRow` with `precio_base: "0"`
**When** `mapSodaRow(row)` called
**Then** `cuantia === null`

**Test file:** `src/__tests__/secop-mapper.test.ts`
**Framework:** vitest

### Behavior: mapper returns null for "No Definido" cuantia (RN-003)

**Given** `SodaRow` with `precio_base: "No Definido"`
**When** `mapSodaRow(row)` called
**Then** `cuantia === null`

**Test file:** `src/__tests__/secop-mapper.test.ts`
**Framework:** vitest

### Behavior: fetchProcesosIncremental paginates (P2)

**Given** mock SODA returning 5 rows with `$limit=2`
**When** async generator consumed fully
**Then** 3 pages yielded (2, 2, 1 rows); fetch called 3 times

**Test file:** `src/__tests__/secop-client.test.ts`
**Framework:** vitest (mocked fetch)

### Behavior: retry on 429 (P2)

**Given** SODA returns 429 twice then 200
**When** `fetchProcesosIncremental` called
**Then** 3 total fetch calls; result returned from 3rd call

**Test file:** `src/__tests__/secop-client.test.ts`
**Framework:** vitest

---

## Phase P3: Cron Sync

### Behavior: 401 without auth (REQ-001, TC-001)

**Given** GET to `/api/cron/sync-secop` with no Authorization header
**When** handler processes request
**Then** HTTP 401

**Test file:** `src/__tests__/cron-sync-secop.test.ts`
**Framework:** vitest

### Behavior: backfill uses open-fase filter (REQ-002, TC-002)

**Given** `secop_sync_state.last_updated_at = null`
**When** cron fires (mocked SODA client)
**Then** SODA client called with open-fase filter condition

**Test file:** `src/__tests__/cron-sync-secop.test.ts`
**Framework:** vitest

### Behavior: incremental uses cursor (REQ-003, TC-003)

**Given** `last_updated_at = '2026-04-01T00:00:00Z'`
**When** cron fires
**Then** SODA client called with `sinceUpdatedAt = 2026-04-01T00:00:00Z`

**Test file:** `src/__tests__/cron-sync-secop.test.ts`
**Framework:** vitest

### Behavior: upsert idempotent (REQ-004, TC-004)

**Given** 10 rows in `secop_procesos`; cron runs again with same 10 rows from SODA
**When** second run completes
**Then** still 10 rows; no duplicates

**Test file:** `src/__tests__/cron-sync-secop.test.ts`
**Framework:** vitest

### Behavior: prune removes closed procesos (REQ-007, TC-005)

**Given** `secop_procesos` has 5 rows; 2 have `fecha_cierre` in the past
**When** cron sync batch completes
**Then** DELETE called; 2 rows removed; 3 remain

**Test file:** `src/__tests__/cron-sync-secop.test.ts`
**Framework:** vitest

### Behavior: cron calls embedding phase (REQ-008)

**Given** cron sync completes successfully
**When** response returned
**Then** `runEmbeddingPhase` called with supabase service client; result in response body

**Test file:** `src/__tests__/cron-sync-secop.test.ts`
**Framework:** vitest (mock runEmbeddingPhase)

---

## Phase P5: Embeddings

### Behavior: new rows are embedded (REQ-008, TC-006)

**Given** 5 rows with `embedded_at IS NULL`
**When** `runEmbeddingPhase` called (mocked OpenAI)
**Then** OpenAI called; all 5 rows updated with non-null `embedding`; `embedded_at` set; `embedding_cost_log` has 1 new row

**Test file:** `src/__tests__/secop-embeddings.test.ts`
**Framework:** vitest

### Behavior: unchanged rows are skipped (REQ-008, NFR-07, TC-007)

**Given** 5 rows with `socrata_updated_at <= embedded_at`
**When** `runEmbeddingPhase` called
**Then** OpenAI not called; `embedding_cost_log` row has `rows_embedded = 0`

**Test file:** `src/__tests__/secop-embeddings.test.ts`
**Framework:** vitest

### Behavior: changed rows are re-embedded (REQ-008)

**Given** 3 rows with `socrata_updated_at > embedded_at`
**When** `runEmbeddingPhase` called
**Then** OpenAI called for those 3 rows only; `embedded_at` updated to now

**Test file:** `src/__tests__/secop-embeddings.test.ts`
**Framework:** vitest

### Behavior: cost logged every run (REQ-010)

**Given** any invocation of `runEmbeddingPhase` (even with 0 rows)
**When** function completes
**Then** exactly 1 row inserted into `embedding_cost_log`

**Test file:** `src/__tests__/secop-embeddings.test.ts`
**Framework:** vitest

---

## Phase P4: /api/procesos

### Behavior: page_size > 100 returns 400 (REQ-019, TC-013)

**Given** GET `/api/procesos?page_size=101`
**When** Zod parses query params
**Then** HTTP 400

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: unauthenticated → 401 (P4)

**Given** GET `/api/procesos` with no Supabase session
**When** handler checks auth
**Then** HTTP 401

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: structural path — no OpenAI call (REQ-015, TC-009)

**Given** GET `/api/procesos?departamento=Bolívar` with no `q`
**When** handler executes
**Then** OpenAI not called; all rows have `match_score=null`

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: vector path — match_score present (REQ-013, TC-010)

**Given** rows with non-null embeddings in DB
**When** GET `/api/procesos?q=software gestión`
**Then** OpenAI called once (query embedding); rows have `match_score` float between 0 and 1; rows ordered descending by match_score

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: profile-match derives filters (REQ-014, TC-011)

**Given** company_profiles has `alcance_comercial.unspsc = ["43232300"]`, `valor_max = 500000000`
**When** GET `/api/procesos?profile_match=true`
**Then** only rows with `unspsc = "43232300"` AND `cuantia <= 500000000` returned; no company_profiles data in response

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: search_log row created (REQ-016, TC-012)

**Given** authenticated empresa calls GET `/api/procesos?q=software&departamento=Bolívar`
**When** handler returns 200
**Then** `search_log` has 1 new row: `company_id` matches empresa, `query="software"`, `filter_object` includes departamento, `result_ids` matches response ids

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: departamento multi-value filter (REQ-012, TC-008)

**Given** DB has rows for Bolívar, Cundinamarca, and Antioquia
**When** GET `/api/procesos?departamento=Bolívar,Cundinamarca`
**Then** only Bolívar and Cundinamarca rows in `data`; Antioquia absent

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: enrichment present for empresa with pliego + analisis (REQ-018, TC-014)

**Given** empresa A has a `pliego` and a completed `analisis` for `id_proceso = "X"` with semaforo `verde`
**When** empresa A calls `GET /api/procesos` and "X" appears in the page
**Then** row for "X" has `has_pliego=true`, `has_analisis=true`, `last_sem="verde"`, `last_analisis_id` non-null

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: enrichment tenant-isolated (REQ-018)

**Given** empresa A has pliego for "X"; empresa B does not
**When** empresa B calls `GET /api/procesos`
**Then** row for "X" shows `has_pliego=false` — empresa A's data not visible

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: stats reflect active filters (REQ-021, TC-015)

**Given** 100 total rows; 30 in Bolívar; 5 in Bolívar closing this week
**When** GET `/api/procesos?departamento=Bolívar`
**Then** `stats.total_abiertos ≤ 30`; `stats.cierran_esta_semana ≤ 5`; global values not returned

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: direct lookup returns local row (REQ-022)

**Given** `id_proceso = "CO1.BDOS.X"` exists in `secop_procesos`
**When** GET `/api/procesos/CO1.BDOS.X` (authenticated)
**Then** returns the local row as JSON; SODA not called

**Test file:** `src/__tests__/procesos-direct-lookup.test.ts`
**Framework:** vitest

### Behavior: direct lookup falls back to SODA (REQ-022)

**Given** `id_proceso = "CO1.BDOS.CLOSED"` not in `secop_procesos` (pruned or never synced)
**When** GET `/api/procesos/CO1.BDOS.CLOSED` (authenticated)
**Then** SODA called with that id; SODA row returned as JSON

**Test file:** `src/__tests__/procesos-direct-lookup.test.ts`
**Framework:** vitest
