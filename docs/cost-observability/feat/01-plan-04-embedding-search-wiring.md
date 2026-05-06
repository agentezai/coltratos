# T4: Embedding + Search Wiring

## Scope

- `src/services/ingesta-secop/sync.ts` (or equivalent) — add `logEmbeddingEvent` after each embedding batch
- `src/app/api/search/route.ts` (or equivalent procesos-listing search handler) — add `logEmbeddingEvent` + `logSearchEvent`
- `src/app/api/search/click/route.ts` — new minimal route to append clicked `proceso_id` to `search_events`

## Changes

### Wire into ingesta-secop sync job

At the call site where `text-embedding-3-small` is called for a batch of `objeto_a_contratar` strings:

1. Record `started_at` before the OpenAI embeddings API call.
2. After the response, call:
   ```ts
   logEmbeddingEvent({
     company_id: null,               // system-driven sync
     use_case: 'sync',
     input_tokens: usage.total_tokens,
     model: 'text-embedding-3-small',
   });
   ```
3. Fire-and-forget; sync job continues.

If the sync processes rows in batches, one `logEmbeddingEvent` call per batch is acceptable
(aggregate token count across the batch). One call per row is also acceptable but noisier.

### Wire into procesos-listing search handler

After the vector + filter query executes and results are prepared:

1. Call `logEmbeddingEvent` for the query embedding:
   ```ts
   logEmbeddingEvent({
     company_id: session.company_id,
     use_case: 'search_query',
     input_tokens: queryEmbeddingUsage.total_tokens,
     model: 'text-embedding-3-small',
   });
   ```
2. Call `logSearchEvent`:
   ```ts
   logSearchEvent({
     company_id: session.company_id,
     query_text: query,              // truncated to 500 chars inside TelemetryLogger
     filters: { modalidad, cuantia_min, cuantia_max, entidad },
     result_count: results.length,
     clicked_ids: [],                // populated on click (see below)
   });
   ```
3. Store the returned `search_event_id` (if available from the insert response) in a short-lived
   session cookie or return it to the client so that click events can reference it.

### Click endpoint (`/api/search/click`)

- Accepts `POST { search_event_id: uuid, proceso_id: uuid }`.
- Uses service-role client to append `proceso_id` to `search_events.clicked_ids`:
  ```sql
  UPDATE search_events
  SET clicked_ids = array_append(clicked_ids, $proceso_id)
  WHERE id = $search_event_id AND company_id = <caller's company_id>
  ```
- This is the one UPDATE path on `search_events` — acceptable because `clicked_ids` is
  cumulative state, not an immutable event field.
- Returns `{ ok: true }`. Failures return HTTP 500 but do not surface errors to the user.

### Design Rationale (Minimal Surface)

Click tracking via a small POST endpoint keeps the wiring self-contained and avoids complex
client-side batching. `search_events` is the only telemetry table with an UPDATE path, and
it is scoped to a single array-append column.

## Dependencies

Requires T2 — `logEmbeddingEvent` and `logSearchEvent` must be exported from `src/lib/telemetry/` before wiring.

## Done When

- [ ] `logEmbeddingEvent` is called after each embedding batch in the ingesta-secop sync job with `use_case: 'sync'`
- [ ] `logEmbeddingEvent` is called after the query embedding in the procesos-listing search handler with `use_case: 'search_query'`
- [ ] `logSearchEvent` is called in the procesos-listing search handler with correct `result_count` and `clicked_ids: []`
- [ ] `/api/search/click` route exists and appends `clicked_ids` to `search_events` via service-role client
- [ ] TypeScript compiles without errors
- [ ] Existing procesos-listing and ingesta-secop tests pass (mock the telemetry module)
