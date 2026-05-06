# cost-observability — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Analysis Pipeline | Server-side code (requisitos-extraction, semaforo-aggregation) that runs extraction and matching |
| Sync Job | The ingesta-secop background process that syncs Procesos and computes embeddings |
| Search Handler | The procesos-listing server action handling user discovery queries |
| Coltratos Admin | Internal Coltratos engineering or product team member with `role = 'admin'` |
| Alert System | Scheduled cron that checks thresholds and fires notifications |

---

## User Stories

### US-01 — Log per-LLM-call metrics during analysis

**As** the analysis pipeline
**I want** to record token counts, cost, latency, and event type for every LLM call
**So that** per-analysis cost is attributable, verifiable against the $0.04 ceiling, and includes repair retries

### US-02 — Log pipeline stage latency

**As** the analysis pipeline
**I want** to emit a latency record for each stage (ingestion, extraction, matching)
**So that** p50/p95 latency per stage is computable and regressions are visible

### US-03 — Log per-embedding-call metrics

**As** the sync job and search handler
**I want** to record token count and cost for every `text-embedding-3-small` call
**So that** embedding costs are tracked separately and included in the observability dashboard

### US-04 — Log search queries and clicks

**As** the search handler
**I want** to record the query string, applied filters, result count, and clicked result IDs
**So that** the four discovery success metrics are computable from real data

### US-05 — View cost metrics

**As** a Coltratos admin
**I want** to see a histogram of per-analysis cost and a 7-day rolling average
**So that** I can verify the $0.04 ceiling is being met and spot outliers immediately

### US-06 — View latency and extraction-quality metrics

**As** a Coltratos admin
**I want** to see p50/p95 latency per stage and extraction success/partial/failure rates
**So that** I can detect performance regressions and extraction quality drift before pilots notice

### US-07 — View discovery success metrics

**As** a Coltratos admin
**I want** to see conversion rate, avg result count, discovery-vs-manual ratio, and catalog uniqueness
**So that** the 60-day pilot decision is based on numbers, not impressions

### US-08 — Receive same-day alert on threshold breach

**As** a Coltratos admin
**I want** to be alerted the same day when any analysis exceeds $0.04 or p95 latency exceeds 8 min
**So that** I can investigate before the next pilot session

---

## Use Case Scenarios

### UC-01 — Log per-analysis telemetry (US-01, US-02)

**Preconditions:** An `analyses` row with `id = A1` exists in state `extracting`. The analysis pipeline is running.

#### Main Scenario

1. Pipeline calls the Anthropic Sonnet API for requisito extraction.
2. API responds with token counts: `input_tokens`, `output_tokens`, `cached_tokens`.
3. Pipeline calls `logAnalysisEvent({ analysis_id: A1, event_type: 'extraction', stage: 'extraction', started_at, completed_at, input_tokens, output_tokens, cached_tokens, model: 'claude-sonnet-4-x' })`.
4. `TelemetryLogger` computes `uncached_tokens = input_tokens - cached_tokens` and `cost_usd` using the PRICING constant.
5. `TelemetryLogger` performs a fire-and-forget insert into `analysis_events`.
6. Pipeline continues regardless of insert outcome.
7. On matching stage completion, pipeline calls `logAnalysisEvent` with `event_type: 'matching'`, `stage: 'matching'`, and latency fields.

#### Alternative Scenarios

**3a. Schema validation fails on extraction; repair retry is invoked**
Pipeline calls `logAnalysisEvent` twice: once for the initial extraction call and once for the repair retry. Both rows are inserted into `analysis_events`.

**3b. OCR fallback is triggered for image-only pages**
Pipeline calls `logAnalysisEvent` with `event_type: 'ocr_fallback'` for each OCR API call made.

#### Error Scenarios

**5e. Supabase insert fails (network error, timeout)**
`TelemetryLogger` catches the error, writes a structured log line to `console.error`, and returns normally. The pipeline does not receive or handle the error.

**Postconditions:** `analysis_events` contains one or more rows for this analysis. `analyses.cost_usd` and `analyses.latency_ms` are updated by the pipeline's own logic (not by TelemetryLogger).

---

### UC-02 — Log embedding call telemetry (US-03)

**Preconditions:** Sync job is processing a batch of 500 newly fetched Procesos, or a search handler is computing a query embedding.

#### Main Scenario

