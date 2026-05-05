# T2: Storage Fetch

## Scope

- `src/services/ingestion-worker/fetch.ts` — new file: `fetchPliegoBuffer(id)` resolves a `pliego_upload_id` to a buffer downloaded from Supabase Storage at the per-tenant prefix
- `src/services/ingestion-worker/__tests__/fetch.test.ts` — new file: unit tests against a stub Supabase Storage client

## Changes

### Public function

`fetchPliegoBuffer(id: string): Promise<Buffer>`

Steps:
1. Look up the `pliego_uploads` row by `id` to obtain `uploaded_by_company_id` and `file_sha256`.
2. Compose the storage key: `companies/${uploaded_by_company_id}/pliegos/${file_sha256}.pdf`.
3. Download the object via the Supabase Storage service-role client (bypasses RLS — the service is trusted; user-facing read paths use a separate spec).
4. Optionally verify the SHA-256 of the downloaded bytes equals `file_sha256` — defense in depth against object-corruption (asserted in tests).
5. Return the buffer.

### Failure-mode mapping

- Pliego_uploads row missing → throw `Error('pliego_upload not found')` (precondition violation; not retryable).
- Storage object 404 / network failure → throw `StorageFetchFailedError(cause)`.

### Why this lives under `src/services/`, not `lib/`

This file imports `@supabase/supabase-js` and reads `process.env.SUPABASE_*`. Both are forbidden under `lib/ingestion/**` per NFR-03. The repository port (`IngestionStatusRepository`) lives in `lib/`; the storage fetch is a peer service in `src/services/ingestion-worker/`.

### Design Rationale

T2 is the seam between the worker and external storage. Keeping it small (~60 lines) and dependency-injected (the Supabase client is a constructor arg, not a global import) means tests can stub the client without filesystem mocks.

## Dependencies

Requires T1 (uses `StorageFetchFailedError`).

## Done When

- [ ] `fetchPliegoBuffer(id)` exported from `src/services/ingestion-worker/fetch.ts`.
- [ ] Happy path: stub returns buffer; SHA-256 round-trip asserted.
- [ ] 404: stub throws → `StorageFetchFailedError` with `cause` set.
- [ ] Storage key follows the per-tenant prefix `companies/<company_id>/pliegos/<sha256>.pdf` exactly (asserted via spy on the stub).
- [ ] File stays under 200 lines.
