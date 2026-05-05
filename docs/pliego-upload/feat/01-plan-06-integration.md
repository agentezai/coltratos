# T6: Analysis Flow Integration

## Scope

- `src/app/(app)/procesos/[procesoId]/analizar/page.tsx` — analysis flow step 6 page (create if absent; add upload step if page already exists from `coltratos-app-ui`)
- `src/__tests__/pliego-upload/upload-flow.test.ts` — integration test covering the upload → dispatch path

## Changes

### Analysis flow page

- Reads `procesoId` from route params
- Reads `companyId` from the authenticated session (via Supabase server component)
- Renders `PliegoUploadWidget` with `procesoId` and `companyId` as props
- `onSuccess` handler: stores `pliego_upload_id` in component state and transitions the UI to show the next step (e.g., an "Análisis en proceso" status display or a navigation to the results page once ingestion completes)
- `onError` handler: surfaces the error inline — no global error boundary needed for upload errors
- If `coltratos-app-ui` already defines this page, add the widget as step 6 within its existing layout; do not create a new route

### Integration test (`src/__tests__/pliego-upload/upload-flow.test.ts`)

Using vitest + MSW (or Supabase test client against a local instance):
- Happy path: POST to `/api/pliego-uploads` with a valid PDF buffer → assert HTTP 201, `pliego_upload_id` present, `reused: false`
- Collision path: POST twice with the same buffer → first returns 201, second returns 200 with `reused: true` and same `pliego_upload_id`
- Invalid PDF: POST with a buffer that does not start with `%PDF-` → assert HTTP 422, `error: 'INVALID_PDF'`
- Oversized file: POST with a 26 MB buffer → assert HTTP 413
- Unauthenticated: POST without session → assert HTTP 401

### Design Rationale (SRP)

The page is a thin host that provides route-derived props to the widget. The widget owns its own state. The integration test exercises the full API route path — closer to a real upload than unit tests — so it catches I/O wiring bugs that mocks would not catch.

## Dependencies

Requires T5 (`PliegoUploadWidget` must exist and export correctly).

## Done When

- [ ] `PliegoUploadWidget` renders within the analysis flow page without TypeScript errors
- [ ] `procesoId` from route params and `companyId` from session are passed correctly to the widget
- [ ] `onSuccess` transitions the page UI after a successful upload
- [ ] Integration tests in `upload-flow.test.ts` pass: happy path, collision, invalid PDF, oversized, unauthenticated
- [ ] `npm run build` succeeds with no type errors in the new page
- [ ] Manual smoke test: upload a real PDF from SECOP II → row visible in `pliego_uploads` with `ingestion_status = 'pending'` → pgmq message visible in queue
