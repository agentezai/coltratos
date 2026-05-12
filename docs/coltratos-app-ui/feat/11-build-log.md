# Feature Build Log — coltratos-app-ui

A chronological record of every decision and implementation step taken to build this feature. Written so another developer can replicate the work or understand the reasoning behind each choice.

---

## 1. Feature Goal

This feature implements all authenticated app screens for the Coltratos MVP (T1–T10 with mock data) and then graduates the **Resultado del análisis** screen to real Supabase data (T11–T20), replacing fixtures with RLS-scoped Kysely queries, rendering verdict citations the user can drill into via an in-app PDF viewer, and adding re-run, partial-extraction warnings, relevance feedback, export trigger, and real-progress loading states.

When the feature is exercised end-to-end:

- A user navigating to `/dashboard/analisis/<id>` sees the real verdict from `analyses.overall_verdict`, with every requisito habilitante listed under the correct tab (Jurídico / Técnico / Financiero), each row expandable to reveal the source quote and a "Abrir página en PDF" button that opens the pliego at the cited page.
- The signed URL for the pliego PDF is minted server-side after an RLS check; the storage path is never exposed to the client.
- While extraction is in progress (`pending` or `extracting`), the page renders a four-step stepper tied to `analyses.extraction_stage` instead of the verdict — polling the `/api/analyses/[id]/status` endpoint every 5 seconds until a terminal status is reached.
- Feedback written via the thumbs control is stored in `analysis_feedback` (upsert on `(analysis_id, user_id)`) and deleted on toggle-off; the export button is guarded by the `REPORT_EXPORT_ENABLED` feature flag and renders a "Próximamente" tooltip when the flag is off.

---

## 2. Codebase Discovery (before writing a line of code)

Before planning, the codebase was read to understand what already existed.

**Key findings:**

| Finding | Detail |
|---------|--------|
| Design system already had Icon, Chip, Tooltip, SemPill, and Quote primitives | `src/components/ui/index.ts` — T11–T20 could extend these rather than add net-new primitives |
| Shell and Sidebar were complete (T1) | `src/components/shell/sidebar.tsx` — navigation wiring, collapse state, pathname-active logic already in place |
| Kysely Database type already included `analyses`, `verdicts`, `requisitos`, `pliego_uploads`, `procesos` tables | `src/types/domain/db.ts` — T11 only needed to add the query, not extend the type |
| Mock data was scoped to `src/lib/mock/` | Kept intact per NFR-03 — T11–T20 replace only the Resultado page's data source; other pages remain mock-backed |
| `react-pdf` was not in dependencies | Required adding `react-pdf@^9.2.1` for T15; NFR-02 permitted one PDF library; documented as exception in `rsc-purity.test.ts` |
| T5 upload progress step had an identical 4-stage stepper primitive | T20 reused the same stage constants and visual shape rather than reinventing a stepper |
| `getAuthContext()` existed at `src/lib/server/auth-context.ts` | T11 and T15 used it directly for RLS scoping without additional server utilities |

---

## 3. Architecture Decisions

### 3.1 Single Kysely round-trip for the analysis detail page

**Decision:** `getAnalysisDetail(id, companyId)` joins `analyses → verdicts → requisitos → pliego_uploads` in one query and returns an `AnalysisDetail` aggregate type; the page does no secondary fetches.

**Why:** The Resultado page needs the analysis, all requisito rows, all verdicts, and the pliego upload in one render. Multiple sequential awaits would stack server latency; a join fits within p95 <60 s for the expected row count at MVP scale. The JSONB `proceso_metadata_snapshot` is carried in the row and never re-fetched from datos.gov.co (database.md audit-trail convention).

### 3.2 Client-only `PdfViewer` with optimistic quote-not-found chip

**Decision:** `PdfViewer` is `'use client'`, uses `react-pdf`'s `Document` + `Page` with a text-layer event handler for quote highlighting. The chip shows by default and hides only when the quote is found in the rendered text layer.

