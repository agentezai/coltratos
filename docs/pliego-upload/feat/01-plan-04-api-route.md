# T4: API Route — POST /api/pliego-uploads

## Scope

- `src/app/api/pliego-uploads/route.ts` — Next.js App Router POST handler (Edge Function)

## Changes

### Request handling

- Parse `multipart/form-data`: extract `file: File` and `proceso_id: string`
- Get authenticated session via Supabase server client; return HTTP 401 if no session
- Extract `company_id` from the session's `users` row (one user → one company in MVP)

### Server-side validation pipeline (order matters)

1. **Size check** — `buffer.byteLength > PLIEGO_MAX_SIZE_BYTES` → HTTP 413 `{ error: 'FILE_TOO_LARGE', message: '...' }`
2. **Magic-byte check** — `validatePdfServer(buffer)` → HTTP 422 `{ error: 'INVALID_PDF', message: '...' }` on fail
3. **Password-protection check** — `detectPasswordProtection(buffer)` → HTTP 422 `{ error: 'ENCRYPTED_PDF', message: 'Este PDF está protegido con contraseña. Sube una versión sin protección.' }` if `true`

Steps 1–3 run before any storage write. Early return on first failure.

### SHA-256 hash

- `const sha256 = crypto.createHash('sha256').update(buffer).digest('hex')`

### Storage upload

- Call `uploadPliegoBuffer(buffer, companyId, sha256)` from T2
- On `PliegoUploadError` thrown from storage service, return HTTP 500

### DB RPC dispatch

- Call Supabase service-role client `.rpc('dispatch_pliego_upload', { p_proceso_id, p_company_id, p_sha256, p_file_storage_key, p_uploader_ip, p_declaration_ts })`
- `p_uploader_ip` = `request.headers.get('x-forwarded-for') ?? null`
- `p_declaration_ts` = `new Date().toISOString()` (server clock)
- On RPC error, return HTTP 500

### Response shape

- New row: HTTP 201 `{ pliego_upload_id, reused: false, uploaded_at, ingestion_status: 'pending' }`
- Collision: HTTP 200 `{ pliego_upload_id, reused: true, uploaded_at, ingestion_status: 'pending' }`

### Design Rationale (OCP)

The route is thin: it delegates validation to `lib/pliego-upload/validate.ts`, storage to `src/services/pliego-upload/storage.ts`, and DB logic to the RPC. Adding a new validation step means extending the validation module, not editing the route handler.

## Dependencies

Requires T1 (`validatePdfServer`, `detectPasswordProtection`, types), T2 (`uploadPliegoBuffer`), T3 (`dispatch_pliego_upload` RPC).

## Done When

- [ ] Returns HTTP 413 for a buffer > 25 MB (server-side check, not just client MIME)
- [ ] Returns HTTP 422 with `INVALID_PDF` for a buffer that does not start with `%PDF-`
- [ ] Returns HTTP 422 with `ENCRYPTED_PDF` for a password-protected PDF; message contains `"protegido con contraseña"`
- [ ] Returns HTTP 401 when no valid session is present
- [ ] Returns HTTP 201 with `reused: false` on first upload of a PDF
- [ ] Returns HTTP 200 with `reused: true` on collision (same PDF re-uploaded)
- [ ] `declaration_accepted_at` in DB row reflects server-side timestamp (not client-supplied)
- [ ] `uploader_ip` is `null` when `x-forwarded-for` header is absent
- [ ] No storage write occurs when any validation step rejects the file
- [ ] TypeScript compiles with no errors; ESLint passes
