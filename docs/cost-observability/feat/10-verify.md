# Verification Plan — cost-observability

## T1: Schema Migration

### Test Scenarios
- Apply migration to a fresh Supabase dev project; verify all three tables exist with correct columns and CHECK constraints.
- Insert a row into `analysis_events` with `event_type = 'invalid_type'`; verify CHECK constraint rejects it.
- Insert a row into `embedding_events` with `use_case = 'invalid'`; verify CHECK constraint rejects it.
- Insert an `embedding_events` row with `company_id = NULL`; verify it succeeds.
- As an authenticated pilot user (role = 'member'), query `SELECT * FROM analysis_events`; verify zero rows returned (RLS).
- As an authenticated pilot user, query `SELECT * FROM search_events`; verify zero rows returned.
- Verify all specified btree indexes exist via `pg_indexes`.

### Gate Criteria
Migration applies cleanly. All CHECK constraints and RLS policies behave as specified. TypeScript types compile without errors.

---

## T2: TelemetryLogger Module

### Test Scenarios
- Call `computeAnalysisCost({ inputTokens: 1000, cachedTokens: 500, outputTokens: 200 })` and verify the result matches the formula using `PRICING` values (TC-002).
- Call `computeEmbeddingCost({ inputTokens: 300 })` and verify the result matches the formula (TC-003).
- Mock the Supabase client to throw on insert; call `logAnalysisEvent(validPayload)`; verify no exception is thrown and `console.error` was called (TC-001).
- Call `logSearchEvent` with `query_text` of 600 characters; verify the inserted row's `query_text` is 500 characters.
- Verify `PRICING` constant has a `// Last updated:` comment with a date.

### Gate Criteria
All unit tests pass. No throw on Supabase failure. Cost formulas produce correct results. `npm run test` passes for `src/__tests__/telemetry/`.

---

## T3: Analysis Pipeline Wiring

### Test Scenarios
- Run a test extraction with a mocked Anthropic response; verify `logAnalysisEvent` is called once with `event_type: 'extraction'`.
- Run a test extraction that triggers a repair retry; verify `logAnalysisEvent` is called twice (once per LLM call).
- Run `runSemaforoMatching` in test; verify `logAnalysisEvent` is called once with `event_type: 'matching'` and `model: 'deterministic'`.
- Simulate a telemetry write failure during extraction; verify the extraction result is unaffected.

### Gate Criteria
All existing requisitos-extraction and semaforo-aggregation tests continue to pass. New telemetry calls are added without changing function signatures or return types.

---

## T4: Embedding + Search Wiring

### Test Scenarios
- Mock OpenAI embedding response in the ingesta-secop sync; verify `logEmbeddingEvent` is called with `use_case: 'sync'` and correct token count.
- Mock the search handler; verify `logEmbeddingEvent` is called with `use_case: 'search_query'` and `logSearchEvent` is called with `result_count` matching the mocked result list length.
- POST `{ search_event_id, proceso_id }` to `/api/search/click`; verify `search_events.clicked_ids` is updated (integration test against dev DB).
- POST `/api/search/click` with a `search_event_id` belonging to a different company; verify update is rejected (RLS via company_id check in the route handler).

### Gate Criteria
`logEmbeddingEvent` is called in both sync and search paths. `logSearchEvent` is called on every search. Click endpoint appends correctly. Existing procesos-listing tests pass.

---

## T5: Admin Dashboard

### Test Scenarios
- Authenticate as a user with `role = 'member'` and request `GET /admin/observability`; verify HTTP 403 is returned (TC-008).
- Authenticate as a user with `role = 'admin'` and request `GET /admin/observability`; verify HTTP 200 and all four sections render.
- Seed dev database with 20 analyses at various costs; load the dashboard and verify the worst-10 table includes the correct analyses.
- Load the dashboard with no data; verify all sections render without error (empty states).
- Measure page load time with `npm run dev` and seeded data; verify < 3s.

### Gate Criteria
Role guard works correctly. All four sections render with seeded data. Page loads in < 3s in development.

---

## T6: Alert Cron

### Test Scenarios
- POST `/api/cron/alert-check` without `Authorization: Bearer <CRON_SECRET>`; verify 401 (TC-009 precondition).
- Seed an `analyses` row with `cost_usd = 0.05`; POST the cron route; verify the alert fires (TC-009).
- Seed `analysis_events` rows producing p95 latency = 500s; POST the cron route; verify the alert fires (TC-010).
- Seed no threshold-breaching data; POST the cron route; verify 200 with `breaches: 0` and no notification.
- Verify `ALERT_RECIPIENTS` env var is read; if unset, verify a warning is logged and function returns normally.

### Gate Criteria
Cron authenticates correctly. Alert fires on both cost and latency breaches. No notification sent when no breach. `CRON_SECRET` env var prevents unauthorized invocation.

---

## End-to-End Verification

**Final acceptance test:**

1. Run a full analysis (pliego upload → extraction → semáforo matching) against the dev environment.
2. Verify `analysis_events` contains one row for the extraction LLM call, with `cost_usd` computed from actual token counts.
3. Verify `analysis_events` contains one row for the matching stage with `event_type: 'matching'` and `cost_usd = 0`.
4. Run a discovery search in the pilot UI; verify `embedding_events` has a new row with `use_case: 'search_query'` and `search_events` has a new row with the correct `result_count`.
5. Click a search result; verify `search_events.clicked_ids` is updated with the clicked `proceso_id`.
6. Load `/admin/observability` as admin; verify cost and latency sections show data from the test run.
7. Seed a high-cost analysis; run the alert cron manually; verify notification is dispatched.

**Gate Criteria:** All steps complete without errors. Telemetry data is present for each pipeline event. Dashboard renders correct aggregated values. Alert fires within 1 minute of cron invocation.
