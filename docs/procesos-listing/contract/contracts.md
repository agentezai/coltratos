# TDD Contract: procesos-listing

Write each failing test before implementing the corresponding behavior.

---

## Phase B1: Schema + Env Confirmation

**Note:** B1 has no migration SQL. Its contract confirms that domain-model-mvp rev 3 has landed and env vars are present. No DB-authoring tests here.

### Behavior: procesos_index has required columns (domain-model-mvp rev 3 gate)

**Given** the domain-model-mvp rev 3 migration has been applied
**When** `SELECT column_name FROM information_schema.columns WHERE table_name = 'procesos_index'`
**Then** result set includes `numero_proceso`, `entidad`, `objeto_a_contratar`, `modalidad`, `cuantia_proceso`, `fecha_limite_de_recepcion`, `embedding`, `synced_at`, `socrata_id`, `unspsc`, `ciudad`, `embedded_at`

**Test file:** `src/__tests__/b1-schema-gate.test.ts`
**Framework:** vitest (integration — requires live Supabase connection)

### Behavior: required env vars present in server context

**Given** the server environment is configured
**When** `process.env.SECOP_SODA_DATASET_ID` and `process.env.SECOP_SODA_TOKEN` are read
**Then** both are non-empty strings

**Test file:** `src/__tests__/b1-env-gate.test.ts`
**Framework:** vitest

---

## Phase B2: SODA Client + Mapper

### Behavior: mapper translates id_proceso → numero_proceso (REQ-001, RN-001)

**Given** a raw SODA row `{ id_proceso: 'CO1.BDOS.123', objeto_a_contratar: 'Software ERP', ... }`
**When** `mapSodaRow(rawRow)` is called
**Then** result has `numero_proceso: 'CO1.BDOS.123'` and no `id_proceso` key

**Test file:** `src/__tests__/secop-mapper.test.ts`
**Framework:** vitest

### Behavior: mapper normalizes all required fields

**Given** a raw SODA row with all expected SODA fields populated
**When** `mapSodaRow(rawRow)`
**Then** result has `entidad`, `objeto_a_contratar`, `modalidad`, `cuantia_proceso` (numeric), `fecha_de_publicacion_del_proceso` (ISO string), `fecha_limite_de_recepcion` (ISO string), `ciudad`

**Test file:** `src/__tests__/secop-mapper.test.ts`
**Framework:** vitest

### Behavior: mapper handles missing optional fields without throwing

**Given** a raw SODA row with `cuantia_proceso` absent
**When** `mapSodaRow(rawRow)`
**Then** result has `cuantia_proceso: null`; no throw

**Test file:** `src/__tests__/secop-mapper.test.ts`
**Framework:** vitest

### Behavior: SODA client returns mapped rows on 200

**Given** SODA API returns a 200 response with 3 rows
**When** `fetchOpenProcesos()` is called
**Then** returns an array of 3 mapped objects each with `numero_proceso` key

**Test file:** `src/__tests__/secop-client.test.ts`
**Framework:** vitest (mocked fetch)

### Behavior: SODA client throws on non-200

**Given** SODA API returns 503
**When** `fetchOpenProcesos()`
**Then** throws with message including the status code

**Test file:** `src/__tests__/secop-client.test.ts`
**Framework:** vitest (mocked fetch)

### Behavior: SOQL builder produces correct open-Procesos filter

**Given** no additional filter params
**When** `buildOpenProcesosQuery()`
**Then** returned SOQL string contains `estado = 'abierto'` or equivalent field filter per current dataset schema

**Test file:** `src/__tests__/secop-soql.test.ts`
**Framework:** vitest

---

## Phase B3: Cron Sync

### Behavior: cron route rejects missing CRON_SECRET (RN-006)

**Given** POST to `/api/cron/sync-secop` without `Authorization: Bearer <CRON_SECRET>` header
**When** handler executes
**Then** 401 response; no SODA call made; `procesos_index` unchanged

**Test file:** `src/__tests__/cron-sync.test.ts`
**Framework:** vitest (mocked SODA client)

### Behavior: cron upserts without creating duplicates (NFR-05)

**Given** `procesos_index` has a row with `numero_proceso='CO1.BDOS.X'`
**When** cron runs with SODA returning the same `numero_proceso` again
**Then** `procesos_index` still has exactly one row for `numero_proceso='CO1.BDOS.X'`

**Test file:** `src/__tests__/cron-sync.test.ts`
**Framework:** vitest (integration)

### Behavior: cron prunes closed Procesos

**Given** `procesos_index` has a row with `fecha_limite_de_recepcion` = 30 days ago
**When** cron sync runs (pruning step)
**Then** that row is deleted; rows with future `fecha_limite_de_recepcion` are retained

