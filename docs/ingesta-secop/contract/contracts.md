# TDD Contract: secop-ingestion-and-listing

Write each failing test before implementing the corresponding behavior.

---

## Phase P1: Schema + Env

### Behavior: build fails on missing env var (REQ-013)

**Given** `DATOS_GOV_APP_TOKEN` not set in process.env
**When** `lib/env.ts` is imported (at build time)
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

### Behavior: backfill uses 90-day filter (REQ-002, TC-002)

**Given** `secop_sync_state.last_updated_at = null`
**When** cron fires (mocked SODA client)
**Then** SODA client called with backfill filter including `fecha_de_publicacion_del_proceso > <90days>`

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
**Framework:** vitest (DB integration or mocked Supabase)

---

## Phase P4: /api/procesos

### Behavior: page_size > 100 returns 400 (REQ-012, TC-009)

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

### Behavior: departamento multi-value filter (REQ-008, TC-007)

**Given** DB has rows for Bolívar, Cundinamarca, and Antioquia
**When** GET `/api/procesos?departamento=Bolívar,Cundinamarca`
**Then** only Bolívar and Cundinamarca rows in `data`; Antioquia absent; `total` reflects filtered count

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: enrichment present for empresa with pliego + analisis (REQ-011, TC-013)

**Given** empresa A has a `pliego` and a completed `analisis` for `id_proceso = "X"` with semaforo `verde`
**When** empresa A calls `GET /api/procesos` and "X" appears in the page
**Then** row for "X" has `has_pliego=true`, `has_analisis=true`, `last_sem="verde"`, `last_analisis_id` non-null

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: enrichment null when no empresa interaction (REQ-011, TC-014)

**Given** empresa has no pliego or analisis for any proceso
**When** `GET /api/procesos`
**Then** all rows: `has_pliego=false`, `has_analisis=false`, `last_sem=null`, `last_analisis_id=null`

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: enrichment tenant-isolated (REQ-011)

**Given** empresa A has pliego for "X"; empresa B does not
**When** empresa B calls `GET /api/procesos`
**Then** row for "X" shows `has_pliego=false` — empresa A's data not visible

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: stats reflect active filters (REQ-014, TC-015)

**Given** 100 total rows; 30 in Bolívar; 5 in Bolívar closing this week
**When** GET `/api/procesos?departamento=Bolívar`
**Then** `stats.total_abiertos ≤ 30`; `stats.cierran_esta_semana ≤ 5`; global values not returned

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: full-text search (REQ-009, TC-008)

**Given** rows with nombre "software" and rows without
**When** GET `/api/procesos?q=software`
**Then** only matching rows returned

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

### Behavior: closing_soon excludes past fecha_cierre (RN-007, TC-010)

**Given** rows with `fecha_cierre` in past and future
**When** GET `/api/procesos?sort=closing_soon`
**Then** past-dated rows not in response; future rows ordered ascending

**Test file:** `src/__tests__/procesos-endpoint.test.ts`
**Framework:** vitest

<!-- Phase P5 removed — frontend behaviors live in the procesos-listing spec contracts -->
**Framework:** vitest + React Testing Library
