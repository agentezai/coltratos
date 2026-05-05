# T10: Create pdf_pages Table with Composite PK and RLS

## Scope

- `supabase/migrations/20260504000010_pdf_pages.sql` — create `pdf_pages` table, btree index on FK, RLS policy via join chain, `ENABLE ROW LEVEL SECURITY`

## Changes

### Table DDL

```sql
CREATE TABLE pdf_pages (
  pliego_upload_id uuid NOT NULL REFERENCES pliego_uploads(id) ON DELETE CASCADE,
  page_number int NOT NULL CHECK (page_number >= 1),
  text text NOT NULL DEFAULT '',
  tables jsonb NOT NULL DEFAULT '[]',
  extraction_method text NOT NULL CHECK (extraction_method IN ('text_layer','ocr','table_parser','empty')),
  confidence numeric(5,4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  flags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pliego_upload_id, page_number)
);

CREATE INDEX pdf_pages_pliego_upload_id_idx
  ON pdf_pages (pliego_upload_id);

ALTER TABLE pdf_pages ENABLE ROW LEVEL SECURITY;
```

### RLS policy (RN-018)

```sql
CREATE POLICY pdf_pages_tenant_read
  ON pdf_pages
  FOR SELECT
  TO authenticated
  USING (
    pliego_upload_id IN (
      SELECT id FROM pliego_uploads
      WHERE uploaded_by_company_id = (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Writes are by the pdf-ingestion service via service-role; no INSERT/UPDATE policy for authenticated.
```

### Per-page upsert pattern (RN-017)

The `pdf-ingestion` service uses upsert on the composite PK:

```sql
INSERT INTO pdf_pages (pliego_upload_id, page_number, text, tables, extraction_method, confidence, flags)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (pliego_upload_id, page_number) DO UPDATE SET
  text = EXCLUDED.text,
  tables = EXCLUDED.tables,
  extraction_method = EXCLUDED.extraction_method,
  confidence = EXCLUDED.confidence,
  flags = EXCLUDED.flags;
```

This makes partial-retry idempotent: re-ingesting only failed pages does not require deleting the rest of the document.

### Empty pages MUST NOT be silently dropped

Per RN-017 and the integrations.md PDF-handling convention (quality bar #5), pages with no extractable content are inserted with:

```sql
text = '', extraction_method = 'empty', flags = ARRAY['no_text_extracted']
```

## Design Rationale

Composite PK on `(pliego_upload_id, page_number)` gives the upsert idempotency without an extra synthetic UUID column. The btree on `pliego_upload_id` covers the dominant query "give me all pages of upload X". No GIN index on `tables` — extracted-table JSONB is fetched by row ID, not searched (per ADR-013).

The RLS join chain through `pliego_uploads.uploaded_by_company_id` mirrors the `requisitos`/`verdicts` pattern: the service-role writes from `pdf-ingestion` bypass RLS entirely, while user-facing reads (e.g., from `requisitos-extraction` reading source quotes) are scoped via the join.

## Dependencies

- T4 (`pliego_uploads` table created) — required for FK and RLS join chain
- T6 (RLS infrastructure: `get_my_company_id()` SECURITY DEFINER function exists) — required for the policy `USING` clause to be efficient (the inner subquery references `users` and `pliego_uploads` directly per RN-018; if T6 introduces `get_my_company_id()`, the policy MAY use it instead — implementer decides at Execute time, both forms are equivalent)

## Done When

- [ ] `supabase/migrations/20260504000010_pdf_pages.sql` exists and applies cleanly after T1–T9
- [ ] `pdf_pages` table exists with composite PK `(pliego_upload_id, page_number)`
- [ ] `extraction_method` CHECK accepts `'text_layer'`, `'ocr'`, `'table_parser'`, `'empty'`; rejects others
- [ ] `confidence` CHECK accepts `NULL`, `0.0`, `1.0`; rejects `1.5`
- [ ] Composite PK rejects duplicate `(pliego_upload_id = X, page_number = 1)` insert
- [ ] `INSERT ... ON CONFLICT (pliego_upload_id, page_number) DO UPDATE` succeeds and updates the row
- [ ] CASCADE delete: deleting a `pliego_uploads` row removes all its `pdf_pages` rows
- [ ] btree index `pdf_pages_pliego_upload_id_idx` exists in `pg_indexes`
- [ ] `relrowsecurity = true` for `pdf_pages` in `pg_class`
- [ ] As user_a: `SELECT count(*) FROM pdf_pages` returns only company A's pages (via join chain to `pliego_uploads`)
- [ ] Service-role insert into `pdf_pages` succeeds without RLS filtering