1. Sync job calls OpenAI `text-embedding-3-small` for a batch of `objeto_a_contratar` strings.
2. OpenAI responds with token usage.
3. Sync job calls `logEmbeddingEvent({ company_id: null, use_case: 'sync', input_tokens, model: 'text-embedding-3-small' })`.
4. `TelemetryLogger` computes `cost_usd` and performs a fire-and-forget insert into `embedding_events`.

#### Alternative Scenarios

**1a. Search handler computes a query embedding**
`logEmbeddingEvent` is called with `{ company_id: <user's company_id>, use_case: 'search_query', input_tokens, model }`.

#### Error Scenarios

**4e. Insert fails**
Error is swallowed; sync job continues normally.

**Postconditions:** `embedding_events` contains one row per embedding API call.

---

### UC-03 — Log search query telemetry (US-04)

**Preconditions:** A pilot user has submitted a discovery search.

#### Main Scenario

1. Search handler executes the semantic + filter query against `procesos_index`.
2. Handler returns results to the client.
3. Handler calls `logSearchEvent({ company_id, query_text, filters, result_count, clicked_ids: [] })`.
4. Fire-and-forget insert into `search_events` with `clicked_ids = []`.
5. When the user clicks a result, the client calls a `/api/search/click` endpoint with the `proceso_id`.
6. Endpoint appends the clicked `proceso_id` to `search_events.clicked_ids` for the matching event (or logs a new event — implementation detail deferred to T3).

#### Alternative Scenarios

**3a. Query returns zero results**
`logSearchEvent` is called with `result_count = 0` and `clicked_ids = []`.

#### Error Scenarios

**4e. Insert fails**
Error is swallowed; search response is unaffected.

**Postconditions:** `search_events` has a row for this search session with final `clicked_ids`.

---

### UC-04 — View cost dashboard (US-05)

**Preconditions:** Coltratos admin is authenticated with `role = 'admin'` and navigates to `/admin/observability`.

#### Main Scenario

1. Admin loads the page.
2. Server-side route handler authenticates the user and checks `role = 'admin'`.
3. Handler queries `analysis_events` + `analyses` via service-role client.
4. Page renders: per-analysis cost histogram (30 days), 7-day rolling average, worst-10-analyses table.

#### Error Scenarios

**2e. User role is not admin**
Server returns HTTP 403. No telemetry data is included in the response.

**Postconditions:** Admin sees cost distribution. No pilot user data is exposed beyond what the admin role is entitled to.

---

### UC-05 — View latency and quality dashboard (US-06)

**Preconditions:** Same as UC-04.

#### Main Scenario

1. Server computes p50/p95 latency from `analysis_events` over the last 30 days, grouped by `stage`.
2. Server computes extraction-quality rates from `analyses.estado` values.
3. Page renders latency table and extraction-quality sparklines.

**Postconditions:** Admin can detect latency regressions and extraction failure drift.

---

### UC-06 — View discovery metrics dashboard (US-07)

**Preconditions:** Same as UC-04.

#### Main Scenario

1. Server queries `search_events` and `analyses` to compute:
   - Conversion rate: count(searches with at least one analysis started within 24 h of click) / count(all searches)
   - Avg result count: AVG(`result_count`) over last 30 days
   - Discovery-vs-manual ratio: count(analyses where `proceso_lookup_status = 'verified'` and `proceso_id IN procesos_index`) / count(all analyses)
   - Catalog uniqueness: COUNT(DISTINCT `proceso_id`) FROM `procesos_index`
2. Page renders four metric cards.

**Postconditions:** Admin has numerical basis for the pilot decision.

---

### UC-07 — Receive same-day alert (US-08)

**Preconditions:** Alert check cron is scheduled daily (or more frequently).

#### Main Scenario

1. Cron fires.
2. Alert checker queries: any `analyses` row in last 24 h with `cost_usd > 0.04`?
3. Alert checker queries: rolling p95 latency from `analysis_events` in last 24 h > 480 s?
4. If any condition is true, alert checker sends notification to the recipient list (env var `ALERT_RECIPIENTS`).

#### Alternative Scenarios

**4a. No threshold breached**
No notification is sent. Cron completes silently.

**4b. Slack webhook configured**
Notification body includes: analysis ID, cost_usd, breach type, timestamp.

#### Error Scenarios

**4e. Notification delivery fails**
Failure is logged to stderr. The analysis pipeline is unaffected.

**Postconditions:** Coltratos team receives same-day notification when a threshold is breached.

---

## UX/UI References

No user-facing UX. Internal admin route only. See [spec.md UX/UI section](./spec.md#uxui).
