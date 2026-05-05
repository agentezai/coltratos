# Verification Plan

## T1: Validation Utilities

### Test Scenarios
- `validatePdfClient`: rejects file > 25 MB with `FILE_TOO_LARGE`; rejects `text/plain` MIME with `INVALID_PDF`; accepts a 1 KB `application/pdf` file
- `validatePdfServer`: rejects buffer > 25 MB; rejects buffer starting with `PK\x03\x04` (ZIP/DOCX); accepts buffer starting with `%PDF-`
- `detectPasswordProtection`: returns `true` for a fixture encrypted PDF; returns `false` for a clean PDF; returns `false` on unexpected parse error (does not throw)
- Confirm `DECLARATION_TEXT` and `DECLARATION_TEXT_VERSION` are exported and match the spec values verbatim

### Gate Criteria
All unit tests in `src/__tests__/pliego-upload/validate.test.ts` pass. No Node.js imports present in `validatePdfClient`. TypeScript strict mode passes.

---

## T2: Storage Service + Policy

### Test Scenarios
- `uploadPliegoBuffer` called with a 512-byte buffer: Supabase Storage receives the call with correct key `companies/<id>/pliegos/<sha256>.pdf`
- Calling `uploadPliegoBuffer` twice with the same key (upsert): second call does not throw
- Storage client throws → `uploadPliegoBuffer` re-throws as `PliegoUploadError` with `error: 'SERVER_ERROR'`
- Storage RLS policy: user from company A cannot SELECT an object under `companies/B/…`; user from company A can SELECT their own object

### Gate Criteria
Migration applies cleanly (`supabase db reset`). Storage key format assertion passes. RLS policy test blocks cross-company reads.

---

## T3: DB RPC

### Test Scenarios
- First call with valid args: row inserted in `pliego_uploads` with correct `ingestion_status = 'pending'` and `declaration_accepted_at IS NOT NULL`; pgmq message dispatched; function returns `reused = false`
- Collision: second call with same `(proceso_id, company_id, sha256)`: no new row; pgmq message still dispatched; function returns `reused = true` with original `uploaded_at`
- pgmq failure (simulate by calling without pgmq extension): entire transaction rolls back; no row in `pliego_uploads`
- `authenticated` role calling the function directly returns permission denied
- `declaration_text_version = 'v1'` on all inserted rows

### Gate Criteria
Migration applies cleanly. Atomicity test (pgmq failure → row rollback) passes. EXECUTE privilege restricted to `service_role`.

---

## T4: API Route

### Test Scenarios
- Valid 1 MB PDF, valid session → HTTP 201, `pliego_upload_id` present, `reused: false`
- Valid PDF, no session → HTTP 401
- Buffer > 25 MB → HTTP 413, no storage write
- Buffer starting with `PK\x03\x04` (not PDF) → HTTP 422, `error: 'INVALID_PDF'`, no storage write
- Encrypted PDF fixture → HTTP 422, `error: 'ENCRYPTED_PDF'`, message contains `"protegido con contraseña"`, no storage write
- Collision: same PDF twice → first HTTP 201, second HTTP 200 with `reused: true`
- Verify `uploader_ip = null` when no `x-forwarded-for` header
- Verify `declaration_accepted_at` is a server timestamp (not the `declaration_timestamp` field sent by client)

### Gate Criteria
All scenarios return correct HTTP status codes and response shapes. No storage write occurs when validation fails. TypeScript and ESLint pass.

---

## T5: Upload Widget

### Test Scenarios
- Widget in `idle` state: submit button disabled; no file selected label shown
- File selected, declaration unchecked: submit button disabled
- File selected, declaration checked: submit button enabled
- File > 25 MB selected: client-side error shown immediately, no request sent
- Mock API returns 201: widget transitions to `success`, `onSuccess` called with correct payload
- Mock API returns 200 + `reused: true`: widget transitions to `success`, toast with date shown, `onSuccess` called
- Mock API returns 422 `ENCRYPTED_PDF`: widget transitions to `error`, message contains `"protegido con contraseña"`
- `reset()`: widget returns to `idle`, no file, no error
- Drop-zone drag event: triggers file selection correctly

### Gate Criteria
Unit tests for hook and widget pass with mocked API. No TypeScript errors. `onSuccess`/`onError` callbacks fire with correct types.

---

## T6: Integration

### Test Scenarios
- Happy path integration test: POST to `/api/pliego-uploads` with real PDF buffer → HTTP 201, row in `pliego_uploads`, pgmq message queued
- Collision integration test: POST same PDF twice → second call returns `reused: true`, one row total
- Unauthenticated request → HTTP 401
- Invalid PDF buffer → HTTP 422
- Oversized buffer → HTTP 413
- Page renders without errors: `procesoId` and `companyId` flow correctly into widget props
- Manual smoke: upload a real SECOP II pliego → `pliego_uploads.ingestion_status = 'pending'`

### Gate Criteria
All integration tests pass. `npm run build` succeeds. Manual smoke test confirms end-to-end upload → queue dispatch.

---

## End-to-End Verification

**Final acceptance test:**
1. Authenticate as a company user with a complete profile
2. Select an open Proceso (from discovery or direct ID entry)
3. Navigate to the analysis flow step 6 page
4. Confirm `PliegoUploadWidget` renders in `idle` state
5. Download a real pliego PDF from SECOP II; confirm it is ~2–8 MB and PDF format
6. Select the file in the widget; confirm filename + size shown; confirm submit button still disabled
7. Check the declaration checkbox; confirm submit button becomes enabled
8. Click upload; confirm state transitions: `validating → uploading → dispatching → success`
9. Check Supabase DB: `pliego_uploads` row exists with `ingestion_status = 'pending'`, `file_sha256` non-null, `declaration_accepted_at` non-null
10. Check pgmq: message exists in `pdf_ingestion_queue` with correct `pliego_upload_id`
11. Re-upload the same file: confirm `reused: true` toast appears, confirm only one `pliego_uploads` row for that hash

**Gate Criteria:** All 11 steps complete without errors. Row and queue message confirmed in DB. Toast fires on re-upload.
