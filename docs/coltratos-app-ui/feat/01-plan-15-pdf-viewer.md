# T15: PDF viewer DS primitive + signed-URL helper + highlight strategy

## Scope

| File | Change |
|------|--------|
| `src/components/ui/pdf-viewer.tsx` | New (DS primitive) — modal/drawer + react-pdf canvas |
| `src/lib/server/signed-url.ts` | New — server-only helper, mints signed URL after RLS check |
| `src/app/api/analyses/[id]/pliego-url/route.ts` | New — POST endpoint returning a one-shot 15-min signed URL |
| `package.json` | **+1 dep** — `react-pdf` (per S6 Flag F-1) |

## Requirements

REQ-022, REQ-023, NFR-02 (allowed exception), NFR-06, NFR-07.

## Changes

### `PdfViewer` (DS primitive, `'use client'`)

Props:
```ts
type PdfViewerProps = {
  open: boolean;
  onClose: () => void;
  signedUrl: string;      // pre-fetched by parent
  initialPage: number;    // 1-indexed
  highlightQuote: string | null;
};
```

Layout — **MUST** be responsive per NFR-06:
- `< lg` viewports: full-screen modal (`Dialog` from DS)
- `≥ lg` viewports: 50% side panel (`Drawer` right-anchored)

Internals: thin wrapper around `react-pdf`'s `Document` + `Page` components. Tracks `currentPage` state, exposes prev/next + page-number input.

### Highlight strategy (S6 Flag F-2 → text-search)

On page load, search the rendered text layer for `highlightQuote` (normalized: collapse whitespace, strip leading/trailing punctuation). When found, wrap matching nodes in `<mark className="bg-amber-100">`. When not found, render an inline `<Chip variant="amber">Cita no encontrada en esta página</Chip>` and leave the page un-highlighted — **MUST NOT** silently fail.

Quote-not-found events are logged to `console.warn` for now; future revision may persist them to telemetry to drive an eval metric.

### Signed-URL helper

`src/lib/server/signed-url.ts` exports `getPliegoSignedUrl(analysisId, companyId)`:
1. RLS-scoped Kysely query: `analyses` JOIN `pliego_uploads`, filter by `analysisId` and `companyId`. Returns `null` if not found.
2. Calls Supabase storage `createSignedUrl(file_storage_key, 15*60)`.
3. Returns the signed URL.

`src/app/api/analyses/[id]/pliego-url/route.ts`: POST handler, reads `auth.company_id()` from session, calls helper, returns `{ url }`. **MUST NOT** be a GET (avoid URL caching / referrer leaks).

### Page wiring

`RequisitoRow`'s "Abrir página en PDF" button (T14):
1. Calls `POST /api/analyses/[id]/pliego-url`
2. On success, sets `pdfState = { open: true, signedUrl, initialPage, highlightQuote }`
3. Renders `<PdfViewer {...pdfState} onClose={...}/>`

Signed URL is **never** stored in component state beyond the open lifetime — closing the viewer drops it.

## Done When

- [ ] `react-pdf` added to dependencies; `npm install` clean
- [ ] PdfViewer opens to `initialPage` and highlights a verbatim quote
- [ ] PdfViewer renders the "Cita no encontrada" chip when the quote diverges from rendered text
- [ ] Signed-URL endpoint returns 404 for analyses owned by another company
- [ ] Signed URL is freshly minted on every open (not cached on client)
- [ ] Modal layout on `< lg`, drawer layout on `≥ lg` (visual test)

## Dependencies

T11, T14. NFR-02 exception **MUST** be confirmed in `/nybo-verify` before merging.