**Why:** PDF rendering requires browser APIs. The optimistic chip avoids a flash of "found" followed by "not found" on image-only pages where the text layer never fires — the inverse (hide by default, show on miss) would require a second render. The component lives in the design system (`src/components/ui/pdf-viewer.tsx`) per REQ-023, not inlined in the feature.

### 3.3 INSERT-only re-run (never UPDATE)

**Decision:** `rerunAnalysis` server action inserts a new `analyses` row with the same `pliego_upload_id` and the user's current company profile snapshot; the existing row is never mutated.

**Why:** database.md convention — every re-run extends the audit trail. The existing analysis must remain reproducible even after the user edits their company profile. The action navigates to the new `analysis_id` on success.

### 3.4 Semáforo narrative derived deterministically, not by LLM

**Decision:** `computeVerdictCounts` reduces the `verdicts` array to counts and a `computeVerdictNarrative` function maps `(overallVerdict, counts)` to a preset copy string.

**Why:** contratacion-publica.md convention — "the LLM does extraction; rules do matching." A deterministic reducer also makes the banner testable (6/6 VerdictBanner unit tests), avoids LLM latency on every page load, and prevents narrative drift between re-runs.

### 3.5 Node 22 CI requirement (CI fix during ship)

**Decision:** Bumped `node-version` in `.github/workflows/ci.yml` from `'20'` to `'22'`; updated `engines` in `package.json` to `>=22.0.0`.

**Why:** `react-pdf` v9 uses `pdfjs-dist` which calls `Promise.withResolvers`, introduced in Node 22 (backported to Node 20.13+ but GitHub Actions `node-version: '20'` resolved to an earlier 20.x patch). Local dev runs Node 22.22.2; CI was pinned to 20, causing build failures during static page generation.

---

## 4. Files Created or Modified

### New files (T11–T20)

| File | Purpose |
|------|---------|
| `src/types/domain/analysis.ts` | `AnalysisDetail`, `RequisitoView`, `VerdictView`, `FeedbackRow` domain types |
| `src/lib/queries/analysis-detail.ts` | `getAnalysisDetail()` Kysely query (single round-trip join) |
| `src/lib/server/signed-url.ts` | `getPliegoSignedUrl()` — server-only, RLS-scoped Supabase storage URL |
| `src/lib/errors/analysis-errors.ts` | `NotFoundError`, `ProfileMissingError` error classes |
| `src/lib/features/report-export.ts` | `REPORT_EXPORT_ENABLED` feature flag from `NEXT_PUBLIC_REPORT_EXPORT_ENABLED` |
| `app/dashboard/analisis/[id]/_components/proceso-header.tsx` | Metadata strip: entidad, objeto, modalidad, valor, cierre, SECOP II link / unverified badge |
| `app/dashboard/analisis/[id]/_components/verdict-banner.tsx` | Real-data verdict banner with `computeVerdictCounts` reducer |
| `app/dashboard/analisis/[id]/_components/result-tabs.tsx` (rewrite) | 4 tabs (Resumen/Jurídico/Técnico/Financiero) over `RequisitoRow` list |
| `app/dashboard/analisis/[id]/_components/requisito-row.tsx` | Collapsed + expanded requisito row with citation trigger |
| `app/dashboard/analisis/[id]/_components/citation-block.tsx` | Quote block + "Abrir página en PDF" CTA, missing-quote fallback (RN-008) |
| `app/dashboard/analisis/[id]/_components/extraction-warning.tsx` | Partial/failed extraction banner above verdict with flagged-pages drawer |
| `app/dashboard/analisis/[id]/_components/extraction-loading.tsx` | 4-step stepper polling client; 10-min safety cap |
| `app/dashboard/analisis/[id]/_components/extraction-stages.ts` | `ExtractionStage` enum + `STAGE_DISPLAY` + `stageToPct` |
| `app/dashboard/analisis/[id]/_components/rerun-button.tsx` | Native-dialog confirmation + INSERT-only rerun navigation |
| `app/dashboard/analisis/[id]/_components/export-button.tsx` | Feature-flag guard + "Próximamente" disabled tooltip |
| `app/dashboard/analisis/[id]/_components/feedback-thumbs.tsx` | Page-level wrapper wiring DS primitive to `submitFeedback` |
| `app/dashboard/analisis/[id]/_actions/rerun-analysis.ts` | `rerunAnalysis` server action — INSERT new analyses row |
| `app/dashboard/analisis/[id]/_actions/submit-feedback.ts` | `submitFeedback` server action — upsert / delete-on-toggle |
| `app/api/analyses/[id]/pliego-url/route.ts` | POST: 401 no session / 404 RLS miss / 200 `{ url }` |
| `app/api/analyses/[id]/status/route.ts` | GET: extraction_status + stage + progress_pct; Cache-Control: no-store |
| `src/components/ui/quote.tsx` | `Quote` DS primitive — styled quotation block with left-border accent |
| `src/components/ui/warning-banner.tsx` | `WarningBanner` DS primitive — amber/red variants, optional action button, optional dismiss |
| `src/components/ui/feedback-thumbs.tsx` | `FeedbackThumbs` DS primitive — thumbs up/down + optional comment input |
| `src/components/ui/pdf-viewer.tsx` | `PdfViewer` DS primitive — modal `<lg` / side drawer `≥lg`, quote highlight, react-pdf |
| `supabase/migrations/20260512000000_create_analysis_feedback.sql` | `analysis_feedback` table + 4 RLS policies + created_at index |

