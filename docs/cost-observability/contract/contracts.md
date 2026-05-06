# TDD Contract: cost-observability

Framework: **Vitest**. Mock Supabase client via `vi.mock('../../lib/supabase/server')`.
Integration tests that hit a real DB are marked `[integration]` — run against local Supabase.

---

## Task T1: Schema Migration

### Behavior: analysis_events CHECK rejects unknown event_type (AC-001) [integration]

**Given** migration `2026050500000_telemetry_tables.sql` applied to local Supabase  
**When** `INSERT INTO analysis_events (..., event_type, ...) VALUES (..., 'invalid', ...)`  
**Then** Postgres rejects with a CHECK constraint violation

**Test file:** `src/__tests__/telemetry/migration.test.ts`

---

### Behavior: embedding_events accepts NULL company_id (AC-002, RN-003) [integration]

**Given** migration applied  
**When** `INSERT INTO embedding_events (company_id, use_case, input_tokens, cost_usd, model) VALUES (NULL, 'sync', 500, 0.00001, 'text-embedding-3-small')`  
**Then** insert succeeds; row retrievable via service-role client

**Test file:** `src/__tests__/telemetry/migration.test.ts`

---

### Behavior: RLS blocks member user from reading analysis_events (AC-004, RN-009) [integration]

**Given** authenticated user with `role = 'member'`  
**When** `SELECT * FROM analysis_events`  
**Then** zero rows returned

**Test file:** `src/__tests__/telemetry/migration.test.ts`

---

## Task T2: TelemetryLogger Module

### Behavior: computeAnalysisCost returns correct USD value (AC-008, RN-006)

**Given** `PRICING.CLAUDE_SONNET_INPUT_PER_M`, `CACHE_READ_PER_M`, `OUTPUT_PER_M` defined  
**When** `computeAnalysisCost({ inputTokens: 1000, cachedTokens: 500, outputTokens: 200 })`  
**Then** result equals `(500 × INPUT_PRICE + 500 × CACHE_READ_PRICE + 200 × OUTPUT_PRICE) / 1_000_000`, rounded to 6 decimal places

**Test file:** `src/__tests__/telemetry/pricing.test.ts`

---

### Behavior: computeEmbeddingCost returns correct USD value (AC-008, RN-006)

**Given** `PRICING.TEXT_EMBEDDING_3_SMALL_PER_K` defined  
**When** `computeEmbeddingCost({ inputTokens: 300 })`  
**Then** result equals `(300 × EMBEDDING_PRICE) / 1_000`, rounded to 6 decimal places

**Test file:** `src/__tests__/telemetry/pricing.test.ts`

---

### Behavior: PRICING constant has Last-updated comment (AC-007)

**Given** `src/lib/telemetry/pricing.ts` read as string  
**When** content searched for `// Last updated:`  
**Then** comment found

**Test file:** `src/__tests__/telemetry/pricing.test.ts`

---

### Behavior: logAnalysisEvent does not throw on Supabase failure (AC-006, RN-005)

**Given** Supabase mock rejects insert with network error  
**When** `logAnalysisEvent({ analysis_id, event_type: 'extraction', stage: 'extraction', started_at, completed_at, input_tokens: 100, output_tokens: 50, cached_tokens: 30, model: 'claude-sonnet-4-6' })`  
**Then** function returns without throwing  
**And** `console.error` called with message containing `'[telemetry] logAnalysisEvent failed'`

**Test file:** `src/__tests__/telemetry/logger.test.ts`

---

### Behavior: logSearchEvent truncates query_text to 500 chars (NFR-02)

**Given** `query_text` of 600 characters  
**When** `logSearchEvent({ company_id, query_text: longString, filters: {}, result_count: 5, clicked_ids: [] })`  
**Then** Supabase insert called with `query_text.length === 500`

**Test file:** `src/__tests__/telemetry/logger.test.ts`

---

## Task T3: Analysis Pipeline Wiring

### Behavior: logAnalysisEvent called once per successful extraction LLM call (AC-009)

