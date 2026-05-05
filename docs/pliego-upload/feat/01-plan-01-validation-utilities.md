# T1: Validation Utilities

## Scope

- `lib/pliego-upload/types.ts` — shared types for upload result, errors, and widget state
- `lib/pliego-upload/validate.ts` — pure validation functions (client-side and server-side)

## Changes

### Types (`lib/pliego-upload/types.ts`)

- Export `UploadState` as a union: `'idle' | 'validating' | 'uploading' | 'dispatching' | 'success' | 'error'`
- Export `UploadResult`: `{ pliego_upload_id: string; reused: boolean; uploaded_at: string; ingestion_status: 'pending' }`
- Export `PliegoUploadError`: `{ error: 'INVALID_PDF' | 'ENCRYPTED_PDF' | 'FILE_TOO_LARGE' | 'SERVER_ERROR'; message: string }`
- Export `ClientValidationResult`: `{ valid: boolean; error?: Pick<PliegoUploadError, 'error' | 'message'> }`
- Export `ServerValidationResult`: same shape as `ClientValidationResult`
- Export constant `PLIEGO_MAX_SIZE_BYTES = 25 * 1024 * 1024` (25 MB)
- Export constant `PLIEGO_MAGIC_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])` (`%PDF-`)
- Export constant `DECLARATION_TEXT_VERSION = 'v1'`
- Export constant `DECLARATION_TEXT = 'Declaro que este es el documento oficial publicado en SECOP II, sin modificaciones.'`

### Client validation (`lib/pliego-upload/validate.ts`)

- Export `validatePdfClient(file: File): ClientValidationResult`
  - Check `file.size > PLIEGO_MAX_SIZE_BYTES` → return `FILE_TOO_LARGE` error
  - Check `file.type !== 'application/pdf'` → return `INVALID_PDF` error
  - Return `{ valid: true }` otherwise
  - This function runs in the browser; MUST NOT import Node.js modules

### Server validation (`lib/pliego-upload/validate.ts`)

- Export `validatePdfServer(buffer: Buffer): ServerValidationResult`
  - Check `buffer.byteLength > PLIEGO_MAX_SIZE_BYTES` → return `FILE_TOO_LARGE`
  - Check first 5 bytes against `PLIEGO_MAGIC_BYTES` → return `INVALID_PDF` on mismatch
  - Return `{ valid: true }` otherwise
  - Pure function: no I/O, no side effects

- Export `detectPasswordProtection(buffer: Buffer): boolean`
  - Attempt to open the PDF with `pdf-parse` targeting page 1
  - If the parse throws with a message matching `/password/i` or `/encrypted/i`, return `true`
  - If parse succeeds (even with empty text), return `false`
  - On any other error, return `false` (caller treats as not encrypted; the worker will surface the real error)
  - Pure function: no I/O beyond the in-memory parse

### Design Rationale (SRP)

Validation logic is isolated from I/O so it can be unit-tested without Supabase or network stubs. Client and server validators share the same constants but run in different environments — the split is explicit in the export pattern.

## Dependencies

None — foundational task.

## Done When

- [ ] `lib/pliego-upload/types.ts` exports all types and constants above
- [ ] `validatePdfClient` rejects files > 25 MB and non-PDF MIME types
- [ ] `validatePdfServer` rejects oversized buffers and buffers that do not start with `%PDF-`
- [ ] `detectPasswordProtection` returns `true` for an encrypted PDF fixture and `false` for a clean one
- [ ] No Node.js imports in the client validator (`validatePdfClient` is safe to bundle in the browser)
- [ ] Unit tests pass: `src/__tests__/pliego-upload/validate.test.ts`
- [ ] TypeScript compiles with no errors
