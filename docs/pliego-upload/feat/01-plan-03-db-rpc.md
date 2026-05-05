# T3: DB RPC — dispatch_pliego_upload

## Scope

- `supabase/migrations/20260504000011_dispatch_pliego_upload_rpc.sql` — stored procedure + REVOKE/GRANT

## Changes

### Stored procedure

```sql
CREATE OR REPLACE FUNCTION public.dispatch_pliego_upload(
  p_proceso_id             uuid,
  p_company_id             uuid,
  p_sha256                 text,
  p_file_storage_key       text,
  p_uploader_ip            text,   -- nullable: best-effort from x-forwarded-for
  p_declaration_ts         text    -- ISO 8601; server-side clock, sent from API route
) RETURNS TABLE(pliego_upload_id uuid, reused boolean, uploaded_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id        uuid;
  v_reused    boolean := false;
  v_uploaded  timestamptz;
BEGIN
  -- Attempt insert; conflict on (proceso_id, uploaded_by_company_id, file_sha256) is reuse
  INSERT INTO public.pliego_uploads (
    proceso_id,
    uploaded_by_company_id,
    file_sha256,
    file_storage_key,
    uploader_ip,
    declaration_accepted_at,
    declaration_text_version,
    ingestion_status,
    status
  )
  VALUES (
    p_proceso_id,
    p_company_id,
    p_sha256,
    p_file_storage_key,
    p_uploader_ip,
    p_declaration_ts::timestamptz,
    'v1',
    'pending',
    'active'
  )
  ON CONFLICT (proceso_id, uploaded_by_company_id, file_sha256) DO NOTHING
  RETURNING id, uploaded_at INTO v_id, v_uploaded;

  -- On collision: fetch the existing row's id and uploaded_at
  IF v_id IS NULL THEN
    SELECT id, uploaded_at
      INTO v_id, v_uploaded
      FROM public.pliego_uploads
     WHERE proceso_id             = p_proceso_id
       AND uploaded_by_company_id = p_company_id
       AND file_sha256            = p_sha256;
    v_reused := true;
  END IF;

  -- Dispatch ingestion job — in the same transaction
  PERFORM pgmq.send(
    'pdf_ingestion_queue',
    json_build_object('pliego_upload_id', v_id)::text
  );

  RETURN QUERY SELECT v_id, v_reused, v_uploaded;
END;
$$;

-- Only the service role may call this function
REVOKE EXECUTE ON FUNCTION public.dispatch_pliego_upload FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dispatch_pliego_upload FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.dispatch_pliego_upload TO service_role;
```

### Notes

- `SECURITY DEFINER` allows the function to write to `pliego_uploads` and call `pgmq.send` as the definer (service role), bypassing the caller's RLS context
- `SET search_path = public` prevents search-path injection
- The `ON CONFLICT DO NOTHING` pattern combined with the follow-up SELECT is intentional — it avoids a `DO UPDATE` that would mutate an existing row's audit fields
- `p_declaration_ts` is sent as ISO 8601 from the API route using the server clock; the client checkbox timestamp is not trusted

### Design Rationale (SRP)

This function owns exactly one concern: atomically record the upload intent and trigger the ingestion job. All validation, storage, and presentation logic live elsewhere. Keeping the pgmq dispatch inside this transaction is the key invariant — no row should exist without a corresponding queue message.

## Dependencies

None — depends only on `pliego_uploads` table and `pgmq` extension, both from `domain-model-mvp`.

## Done When

- [ ] Migration applies cleanly (`supabase db reset` passes)
- [ ] `dispatch_pliego_upload` inserts a row and dispatches pgmq message on first call
- [ ] `dispatch_pliego_upload` returns `reused = true` and existing `uploaded_at` on collision without inserting a new row
- [ ] `EXECUTE` privilege restricted to `service_role` only (verified via `\dp` in psql)
- [ ] Calling the function as `authenticated` role returns a permission error
- [ ] `ingestion_status = 'pending'` on newly inserted rows
- [ ] pgmq message payload contains `pliego_upload_id` as a UUID string