**Given** `logAnalysisEvent` mocked via `vi.mock('../../lib/telemetry')`  
**When** extraction pipeline processes one pliego with one successful LLM call  
**Then** `logAnalysisEvent` called exactly once with `event_type: 'extraction'`

**Test file:** `src/__tests__/services/requisitos-extraction/extractor.test.ts`

---

### Behavior: logAnalysisEvent called twice when repair retry fires (AC-009, RN-007 / BR-007)

**Given** `logAnalysisEvent` mocked; extraction configured to trigger repair retry  
**When** extraction pipeline runs with a schema-validation-failing first response  
**Then** `logAnalysisEvent` called twice: `event_type: 'extraction'` then `event_type: 'repair_retry'`

**Test file:** `src/__tests__/services/requisitos-extraction/extractor.test.ts`

---

### Behavior: logAnalysisEvent called with event_type 'matching' after semáforo run (AC-010)

**Given** `logAnalysisEvent` mocked  
**When** `runSemaforoMatching(requisitos, profile)` completes  
**Then** `logAnalysisEvent` called with `event_type: 'matching'` and `model: 'deterministic'`

**Test file:** `src/__tests__/services/semaforo-aggregation/aggregator.test.ts`

---

## Task T4: Embedding + Search Wiring

### Behavior: logEmbeddingEvent called with use_case 'sync' per batch (AC-011)

**Given** `logEmbeddingEvent` mocked; sync job processes batch of 50 Procesos  
**When** sync job calls OpenAI embeddings API for the batch  
**Then** `logEmbeddingEvent` called with `use_case: 'sync'` and `company_id: null`

**Test file:** `src/__tests__/services/ingesta-secop/sync.test.ts`

---

### Behavior: logSearchEvent called with correct result_count on search (AC-012)

**Given** `logSearchEvent` mocked; search handler returns 8 results  
**When** procesos-listing search handler invoked  
**Then** `logSearchEvent` called with `result_count: 8` and `clicked_ids: []`

**Test file:** `src/__tests__/app/api/search/route.test.ts`

---

### Behavior: click endpoint appends proceso_id to search_events.clicked_ids (AC-013) [integration]

**Given** `search_events` row with `id = SE1` and `clicked_ids = []` in dev DB  
**When** `POST /api/search/click` with `{ search_event_id: SE1, proceso_id: P1 }`  
**Then** `search_events` row `SE1` has `clicked_ids = [P1]`

**Test file:** `src/__tests__/app/api/search/click.test.ts`

---

## Task T5: Admin Dashboard

### Behavior: route returns 403 for non-admin user (AC-014, NFR-05)

**Given** authenticated user with `role = 'member'`  
**When** `GET /admin/observability`  
**Then** HTTP 403; no telemetry data in response body

**Test file:** `src/__tests__/app/admin/observability/auth.test.ts`

---

### Behavior: getCostMetrics returns correct per-analysis sum (AC-015) [integration]

**Given** 5 `analyses` rows, each with 2 `analysis_events` rows with known `cost_usd` values  
**When** `getCostMetrics(30)` called  
**Then** returned array sums `cost_usd` per `analysis_id` correctly; worst-10 ordering correct

**Test file:** `src/__tests__/lib/telemetry/queries.test.ts`

---

### Behavior: getLatencyMetrics returns p50/p95 grouped by stage (AC-016) [integration]

**Given** 20 `analysis_events` rows with known `started_at`/`completed_at` across `extraction` and `matching` stages  
**When** `getLatencyMetrics(30)` called  
**Then** rows contain `stage`, `p50`, `p95` matching the known distribution

**Test file:** `src/__tests__/lib/telemetry/queries.test.ts`

---

## Task T6: Alert Cron

### Behavior: cron route returns 401 without CRON_SECRET (AC-020)

**Given** `CRON_SECRET = 'test-secret'` in env  
**When** `POST /api/cron/alert-check` with no `Authorization` header  
**Then** HTTP 401

**Test file:** `src/__tests__/app/api/cron/alert-check.test.ts`

---

### Behavior: runAlertCheck fires notification when cost_usd > 0.04 (AC-021)

