# T5: Upload Widget

## Scope

- `src/components/pliego-upload/PliegoUploadWidget.tsx` — main upload component
- `src/components/pliego-upload/DeclarationCheckbox.tsx` — declaration checkbox sub-component
- `src/hooks/usePliegoUpload.ts` — upload state machine hook
- `src/__tests__/pliego-upload/validate.test.ts` — unit tests for T1 utilities (written here now that T1 types are stable)

## Changes

### State machine hook (`src/hooks/usePliegoUpload.ts`)

- Manages `UploadState` transitions: `idle → validating → uploading → dispatching → success | error`
- Exposes: `{ state, file, error, result, handleFileSelect, handleSubmit, reset }`
- `handleFileSelect(file: File)`:
  - Runs `validatePdfClient(file)` → if invalid, transitions to `error`
  - On valid, stores file, transitions back to `idle` (file selected, ready to upload)
- `handleSubmit(procesoId: string, companyId: string, declarationChecked: boolean)`:
  - Guards: if `!declarationChecked` or no file selected, no-op
  - Transitions `idle → validating`
  - POSTs `multipart/form-data` to `/api/pliego-uploads` with `file` and `proceso_id`
  - Transitions `validating → uploading` after request sends (streaming progress is not available in fetch; state transitions on logical phases)
  - On response:
    - 201/200: transitions to `success`, stores `UploadResult`
    - 413/422: transitions to `error`, stores `PliegoUploadError`
    - Network/5xx: transitions to `error` with `SERVER_ERROR`
- `reset()`: transitions back to `idle`, clears file and error

### Declaration checkbox (`src/components/pliego-upload/DeclarationCheckbox.tsx`)

- Renders the full declaration text from `DECLARATION_TEXT` constant
- Accepts `checked: boolean` and `onChange: (checked: boolean) => void` props
- Disabled prop forwarded to the checkbox when widget state is not `idle`

### Upload widget (`src/components/pliego-upload/PliegoUploadWidget.tsx`)

- `'use client'` directive
- Props: `{ procesoId: string; companyId: string; onSuccess: (result: UploadResult) => void; onError?: (err: PliegoUploadError) => void }`
- Renders:
  - Drop zone (drag-and-drop + click-to-browse): `accept="application/pdf"`, shows selected filename + size
  - `DeclarationCheckbox` (visible once a file is selected)
  - Submit button: disabled when `state !== 'idle'` OR `!declarationChecked` OR no file
  - Status display: one paragraph per `UploadState` (see UX/UI section in spec)
- On `state === 'success'`: calls `onSuccess(result)`; if `result.reused`, shows toast
- On `state === 'error'`: calls `onError?.(error)` and shows inline error message
- Hash-collision toast text: `"Este pliego ya fue cargado el [formatDate(result.uploaded_at)]. Se reutilizó la versión existente."`
- Uses the project design system for button, spinner, checkbox, and toast primitives

### Unit tests (`src/__tests__/pliego-upload/validate.test.ts`)

- `validatePdfClient`: rejects files > 25 MB, rejects non-PDF MIME, accepts valid PDF
- `validatePdfServer`: rejects oversized buffer, rejects buffer not starting with `%PDF-`, accepts valid buffer
- `detectPasswordProtection`: returns `true` for encrypted PDF fixture, `false` for clean PDF fixture

### Design Rationale (SRP + Decoupling)

The widget owns presentation and callback orchestration only. The state machine lives in the hook (testable independently). Validation logic lives in `lib/pliego-upload/validate.ts` (pure, shared). API call is in the hook, not the widget. `procesoId` and `companyId` arrive as props — the widget has no knowledge of routing or auth context.

## Dependencies

Requires T1 (types, validate functions), T4 (API route must exist for integration).

## Done When

- [ ] Widget renders all five `UploadState` labels correctly
- [ ] Submit button is disabled when declaration is unchecked
- [ ] Submit button is disabled when no file is selected
- [ ] `validatePdfClient` rejects files > 25 MB before any request is sent
- [ ] `onSuccess` is called with correct `UploadResult` shape on 201/200 response
- [ ] `onError` is called with `PliegoUploadError` on 413/422 response
- [ ] Hash-collision toast fires when `result.reused === true`
- [ ] `reset()` returns widget to `idle` with no file or error
- [ ] Unit tests in `validate.test.ts` all pass
- [ ] TypeScript compiles with no errors; ESLint passes
