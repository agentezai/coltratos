# pliego-upload — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Company User | Authenticated user belonging to a registered company; the person who downloaded the pliego from SECOP II and is uploading it |
| System | The Next.js API route, Supabase Storage, Postgres DB, and pgmq queue that process the upload |

---

## User Stories

### US-01 — Upload pliego and trigger ingestion

**As a** company user
**I want** to upload a pliego PDF for a Proceso I've selected
**So that** the system can extract requisitos habilitantes and compute the semáforo verdict

### US-02 — Re-upload duplicate pliego without confusion

**As a** company user
**I want** the system to silently reuse my previous upload when I upload the same pliego PDF again
**So that** I can re-trigger the analysis without worrying about duplicate records or manual cleanup

### US-03 — Get actionable feedback on invalid files

**As a** company user
**I want** clear, specific error messages when my file is too large, not a PDF, or password-protected
**So that** I know exactly what to fix before trying again

### US-04 — Confirm the document is official before upload

**As a** company user
**I want** to explicitly declare that the file I'm uploading is the official pliego from SECOP II, unmodified
**So that** the audit trail reflects my confirmation and I understand my responsibility

---

## Use Case Scenarios

### UC-01 — Upload valid pliego (US-01, US-04)

**Preconditions:**
- User is authenticated and has a company profile
- A Proceso has been selected (procesoId is available in context)
- User has downloaded the pliego PDF from SECOP II

#### Main Scenario

1. User opens the analysis flow at step 6; the `PliegoUploadWidget` renders in `idle` state
2. User selects a PDF file via the drop zone or file browser
3. Widget runs client-side validation (MIME type, size ≤ 25 MB); passes
4. Widget renders the selected filename and size
5. User reads the declaration text and checks the checkbox
6. Upload button becomes enabled; user clicks it
7. Widget transitions to `validating` state; shows spinner
8. API receives multipart form; runs server-side magic-byte check and size check; passes
9. API runs password-protection check; passes
10. API computes SHA-256 from buffer
11. API uploads buffer to `companies/<company_id>/pliegos/<sha256>.pdf` in Supabase Storage
12. API calls `dispatch_pliego_upload` RPC; row inserted with `ingestion_status = 'pending'`; pgmq message dispatched
13. API returns HTTP 201 `{ pliego_upload_id, reused: false, uploaded_at, ingestion_status: 'pending' }`
14. Widget transitions to `success` state; `onSuccess` callback fires

**Postconditions:**
- One `pliego_uploads` row exists with `ingestion_status = 'pending'`, all audit fields populated
- One pgmq message exists in `pdf_ingestion_queue` with `pliego_upload_id`
- PDF file stored at `companies/<company_id>/pliegos/<sha256>.pdf`

---

### UC-02 — Upload duplicate pliego (US-02)

**Preconditions:**
- Same company user previously uploaded the identical PDF for this Proceso (same `proceso_id + company_id + file_sha256`)
- The existing `pliego_uploads` row is in `completed` or `failed` status

#### Main Scenario

1. Steps 1–10 same as UC-01
2. API uploads buffer to storage (storage upsert is idempotent for same key)
3. API calls `dispatch_pliego_upload` RPC; INSERT fires ON CONFLICT DO NOTHING; existing row ID is retrieved; pgmq message dispatched
4. API returns HTTP 200 `{ pliego_upload_id: <existing_id>, reused: true, uploaded_at: <original_date> }`
5. Widget transitions to `success`; `onSuccess` fires; non-blocking toast shows: *"Este pliego ya fue cargado el [fecha]. Se reutilizó la versión existente."*

**Postconditions:**
- No new `pliego_uploads` row created
- A new pgmq message dispatched against the existing row

---

### UC-03 — Reject invalid upload (US-03)

**Preconditions:**
- User selects a file and checks the declaration

#### 3a. File exceeds 25 MB (client-side catch)

1. User selects a 30 MB file
2. Widget client-side validation detects size > 25 MB
3. Widget shows inline error: *"El archivo excede 25 MB. Los pliegos de SECOP II típicamente pesan entre 2 y 8 MB."*
4. Upload button remains disabled; no request is sent

#### 3b. File is not a PDF (server-side catch)

1. User selects a `.docx` file (MIME check might pass if browser lies); submits upload
2. API magic-byte check reads first 5 bytes; does not match `%PDF-`
3. API returns HTTP 422 `{ error: 'INVALID_PDF', message: 'El archivo no es un PDF válido.' }`
4. Widget renders error state with the message

#### 3c. PDF is password-protected

1. User selects an encrypted PDF; submits upload
2. API magic-byte check passes; password-protection check detects encryption
3. API returns HTTP 422 `{ error: 'ENCRYPTED_PDF', message: 'Este PDF está protegido con contraseña. Sube una versión sin protección.' }`
4. Widget renders error state with the message

**Postconditions:**
- No storage object written
- No `pliego_uploads` row created
- No pgmq message dispatched

---

## UX/UI References

Design references pending. See also the UX/UI section in [spec.md](./spec.md#uxui).