### New test files (T11–T20)

| File | Coverage target |
|------|----------------|
| `src/__tests__/analysis-detail.test.ts` | `getAnalysisDetail` unit — RLS null, full aggregate, feedback mapping, flagged pages |
| `src/__tests__/analysis-detail-rls.integration.test.ts` | RLS integration — foreign-company row returns null |
| `src/__tests__/proceso-header.test.tsx` | Verified and unverified branches (6 tests) |
| `src/__tests__/verdict-banner.test.tsx` | 3 verdict branches, counts reducer, no edit affordance (12 tests) |
| `src/__tests__/requisito-row.test.tsx` | Collapsed/expanded state, severity sort, tipo filter (16 tests) |
| `src/__tests__/pdf-viewer.test.tsx` | initialPage, quote-not-found chip, null quote, closed state |
| `src/__tests__/pliego-url-route.test.ts` | 401, 404 RLS, 200 success |
| `src/__tests__/rerun-button.test.tsx` | Dialog flow, error inline, navigation (5 tests) |
| `src/__tests__/rerun-analysis.test.ts` | INSERT-only, RLS miss, profile missing (5 tests) |
| `src/__tests__/extraction-warning.test.tsx` | Partial/failed branches, flagged-pages drawer (11 tests) |
| `src/__tests__/feedback-thumbs.test.tsx` | Upsert/delete/toggle, 200-char limit (9 tests) |
| `src/__tests__/submit-feedback.test.ts` | Upsert paths, auth check (8 tests) |
| `src/__tests__/export-button.test.tsx` | Disabled state, tooltip copy, feature-flag on/off (4 tests) |
| `src/__tests__/extraction-loading.test.tsx` | Stepper stages, polling stops on terminal, API route (8 tests) |

### Modified files

| File | Change |
|------|--------|
| `app/dashboard/analisis/[id]/page.tsx` | Rewritten: RSC, `getAnalysisDetail` call, branching on `extractionStatus` (loading / partial / completed / failed), wires T12–T20 components |
| `src/components/ui/index.ts` | Exported: `Quote`, `WarningBanner`, `FeedbackThumbs`, `PdfViewer` |
| `src/components/ui/sem-pill.tsx` | Extended to accept canonical (`verde`/`amarillo`/`rojo`) in addition to legacy (`eligible`/`conditional`/`not-eligible`) values |
| `package.json` | Added `react-pdf@^9.2.1`; bumped `engines.node` to `>=22.0.0` |
| `.github/workflows/ci.yml` | `node-version: '20'` → `'22'` in both `quality` and `db` jobs |
| `src/__tests__/rsc-purity.test.ts` | Allowlist updated with `pdf-viewer.tsx` and `feedback-thumbs.tsx` (NFR-02 exceptions) |