**Test file:** `src/__tests__/cron-sync.test.ts`
**Framework:** vitest (integration)

### Behavior: cron returns 200 with summary on SODA error (RN-006)

**Given** SODA API throws a network error
**When** cron handler catches the error
**Then** response is 200 with `{ ok: false, error: '...' }`; no unhandled exception

**Test file:** `src/__tests__/cron-sync.test.ts`
**Framework:** vitest (mocked SODA client that throws)

---

## Phase B4: Embeddings

### Behavior: only un-embedded rows are processed

**Given** `procesos_index` has 3 rows: 1 with `embedded_at=null`, 1 with `embedded_at` 1 day ago (objeto unchanged), 1 with `embedded_at` 1 day ago (objeto changed)
**When** `runEmbeddingSync()` executes
**Then** exactly 2 rows processed (the null-embedded and the changed one); 1 row skipped

**Test file:** `src/__tests__/secop-embeddings.test.ts`
**Framework:** vitest (mocked OpenAI client)

### Behavior: embedding_events written per batch

**Given** 5 rows to embed in one batch
**When** `runEmbeddingSync()` completes
**Then** one `embedding_events` row inserted: `use_case='sync'`, `company_id=null`, `input_tokens>0`, `cost_usd>0`, `model='text-embedding-3-small'`

**Test file:** `src/__tests__/secop-embeddings.test.ts`
**Framework:** vitest (mocked OpenAI, mocked TelemetryLogger)

### Behavior: embedding failure does not delete existing vectors

**Given** a row with an existing `embedding` and `embedded_at`
**When** OpenAI call fails for that row
**Then** the existing `embedding` and `embedded_at` values are preserved; error logged to stderr

**Test file:** `src/__tests__/secop-embeddings.test.ts`
**Framework:** vitest (mocked OpenAI that throws)

---

## Phase B5: `/api/procesos` Endpoint

### Behavior: vector search path used when q non-empty

**Given** `GET /api/procesos?q=consultoría+TI`
**When** handler executes
**Then** OpenAI embedding called for query; pgvector `<=>` used in SQL; `match_score` present on each result row

**Test file:** `src/__tests__/api-procesos.test.ts`
**Framework:** vitest (mocked OpenAI + Supabase)

### Behavior: structural path used when q absent

**Given** `GET /api/procesos?modalidad=Licitación+Pública`
**When** handler executes
**Then** no OpenAI call made; plain SQL `WHERE modalidad = 'Licitación Pública'`; `match_score=null` on all rows

**Test file:** `src/__tests__/api-procesos.test.ts`
**Framework:** vitest (mocked Supabase)

### Behavior: profile_match derives filters from company profile

**Given** `GET /api/procesos?profile_match=true` by a user whose company profile has `alcance_comercial.unspsc=['43']`
**When** handler executes
**Then** query includes `unspsc` filter derived from profile; no explicit `unspsc` param required from client

**Test file:** `src/__tests__/api-procesos.test.ts`
**Framework:** vitest (mocked Supabase)

### Behavior: search_events written on every request (REQ-004, RN-007)

**Given** any request to `GET /api/procesos`
**When** handler completes (success or partial)
**Then** `logSearchEvent` called with `query_text`, `filters`, `result_count`; `clicked_ids=[]` (initial insert)

**Test file:** `src/__tests__/api-procesos.test.ts`
**Framework:** vitest (spy on TelemetryLogger)

### Behavior: logEmbeddingEvent written on vector search query

**Given** `GET /api/procesos?q=software`
**When** handler completes
**Then** `logEmbeddingEvent` called with `use_case='search_query'`, `company_id=<authenticated company>`, `input_tokens>0`

**Test file:** `src/__tests__/api-procesos.test.ts`
**Framework:** vitest (spy on TelemetryLogger)

### Behavior: direct lookup returns 404 for unknown numero_proceso

**Given** `GET /api/procesos/UNKNOWN-ID` — not in `procesos_index`; SODA returns 0 rows
**When** handler executes
**Then** response status 404; body `{ error: 'not_found' }`

**Test file:** `src/__tests__/api-procesos-lookup.test.ts`
**Framework:** vitest (mocked Supabase + SODA)

---

## Phases T1 through T6 (Frontend)

The frontend TDD contracts from rev 2 (T1: Types + Filter State, T2: Fetch Hook, T3: Table Redesign, T4: Filter Bar, T5: Page Wiring, T6: Click Event Logging) remain valid and are not reproduced here. See the archived rev 2 contract section for full Given/When/Then details.
