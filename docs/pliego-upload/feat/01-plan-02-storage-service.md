# T2: Storage Service + Bucket Policy

## Scope

- `src/services/pliego-upload/storage.ts` — Supabase Storage upload function
- `supabase/migrations/20260504000010_pliego_storage_policy.sql` — bucket creation + storage RLS policy

## Changes

### Storage service (`src/services/pliego-upload/storage.ts`)

- Export `uploadPliegoBuffer(buffer: Buffer, companyId: string, sha256: string): Promise<string>`
  - Constructs storage key: `companies/${companyId}/pliegos/${sha256}.pdf`
  - Calls Supabase Storage service-role client `.storage.from('pliegos').upload(key, buffer, { contentType: 'application/pdf', upsert: true })`
  - `upsert: true` makes the storage write idempotent for the hash-collision path (same key = overwrite with identical bytes)
  - On error, throws a typed `PliegoUploadError` with `error: 'SERVER_ERROR'` and the Supabase error message
  - Returns the `file_storage_key` string
- Uses the service-role Supabase client (bypasses storage RLS for server-side writes)
- MUST NOT be imported by browser code — server-only module

### Storage bucket + RLS migration (`supabase/migrations/20260504000010_pliego_storage_policy.sql`)

```sql
-- Create the pliegos bucket if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pliegos',
  'pliegos',
  false,
  26214400, -- 25 MB in bytes (defense in depth at storage layer)
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Company can read their own pliegos
-- Path: companies/<company_id>/pliegos/<sha256>.pdf
-- split_part extracts the second segment (company_id) from the path
CREATE POLICY "company_read_own_pliegos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'pliegos'
  AND split_part(name, '/', 2)::uuid = (
    SELECT company_id FROM public.users WHERE id = auth.uid()
  )
);

-- Service-role client handles all writes (INSERT/UPDATE/DELETE).
-- No user-facing write policy is needed — authenticated users never write directly.
```

### Design Rationale (SRP)

The storage layer is isolated from validation and DB logic. The only responsibility here is: given a validated buffer and its audit metadata, put the bytes in storage and confirm the key. The RLS policy is co-located with the bucket creation so the two are never out of sync.

## Dependencies

Requires T1 — imports `PliegoUploadError` from `lib/pliego-upload/types.ts`.

## Done When

- [ ] `uploadPliegoBuffer` uploads a buffer and returns the correct storage key string
- [ ] `uploadPliegoBuffer` throws `PliegoUploadError` on Supabase Storage error
- [ ] Storage key format is `companies/<companyId>/pliegos/<sha256>.pdf` (verified in unit test with spy)
- [ ] Migration applies cleanly on a fresh Supabase project (`supabase db reset` passes)
- [ ] Storage RLS policy blocks reads by a user from a different company (verified via seed + read test)
- [ ] Bucket `file_size_limit` is set to 26214400 bytes
- [ ] TypeScript compiles with no errors