---

## 5. Step-by-Step Implementation

### Step 1 — T1–T10: App shell + mock-data screens

Sidebar was updated to use `usePathname` for active highlighting and a collapse-to-76px icon-only mode. Seven new icons were added to the `Icon` DS primitive. All eight dashboard screens were implemented as Next.js App Router RSCs backed by typed mock data from `src/lib/mock/index.ts`. Shared page primitives (`StatCard`, `SemPill`, `DataTable`, `Toolbar`, `PageHeader`, `Pagination`, `PlaceholderPage`) were extracted to `src/components/page/`. This phase established the visual layer verified against the Claude Design handoff.

```tsx
// src/components/page/sem-pill.tsx — original shape
export type SemPillStatus = 'eligible' | 'conditional' | 'not-eligible';
```

---

### Step 2 — T11: RLS-scoped Kysely data loader

`getAnalysisDetail(id, companyId)` joins five tables in one query. `AnalysisDetail` is the aggregate type the page renders from. Returning `null` → `notFound()`.

```ts
export type AnalysisDetail = {
  id: string;
  overallVerdict: 'verde' | 'amarillo' | 'rojo' | null;
  procesoLookupStatus: 'verified' | 'unverified' | 'failed';
  procesoMetadata: ProcesoMetadataSnapshot;
  extractionStatus: 'pending' | 'extracting' | 'partial' | 'completed' | 'failed';
  extractionStage: string | null;
  pagesFlagged: number;
  flaggedPagesList: number[];
  requisitos: RequisitoView[];
  feedback: FeedbackRow | null;
};
```

- Depends on the existing Kysely `Database` type — no schema migration needed for this step.
- T12–T20 all receive `detail: AnalysisDetail` as their primary prop.

---

### Step 3 — T12: Proceso metadata header

`ProcesoHeader` reads from `detail.procesoMetadata` (the JSONB snapshot stored at analysis time — never re-fetched from datos.gov.co per database.md audit-trail convention). The unverified branch renders an amber `Chip` and omits the SECOP II link.

```tsx
// proceso-header.tsx — verified branch SECOP II link
const secopUrl = `https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=${encodeURIComponent(procesoMetadata.numeroProceso)}`;
```

---

### Step 4 — T13: VerdictBanner with deterministic narrative

`computeVerdictCounts` reduces `requisitos` to `{ verde, amarillo, rojo, total }`. `computeVerdictNarrative` maps the tuple to a preset copy string — no LLM call on page load.

```ts
export function computeVerdictCounts(requisitos: RequisitoView[]) {
  return requisitos.reduce(
    (acc, r) => ({ ...acc, [r.verdict]: (acc[r.verdict] ?? 0) + 1, total: acc.total + 1 }),
    { verde: 0, amarillo: 0, rojo: 0, total: 0 }
  );
}
```

`SemPill` was extended at this step to accept canonical semáforo values in addition to the legacy `eligible`/`conditional`/`not-eligible` shape, so existing mock-data screens were unaffected.

---

### Step 5 — T14: RequisitoRow + CitationBlock + Quote DS primitive

`RequisitoRow` renders collapsed (1-line truncated texto + SemPill + confidence indicator) and expanded (full texto + reason + `CitationBlock`). The `Quote` DS primitive was added to the design system for the left-border citation block, reusable across features.

```tsx
// citation-block.tsx — missing-quote fallback (RN-008)
{quoteFuente ? (
  <Quote>{quoteFuente}</Quote>
) : (
  <p className="text-sm text-graphite-400 italic">Cita no disponible para este requisito.</p>
)}
```

