# Suggestions — coltratos-app-ui

## Quick Wins

**[S001] Add `afterEach(cleanup)` to a shared test setup file**
All new UI test files manually import `afterEach(cleanup)` to work around RTL auto-cleanup not firing when `globals: false`. A single `setupFilesAfterEach` entry in `vitest.config.ts` would remove this boilerplate from every test file.

**[S002] Replace `DataTable` children pattern with typed columns**
`DataTable` is currently a plain wrapper (`children`). Each page duplicates `th`/`td` markup. A typed `columns: ColDef[]` prop would eliminate repetition — worth doing once there are ≥4 pages with identical column-definition patterns.

**[S003] Extract `useFilterState` hook**
`ProcesosTable`, `AnalisisTable`, and `MemberTable` all implement the same `q + filterX + page` state pattern. A shared `useFilterState<T>` hook with a generic filter predicate would halve the boilerplate.

## Future Enhancements

**[S004] Real pathname-driven active nav in Storybook**
Sidebar stories currently render without a URL, so no nav item is active. Adding a `usePathname` Storybook decorator (inject `next/navigation` mock) would make active-state stories possible.

**[S005] Pagination as URL search params**
`AnalisisTable` and `MemberTable` use local `useState` for page. When real data arrives, move to `?page=N` search params so deep-links and browser back work correctly.

**[S006] Upload: real drag-and-drop file size validation**
The dropzone accepts any file silently. Add a client-side check for PDF mimetype and ≤20 MB before setting `file` state, with an inline error message.

## Technical Debt

**[S007] `RESULT_DETAIL` is a singleton mock**
`app/dashboard/analisis/[id]/page.tsx` ignores `params.id` and always renders the same mock. When real API integration ships, swap to `fetch(`/api/analisis/${params.id}`)` — the component structure won't change.

**[S008] Sidebar stories need new play tests**
The `ActiveSubir` and `ActiveAlertas` stories were neutered (args cleared) because they relied on `initialActive` which was removed. Re-write their play tests using pathname mock injection (see S004).

**[S011] PdfViewer: bundle-split react-pdf with dynamic import**
`react-pdf` is a heavy client bundle (~2 MB). In production, wrap `PdfViewer` in `next/dynamic({ ssr: false })` so the PDF renderer is only loaded when the viewer opens. This is already architecturally compatible with the `open` guard (returns null when closed).

**[S012] Signed URL: add server-side TTL check before opening viewer**
The signed URL expires in 15 minutes. If the user leaves the tab open and clicks "Abrir en PDF" after expiry, the viewer will show an error. Add a `Retry-After` response header to the 403 from Supabase and surface a "reopen" CTA in the viewer error state.

**[S013] Worker CDN: vendor-in pdfjs worker for offline/intranet support**
The pdfjs worker is loaded from `unpkg.com`. For customers on restricted networks or staging environments without internet access, vendor the worker via `npm install pdfjs-dist` and configure `workerSrc` to the local file. Blocked: decision on bundle-size budget.

**[S014] Quote highlight: use pdfjs textLayer API for precision**
The current highlight strategy queries `.react-pdf__Page__textContent` spans via DOM. For PDFs with complex layouts (multi-column, RTL), spans may not match. A more precise approach uses react-pdf v9's `customTextRenderer` prop to inject `<mark>` during text layer render, before DOM paint.

**[S015] FeedbackThumbs: persist toast beyond 3 seconds for accessibility**
The success toast disappears after 3 seconds. Screen-reader users relying on `aria-live="polite"` may miss it if the announcement hasn't finished. Increase to 5 seconds or replace with a `role="alert"` that persists until the user dismisses it.

**[S016] analysis_feedback: aggregate feedback metrics in analytics dashboard**
The `analysis_feedback` table is instrumented but not yet surfaced in analytics. A simple endpoint counting `up` vs `down` per `analysis_id` (or per `proceso_id`) would close the "discovery relevance metric" loop described in REQ-026. Low engineering cost, high product value.

**[S017] FeedbackThumbs: optimistic UI for toggle-off**
Currently, re-clicking the active thumb fires the server action and waits for resolution before clearing the active state. An optimistic clear (set `rating = null` immediately, revert on error) would feel more responsive. Low risk given the operation is idempotent.

## Questions for the Human

**[S009] Collapse state location**
Collapse state lives in `app/dashboard/layout.tsx`. If we want collapse to persist across navigations (survive full-page renders), move it to `localStorage` with a `useLocalStorage` hook. Is persistence desired for MVP?

**[S010] Mock data volume**
`ANALISIS` has 8 rows; `PROCESOS` has 5 rows; `EQUIPO` has 6 rows. Pagination UI shows totals of 48/16 respectively. Should mock data be expanded to match, or is the mismatch acceptable until real API integration?
