# TDD Contract: pliego-upload

Markdown TDD guide for nybo-run. The Executor Agent reads this file and writes failing tests
before implementing each task (Red phase), then implements (Green), then refactors (Refactor).

---

## Task T1: Validation Utilities

### Behavior: validatePdfClient rejects files exceeding 25 MB (REQ-001)

**Given** a `File` object with `size = 26_214_401` bytes and `type = 'application/pdf'`
**When** `validatePdfClient(file)` is called
**Then** `result.valid === false` and `result.error.error === 'FILE_TOO_LARGE'`

**Test file:** `src/__tests__/pliego-upload/validate.test.ts`
**Framework:** vitest

---

### Behavior: validatePdfClient rejects non-PDF MIME type (REQ-001)

**Given** a `File` object with `size = 1024` and `type = 'text/plain'`
**When** `validatePdfClient(file)` is called
**Then** `result.valid === false` and `result.error.error === 'INVALID_PDF'`

**Test file:** `src/__tests__/pliego-upload/validate.test.ts`
**Framework:** vitest

---

### Behavior: validatePdfServer rejects buffer not starting with %PDF- (REQ-003)

**Given** a `Buffer` containing the bytes of a ZIP file (starts with `PK\x03\x04`)
**When** `validatePdfServer(buffer)` is called
**Then** `result.valid === false` and `result.error.error === 'INVALID_PDF'`

**Test file:** `src/__tests__/pliego-upload/validate.test.ts`
**Framework:** vitest

---

### Behavior: validatePdfServer rejects oversized buffer (REQ-004)

**Given** a `Buffer` of `26_214_401` bytes starting with `%PDF-`
**When** `validatePdfServer(buffer)` is called
**Then** `result.valid === false` and `result.error.error === 'FILE_TOO_LARGE'`

**Test file:** `src/__tests__/pliego-upload/validate.test.ts`
**Framework:** vitest

---

### Behavior: detectPasswordProtection returns true for encrypted PDF (REQ-005, RN-005)

**Given** a `Buffer` containing a password-protected PDF fixture (`tests/fixtures/pliegos/encrypted-sample.pdf`)
**When** `detectPasswordProtection(buffer)` is called
**Then** the return value is `true`

**Test file:** `src/__tests__/pliego-upload/validate.test.ts`
**Framework:** vitest

---

### Behavior: detectPasswordProtection returns false for clean PDF (REQ-005)

**Given** a `Buffer` containing a valid, unprotected PDF fixture
**When** `detectPasswordProtection(buffer)` is called
**Then** the return value is `false`

**Test file:** `src/__tests__/pliego-upload/validate.test.ts`
**Framework:** vitest

---

## Task T2: Storage Service + Policy

### Behavior: uploadPliegoBuffer constructs correct storage path (REQ-007, RN-006)

**Given** `companyId = 'company-uuid-123'` and `sha256 = 'abc123def'`
**When** `uploadPliegoBuffer(buffer, companyId, sha256)` is called
**Then** the Supabase Storage client is called with path `'companies/company-uuid-123/pliegos/abc123def.pdf'`
**And** the returned `file_storage_key` equals that path

**Test file:** `src/__tests__/pliego-upload/storage.test.ts`
**Framework:** vitest (spy on Supabase Storage client)

---

### Behavior: uploadPliegoBuffer throws PliegoUploadError on storage failure (REQ-007)

**Given** the Supabase Storage client throws an error
**When** `uploadPliegoBuffer(buffer, companyId, sha256)` is called
**Then** a `PliegoUploadError` with `error: 'SERVER_ERROR'` is thrown

**Test file:** `src/__tests__/pliego-upload/storage.test.ts`
**Framework:** vitest

---

## Task T3: DB RPC

### Behavior: dispatch_pliego_upload inserts row and dispatches pgmq message on first call (REQ-008, RN-004)

**Given** no existing `pliego_uploads` row for `(proceso_id, company_id, sha256)`
**When** `dispatch_pliego_upload(p_proceso_id, p_company_id, p_sha256, ...)` is called
**Then** a new `pliego_uploads` row exists with `ingestion_status = 'pending'` and `declaration_accepted_at IS NOT NULL`
**And** one pgmq message exists in `pdf_ingestion_queue` containing `pliego_upload_id`
**And** the function returns `reused = false`

**Test file:** SQL test in `supabase/tests/dispatch_pliego_upload_test.sql` (pgTAP) or vitest integration against local Supabase
**Framework:** vitest integration or pgTAP

---

### Behavior: dispatch_pliego_upload reuses existing row on collision (REQ-009, RN-003)

**Given** a `pliego_uploads` row already exists for `(proceso_id, company_id, sha256)` with `uploaded_at = T0`
**When** `dispatch_pliego_upload` is called again with the same args
**Then** no new `pliego_uploads` row is created
**And** a new pgmq message IS dispatched with the existing `pliego_upload_id`
**And** the function returns `reused = true` and `uploaded_at = T0`