---

### Step 6 — T15: PdfViewer DS primitive + signed-URL endpoint

`react-pdf@^9.2.1` was added (the one allowed external dependency per NFR-02). The `PdfViewer` component is `'use client'` only, living in the DS. The signed URL is minted via POST `/api/analyses/[id]/pliego-url` after an RLS check in `getPliegoSignedUrl()` — the storage path is never sent to the client.

```ts
// signed-url.ts
export async function getPliegoSignedUrl(analysisId: string, companyId: string): Promise<string | null> {
  const row = await db.selectFrom('analyses')
    .where('id', '=', analysisId)
    .where('company_id', '=', companyId)
    .select('pliego_upload_id')
    .executeTakeFirst();
  if (!row) return null;
  // ... Supabase storage.createSignedUrl(...)
}
```

- Note: `react-pdf` v9 requires Node 22 (`Promise.withResolvers`). This triggered the CI `node-version` fix during ship (Step 10).

---

### Step 7 — T16: Re-run server action

`rerunAnalysis` is a `'use server'` action that inserts a new `analyses` row. It never mutates the existing row. `RerunButton` wraps it in a native `<dialog>` confirmation and navigates to the new analysis ID on success.

```ts
// rerun-analysis.ts (key invariant)
// MUST insert, never update — database.md audit-trail convention
await db.insertInto('analyses').values({ ...base, id: newId, created_at: new Date() }).execute();
router.push(`/dashboard/analisis/${newId}`);
```

---

### Step 8 — T17: Partial-extraction warning surface

`WarningBanner` is a new DS primitive (amber / red variants, optional action button, optional dismiss). `ExtractionWarning` reads `extractionStatus` and `pagesFlagged` from `AnalysisDetail` and renders above `VerdictBanner`. A `FlaggedPagesDrawer` lists the page numbers that yielded no extractable content (per integrations.md convention — MUST flag, never silently drop).

---

### Step 9 — T18: Relevance feedback

The `analysis_feedback` Supabase migration creates a table with `(analysis_id, user_id)` composite PK and four RLS policies (select / insert / update / delete). `submitFeedback` upserts on `(analysis_id, user_id)`; passing `rating = null` deletes the row (toggle-off). The `FeedbackThumbs` DS primitive enforces a 200-character comment limit.

```sql
create table analysis_feedback (
  analysis_id   uuid not null references analyses(id) on delete cascade,
  user_id       uuid not null references auth.users(id),
  rating        text not null check (rating in ('up','down')),
  comment       text check (comment is null or char_length(comment) <= 200),
  primary key (analysis_id, user_id)
);
```

---

### Step 10 — T19: Export trigger button

`export-button.tsx` reads `REPORT_EXPORT_ENABLED` from `NEXT_PUBLIC_REPORT_EXPORT_ENABLED`. When disabled (current state), it renders a `<button disabled>` with a "Próximamente" tooltip. No actual export logic is in this spec — `report-export` owns that pipeline.

---

### Step 11 — T20: ExtractionLoading stepper + status polling

`ExtractionLoading` renders the same 4-step stepper visual as T5's upload progress screen. An `ExtractionStatusPoller` child component polls `/api/analyses/[id]/status` every 5 seconds and calls `router.refresh()` on terminal status (`completed | partial | failed`). A `setTimeout` safety cap at 10 minutes stops polling if the pipeline hangs.

```ts
export const STAGE_DISPLAY: Record<ExtractionStage, { label: string; description: string }> = {
  extraccion: { label: 'Extracción', description: 'Leyendo el pliego' },
  analisis:   { label: 'Análisis',   description: 'Identificando requisitos' },
  evaluacion: { label: 'Evaluación', description: 'Calculando el semáforo' },
  validacion: { label: 'Validación', description: 'Guardando los resultados' },
};
```

---

## 6. Tests Written

### Unit tests — `src/__tests__/`

