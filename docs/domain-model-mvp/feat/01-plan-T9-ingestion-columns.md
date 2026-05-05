# T9: Add Ingestion Lifecycle Columns to pliego_uploads

## Scope

- `supabase/migrations/20260504000009_pliego_uploads_ingestion.sql` — `ALTER TABLE` adding 4 columns and their CHECK constraints to `pliego_uploads`

## Changes

### Schema additions

```sql
ALTER TABLE pliego_uploads
  ADD COLUMN ingestion_status text NOT NULL DEFAULT 'pending'
    CHECK (ingestion_status IN ('pending','running','completed','failed')),
  ADD COLUMN ingestion_started_at timestamptz,
  ADD COLUMN ingestion_completed_at timestamptz,
  ADD COLUMN ingestion_failure_reason text
    CHECK (
      ingestion_failure_reason IS NULL
      OR ingestion_failure_reason IN (
        'pdf_unreadable',
        'ocr_timeout',
        'page_limit_exceeded',
        'encrypted_pdf',
        'unknown'
      )
    );
```

### Lifecycle ownership

The `pdf-ingestion` service is the **sole writer** of these four columns. No other service (including `pliego-upload`, `requisitos-extraction`, `semaforo-aggregation`, or any future service) updates them. This is enforced by convention — see RN-016. Initial state on `pliego_uploads` INSERT: `ingestion_status = 'pending'` (default), all timestamp/reason columns `NULL`.

Allowed transitions (RN-016):
- `pending → running` (ingestion service starts: sets `ingestion_started_at = now()`)
- `running → completed` (ingestion service succeeds: sets `ingestion_completed_at = now()`)
- `running → failed` (ingestion service fails: sets `ingestion_completed_at = now()`, `ingestion_failure_reason = <vocab>`)

Re-ingestion is NOT a backwards transition: a new `pliego_uploads` row is inserted instead.

## Design Rationale

Lifecycle columns live on `pliego_uploads` (not a separate `pdf_ingestions` table) because there is exactly one ingestion run per upload — re-ingestion creates a new upload row. Adding columns avoids an unnecessary join for the common "what's the status of my upload" query. The controlled-vocabulary CHECK on `ingestion_failure_reason` keeps observability stable: ops dashboards can `GROUP BY ingestion_failure_reason` without worrying about free-text drift.

## Dependencies

- T4 (`pliego_uploads` table created) — required, this migration alters that table
- T6 (RLS already enabled on `pliego_uploads`) — no change needed; new columns inherit existing RLS

## Done When

- [ ] `supabase/migrations/20260504000009_pliego_uploads_ingestion.sql` exists and applies cleanly after T1–T8
- [ ] `INSERT INTO pliego_uploads (...) VALUES (..., 'queued')` for `ingestion_status` is rejected by CHECK
- [ ] `INSERT INTO pliego_uploads (...) VALUES (..., 'something_broke')` for `ingestion_failure_reason` is rejected by CHECK
- [ ] `INSERT INTO pliego_uploads (...) VALUES (..., 'pdf_unreadable')` for `ingestion_failure_reason` succeeds
- [ ] All four valid `ingestion_status` values (`'pending'`, `'running'`, `'completed'`, `'failed'`) accepted
- [ ] All five valid `ingestion_failure_reason` vocab values accepted; `NULL` accepted (default)
- [ ] Existing seeded `pliego_uploads` rows have `ingestion_status = 'pending'` after migration
- [ ] `\d pliego_uploads` confirms 4 new columns with correct types and defaults