**Test file:** vitest integration or pgTAP
**Framework:** vitest integration or pgTAP

---

### Behavior: authenticated role cannot call dispatch_pliego_upload directly (RN-004)

**Given** a Postgres connection with `authenticated` role
**When** `SELECT * FROM public.dispatch_pliego_upload(...)` is executed
**Then** a permission denied error is returned

**Test file:** pgTAP or vitest integration with anon/authenticated Supabase client
**Framework:** vitest integration

---

## Task T4: API Route

### Behavior: POST with valid PDF returns 201 with pliego_upload_id (REQ-008, TC-001)

**Given** an authenticated session for a company user
**And** a multipart form with a valid PDF `file` and a valid `proceso_id`
**When** POST `/api/pliego-uploads`
**Then** HTTP 201 with body `{ pliego_upload_id: string, reused: false, uploaded_at: string, ingestion_status: 'pending' }`

**Test file:** `src/__tests__/pliego-upload/upload-api.test.ts`
**Framework:** vitest + fetch against local dev server OR vitest with mocked Supabase clients

---

### Behavior: POST with non-PDF magic bytes returns 422 (REQ-003, TC-002)

**Given** an authenticated session
**And** a buffer whose first 5 bytes are NOT `%PDF-`
**When** POST `/api/pliego-uploads`
**Then** HTTP 422 with `{ error: 'INVALID_PDF' }` and no storage object written

**Test file:** `src/__tests__/pliego-upload/upload-api.test.ts`
**Framework:** vitest

---

### Behavior: POST with oversized file returns 413 (REQ-004, TC-003)

**Given** an authenticated session
**And** a buffer of 26 MB
**When** POST `/api/pliego-uploads`
**Then** HTTP 413 with `{ error: 'FILE_TOO_LARGE' }` and no storage object written

**Test file:** `src/__tests__/pliego-upload/upload-api.test.ts`
**Framework:** vitest

---

### Behavior: POST with encrypted PDF returns 422 with Spanish message (REQ-005, TC-004, RN-005)

**Given** an authenticated session
**And** a buffer containing a password-protected PDF
**When** POST `/api/pliego-uploads`
**Then** HTTP 422 with `{ error: 'ENCRYPTED_PDF', message }` where `message` contains `"protegido con contraseña"`
**And** no storage object written

**Test file:** `src/__tests__/pliego-upload/upload-api.test.ts`
**Framework:** vitest

---

### Behavior: POST without session returns 401 (REQ-004)

**Given** no authenticated session
**When** POST `/api/pliego-uploads`
**Then** HTTP 401

**Test file:** `src/__tests__/pliego-upload/upload-api.test.ts`
**Framework:** vitest

---

## Task T5: Upload Widget

### Behavior: submit button disabled when declaration unchecked (REQ-002, TC-006)

**Given** a file is selected in the widget
**And** the declaration checkbox is unchecked
**When** the component renders
**Then** the submit button has `disabled` attribute

**Test file:** `src/__tests__/pliego-upload/PliegoUploadWidget.test.tsx`
**Framework:** vitest + React Testing Library

---

### Behavior: onSuccess called with UploadResult on 201 response (REQ-011, TC-007)

**Given** the API mock returns HTTP 201 with `{ pliego_upload_id: 'abc', reused: false, uploaded_at: '...', ingestion_status: 'pending' }`
**When** upload completes
**Then** `onSuccess` is called with that exact shape

**Test file:** `src/__tests__/pliego-upload/PliegoUploadWidget.test.tsx`
**Framework:** vitest + React Testing Library

---

### Behavior: collision toast shown when reused is true (RN-003)

**Given** the API mock returns HTTP 200 with `{ reused: true, uploaded_at: '2026-05-01T10:00:00Z', ... }`
**When** upload completes
**Then** a toast containing `"Se reutilizó la versión existente"` is visible

**Test file:** `src/__tests__/pliego-upload/PliegoUploadWidget.test.tsx`
**Framework:** vitest + React Testing Library

---

## Task T6: Integration

### Behavior: end-to-end upload → row + queue (TC-001 integration)

**Given** a local Supabase instance and an authenticated user
**And** a real PDF buffer starting with `%PDF-`
**When** POST `/api/pliego-uploads` with `proceso_id` of an existing proceso
**Then** HTTP 201 returned
**And** `pliego_uploads` row exists with `ingestion_status = 'pending'`
**And** pgmq message exists in `pdf_ingestion_queue`

**Test file:** `src/__tests__/pliego-upload/upload-flow.test.ts`
**Framework:** vitest integration (local Supabase)

---

### Behavior: collision returns reused: true with single DB row (TC-005 integration)

**Given** the same PDF buffer is POSTed twice for the same proceso
**When** both calls complete
**Then** first call returns `reused: false`, second returns `reused: true`
**And** only one `pliego_uploads` row exists with that `file_sha256`
**And** two pgmq messages exist (one per dispatch)

**Test file:** `src/__tests__/pliego-upload/upload-flow.test.ts`
**Framework:** vitest integration
