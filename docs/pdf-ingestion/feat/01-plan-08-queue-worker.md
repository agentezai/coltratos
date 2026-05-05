# T8: Queue Worker — Idempotent Writeback

## Scope

- `src/services/ingestion-worker/index.ts` — new file: `processPliegoUpload(id)` — the worker entrypoint, invoked by the pgmq consumer
- `src/services/ingestion-worker/supabase-repository.ts` — new file: `SupabaseIngestionStatusRepository` implementing the `IngestionStatusRepository` port from T1
- `src/services/ingestion-worker/queue-consumer.ts` — new file: pgmq consumer process boilerplate
- `src/services/ingestion-worker/__tests__/idempotency.test.ts` — new file: comprehensive idempotency tests per REQ-019
- `src/services/ingestion-worker/__tests__/concurrency.test.ts` — new file: visibility-timeout / advisory-lock test
- `lib/ingestion/index.ts` — new file: barrel re-exports of the inner pipeline (assemble, errors, types) for the worker to consume

## Changes

### Public function (`processPliegoUpload`)

```typescript
export async function processPliegoUpload(pliego_upload_id: string): Promise<void>
```

Steps (per REQ-019):

1. **Status check at entry (REQ-019 (c)):**
   - Load the `pliego_uploads` row.
   - If `ingestion_status === 'completed'` → return early (no-op).
   - If `ingestion_status === 'running'` AND `Date.now() - ingestion_started_at < 10 minutes` → return early (deferred to in-flight worker).
   - If `ingestion_status === 'running'` AND last update older than 10 minutes → assume crash, proceed to reprocess.
   - Otherwise (`pending` or stale-`running` or `failed` re-attempt): proceed.
2. **Concurrency control (REQ-019 (d)):** EITHER rely on pgmq visibility timeout (default 30 minutes; documented in queue-consumer.ts), OR acquire a Postgres advisory lock keyed on `hashtext(pliego_upload_id::text)` before processing. **Choose ONE for MVP** — recommend pgmq visibility timeout for simplicity. Advisory lock is a fallback if pgmq visibility proves unreliable.
3. **Mark running:** call `repo.markRunning(id)` — sets `ingestion_status = 'running'`, `ingestion_started_at = now()`. **Upsert-shaped (REQ-019 (a))** — re-running this on a row that's already `running` does not error.
4. **Fetch pliego buffer (T2):** `fetchPliegoBuffer(id)` returns the PDF bytes.
5. **Run inner pipeline (T3 + T4 + T5 + T6):** call `assemble(textPages, runOcr, extractTables, rasterize)`. Result: `IngestionResult`.
6. **Write pages (REQ-019 (b)):** `repo.writePages(id, result.pages)` — uses `INSERT ... ON CONFLICT (pliego_upload_id, page_number) DO UPDATE` so re-delivery does not duplicate rows. Per `domain-model-mvp` RN-017.
7. **Mark completed:** `repo.markCompleted(id)` — sets `ingestion_status = 'completed'`, `ingestion_completed_at = now()`. Upsert-shaped.
8. **Ack queue message:** the pgmq consumer acks the message after `processPliegoUpload` returns successfully.

On thrown error from any step (after status check):

```typescript
catch (err) {
  const reason = mapErrorToFailureReason(err)  // T7
  await repo.markFailed(id, reason, err)  // sets ingestion_status='failed', ingestion_failure_reason=reason, ingestion_completed_at=now()
  // Re-throw or swallow? Swallow — the queue should not retry on these errors.
  // (Storage-fetch failures might be retried, but the simpler MVP rule: failures are terminal.)
}
```

### SupabaseIngestionStatusRepository

The Supabase implementation of the port from T1. Uses the service-role client. Methods:

- `loadStatus(id)`: `SELECT ingestion_status, ingestion_started_at FROM pliego_uploads WHERE id = $1`.
- `markRunning(id)`: `UPDATE pliego_uploads SET ingestion_status='running', ingestion_started_at=now() WHERE id = $1`. (Idempotent — no error if already running.)
- `writePages(id, pages)`: per-page upsert: `INSERT INTO pdf_pages (pliego_upload_id, page_number, text, tables, extraction_method, confidence, flags) VALUES ($1, ...) ON CONFLICT (pliego_upload_id, page_number) DO UPDATE SET text=EXCLUDED.text, ...`.
- `markCompleted(id)`: `UPDATE pliego_uploads SET ingestion_status='completed', ingestion_completed_at=now() WHERE id = $1`.
- `markFailed(id, reason, cause)`: `UPDATE pliego_uploads SET ingestion_status='failed', ingestion_failure_reason=$2, ingestion_completed_at=now() WHERE id = $1`. The `cause` is logged at the worker host (per worker-host logging convention) but not persisted — the failure_reason is the user-facing signal.

### Queue consumer

`src/services/ingestion-worker/queue-consumer.ts` is a long-running process that polls pgmq, dequeues messages, and invokes `processPliegoUpload`. Uses Supabase client's pgmq integration (or direct SQL `SELECT pgmq.read(...)`).

Visibility timeout: 30 minutes — long enough that a 200-page pliego (p95 <2 min) finishes well within window, short enough that a crashed worker's message returns to the queue.

### Idempotency tests (REQ-019)

The full T8 contract from REQ-019 verbatim becomes the test specification:

- **(a) Status writes are upserts keyed on `pliego_upload_id`.** Test: re-call `markRunning(id)` on an already-running row; assert no duplicate-key violation; final row count for this id is exactly 1.
- **(b) Page-row writes use upsert on `(pliego_upload_id, page_number)`.** Test: write 12 pages; re-deliver; write 12 pages again; assert `pdf_pages` count for this id is exactly 12.
- **(c) Status check at entry:**
  - Test C1: `ingestion_status='completed'` → `processPliegoUpload(id)` returns early, no inner-pipeline call (asserted via spy).
  - Test C2: `ingestion_status='running'`, `ingestion_started_at` 1 min ago → returns early.
  - Test C3: `ingestion_status='running'`, `ingestion_started_at` 15 min ago → reprocesses.
- **(d) Concurrency control:** test asserts pgmq visibility timeout is configured ≥ p95 ingestion time (30 min default), OR advisory-lock SQL appears in source. At least one of the two.

### Resumability is NOT in MVP scope

Per REQ-019: *Resumability (continuing from partial work after crash) is NOT required in MVP — full reprocess on retry is acceptable. Document as v1.1 candidate in suggestions.md.*

### Design Rationale

T8 is the orchestration layer. Every other task feeds into it. The idempotency contract is non-negotiable — without it, queue retries silently corrupt data.

## Dependencies

Requires T1 (types + port), T2 (storage fetch), T6 (inner pipeline), T7 (error mapping). Indirectly requires T3/T4/T5.

## Done When

- [ ] `processPliegoUpload(id)` exported from `src/services/ingestion-worker/index.ts`.
- [ ] `SupabaseIngestionStatusRepository` implements all 5 port methods; status writes are UPDATE (idempotent on row existence); page writes use ON CONFLICT upsert.
- [ ] All 6 idempotency tests pass (a, b, c1, c2, c3, d).
- [ ] Queue consumer starts cleanly and dequeues a test message in an integration test.
- [ ] Visibility timeout is configured ≥ 30 minutes (or advisory-lock SQL present).
- [ ] Files stay under 500 lines each.