**Given** notification dispatch mocked; `analyses` row with `cost_usd = 0.05` in last 24 h  
**When** `runAlertCheck()` called  
**Then** notification dispatch called with payload containing the breaching `analysis_id`

**Test file:** `src/__tests__/lib/telemetry/alerts.test.ts`

---

### Behavior: runAlertCheck fires notification when p95 latency > 480 s (AC-022)

**Given** notification dispatch mocked; p95 extraction latency = 600 s in last 24 h  
**When** `runAlertCheck()` called  
**Then** notification dispatch called with payload referencing the latency breach

**Test file:** `src/__tests__/lib/telemetry/alerts.test.ts`

---

### Behavior: runAlertCheck does not notify when no threshold breached (AC-023)

**Given** all `analyses` in last 24 h have `cost_usd <= 0.04` and p95 latency <= 480 s  
**When** `runAlertCheck()` called  
**Then** notification dispatch NOT called; function returns `{ breaches: [] }`

**Test file:** `src/__tests__/lib/telemetry/alerts.test.ts`

---

## Task T7: Pipeline writes typed columns to analyses

### Behavior: verdict counts written and sum to requisito_count (TC-013, REQ-016, RN-011)

**Given** an analysis run extracts 10 requisitos: 6 verde, 3 amarillo, 1 rojo  
**When** the pipeline completes and writes the analysis result to `analyses`  
**Then** `count_verde = 6`, `count_amarillo = 3`, `count_rojo = 1`, `requisito_count = 10`  
**And** `count_verde + count_amarillo + count_rojo = requisito_count`

**Test file:** `src/__tests__/services/semaforo-aggregation/aggregator.test.ts`  
**Framework:** Vitest + Supabase integration test client

---

### Behavior: extraction_outcome set to 'success' when all requisitos extracted (TC-014, REQ-016)

**Given** an analysis run where all requisito categories return without error  
**When** the pipeline writes to `analyses`  
**Then** `analyses.extraction_outcome = 'success'`

**Test file:** `src/__tests__/services/requisitos-extraction/extractor.test.ts`  
**Framework:** Vitest + `vi.mock` for Supabase

---

### Behavior: extraction_outcome set to 'partial' when one category fails (TC-014, REQ-016)

**Given** an analysis run where one requisito category fails schema validation on second retry  
**When** the pipeline writes to `analyses`  
**Then** `analyses.extraction_outcome = 'partial'`

**Test file:** `src/__tests__/services/requisitos-extraction/extractor.test.ts`  
**Framework:** Vitest + `vi.mock`

---

### Behavior: pliego_sha256 denormalized correctly onto analysis_events (TC-015, REQ-001, RN-010)

**Given** a `pliego_uploads` row with `file_sha256 = 'abc123...'` and associated `analyses` row  
**When** the pipeline inserts an `analysis_events` row for that analysis  
**Then** `analysis_events.pliego_sha256 = 'abc123...'`

**Test file:** `src/__tests__/services/requisitos-extraction/extractor.test.ts`  
**Framework:** Vitest + Supabase integration test client

---

### Behavior: Extraction Quality dashboard excludes NULL extraction_outcome rows (TC-017, RN-011)

**Given** 5 `analyses` rows in dev DB: 3 with `extraction_outcome` set, 2 with `extraction_outcome IS NULL`  
**When** `getExtractionQualityMetrics(30)` called  
**Then** returned denominator = 3, not 5 — NULL rows excluded from percentage calculation

**Test file:** `src/__tests__/lib/telemetry/queries.test.ts`  
**Framework:** Vitest + Supabase integration test client

---

## Task T5 (addendum): Click-through rate

### Behavior: click-through rate computed correctly (TC-016, REQ-013)

**Given** 10 `search_events` rows: 4 with non-empty `clicked_ids`, 6 with `clicked_ids = '{}'`  
**When** `getDiscoveryMetrics()` called  
**Then** `clickThroughRate = 0.4` (4/10)

**Test file:** `src/__tests__/lib/telemetry/queries.test.ts`  
**Framework:** Vitest + Supabase integration test client