| Test file | Tests | What it checks |
|-----------|-------|----------------|
| `analysis-detail.test.ts` | 4 | RLS null return, full aggregate map, feedback mapping, flagged pages |
| `proceso-header.test.tsx` | 6 | Verified branch (5 metadata fields, SECOP II link, line-clamp); unverified (amber chip, no link) |
| `verdict-banner.test.tsx` | 12 | 3 verdict branches, `computeVerdictCounts` reducer, no edit affordance (2 tests) |
| `requisito-row.test.tsx` | 16 | Collapse/expand state, severity sort, tipo filter, Quote primitive (4 each) |
| `pdf-viewer.test.tsx` | 4 | initialPage navigation, quote-not-found chip, null quote, closed renders null |
| `pliego-url-route.test.ts` | 3 | 401 unauthenticated, 404 RLS miss, 200 success |
| `rerun-button.test.tsx` | 5 | Dialog confirmation, error inline, navigation on success |
| `rerun-analysis.test.ts` | 5 | INSERT-only (no UPDATE assertion), RLS miss → null, ProfileMissingError |
| `extraction-warning.test.tsx` | 11 | Null renders nothing, partial (amber + drawer), failed (red + RerunButton) |
| `submit-feedback.test.ts` | 8 | Upsert up, upsert down, delete toggle-off, auth check, 200-char limit |
| `feedback-thumbs.test.tsx` | 9 | Active state, comment input, "Enviar" submit, toast "Gracias por tu opinión" |
| `export-button.test.tsx` | 4 | Label, disabled state, tooltip copy, no-throw on click |
| `extraction-loading.test.tsx` | 8 | No spinner when completed, 4-step stepper renders, polling stops on terminal, API route 401/404/200 |

### Integration tests — `src/__tests__/analysis-detail-rls.integration.test.ts`

| Test | What it checks |
|------|----------------|
| Foreign-company analysis returns null | RLS policy on `analyses.company_id` prevents cross-tenant reads |

---

## 7. What to Watch Out For

- **`supabase/migrations/20260512000000_create_analysis_feedback.sql` must be applied before deploy** — the `analysis_feedback` table and its RLS policies do not exist in the database until the migration runs. Deploying the application code first will cause runtime failures in `submitFeedback`. (Added as convention to `database.md` during ship.)
- **`react-pdf` is a client-only bundle** — `PdfViewer` is `'use client'` and registered in `rsc-purity.test.ts` as an NFR-02 exception. Do not import `react-pdf` from any RSC or server boundary.
- **Node 22 required** — `react-pdf` v9 uses `Promise.withResolvers` (Node 22+). Any environment running Node 20.x < 20.13 will fail to build. CI is now pinned to Node 22.
- **`NEXT_PUBLIC_REPORT_EXPORT_ENABLED` absent = export disabled** — the export button silently disables when the env var is absent or falsy. This is intentional. Enable only when `report-export` is shipped.
- **Signed URL TTL is 15 minutes** — the URL is fetched on button click, not on page load. Do not cache it in component state across page navigations; the parent drops it on `PdfViewer` close.
- **Flaky test: `bootstrap.test.ts` and `requisito-row.test.tsx`** — 5000 ms dynamic-import timeout under full parallel Vitest concurrency. Both pass 100 % in isolation. Fix: raise `vi.setConfig({ testTimeout: 15000 })` in the affected files. Tracked as tech debt.
- **`ExtractionStatusPoller` safety cap at 10 minutes** — if the extraction pipeline hangs, polling stops and the user sees the last-known stepper state indefinitely. A "Hubo un problema" fallback banner was not added in this revision; consider adding one in a follow-up.

---

## 8. Final Test Count

```
Test Files: 61 passed (61)
     Tests: 306 passed (306)
Type Errors: 0
   Duration: ~12 s (transform + import + tests)
```

95 new tests added for T11–T20 (all unit, 1 integration); 0 pre-existing tests broken. 1–3 tests are timeout-flaky under full parallel suite load but pass 100 % in isolation — not a logic regression.
