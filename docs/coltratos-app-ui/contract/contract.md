# TDD Contract: coltratos-app-ui

## T1: Nav shell wiring

### Behavior: Active nav item matches current pathname (REQ-019)

**Given** the user is on `/dashboard/procesos`
**When** the Sidebar renders
**Then** the "Procesos" nav item has the active class and "Dashboard" does not

**Test file:** `src/__tests__/nav-shell.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: Sidebar collapse hides labels (REQ-020)

**Given** Sidebar is rendered with `collapsed={true}`
**When** the component renders
**Then** nav labels, user-info text, and credits card are not visible in the DOM

**Test file:** `src/__tests__/nav-shell.test.tsx`

---

## T2: Shared primitives

### Behavior: SemPill maps semáforo to correct Chip variant (RN-002)

**Given** `<SemPill status="eligible"/>`
**When** rendered
**Then** renders a Chip with `variant="green"` and text "Elegible"

**Given** `<SemPill status="conditional"/>`
**Then** renders `variant="amber"` and text "Con observaciones"

**Given** `<SemPill status="not-eligible"/>`
**Then** renders `variant="red"` and text "No elegible"

**Test file:** `src/__tests__/sem-pill.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: Mock data exports typed constants

**Given** import of `ANALISIS` from `src/lib/mock`
**When** TypeScript compiles
**Then** `ANALISIS[0].sem` is assignable to `"eligible" | "conditional" | "not-eligible"`

**Test file:** `src/__tests__/mock-data.test-d.ts`
**Framework:** vitest type tests

---

## T5: Upload flow

### Behavior: "Iniciar análisis" disabled without proceso (REQ-003, RN-004)

**Given** the Upload page with no proceso selected and a file loaded
**When** rendered
**Then** the "Iniciar análisis" button has `disabled={true}`

**Given** a proceso selected and no file
**Then** the button still has `disabled={true}`

**Given** a proceso selected AND a file
**Then** the button has `disabled={false}`

**Test file:** `src/__tests__/upload-flow.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: URL verification mock flow

**Given** the URL mode selected with a non-empty URL value
**When** "Verificar" is clicked
**Then** after 800ms, `urlStatus` becomes "found" and the found card is visible

**Test file:** `src/__tests__/upload-flow.test.tsx`

---

## T7: Resultado del análisis

### Behavior: Accordion toggle (REQ-009)

**Given** the ResultTabs component with mock reqs
**When** user clicks the first accordion row
**Then** the body text becomes visible and chevron has `rotate(180deg)` transform

**When** user clicks the same row again
**Then** the body text is hidden

**Test file:** `src/__tests__/result-tabs.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: Tab switching

**Given** the ResultTabs component
**When** user clicks the "Jurídico" tab
**Then** the "Jurídico" tab has the active class and "Resumen" does not

**Test file:** `src/__tests__/result-tabs.test.tsx`

---

## T11: Result real-data loader

### Behavior: RLS isolates analyses by company (NFR-07)

**Given** an analysis row owned by `company_a`
**When** `getAnalysisDetail(id, 'company_b')` is called
**Then** it returns `null`
**And** no `analysis_feedback`, `verdicts`, or `pliego_uploads` rows are leaked

**Test file:** `src/__tests__/integration/analysis-detail.rls.test.ts`
**Framework:** vitest + Supabase test schema

### Behavior: Single-query aggregate

**Given** an analysis with N requisitos
**When** `getAnalysisDetail(id, companyId)` is called
**Then** exactly 1 SQL query is issued (asserted via Kysely query log)
**And** the returned aggregate contains all N requisitos with their verdicts

**Test file:** `src/__tests__/integration/analysis-detail.test.ts`

---

## T12: Proceso header

### Behavior: Renders verified branch (REQ-014)

**Given** an analysis with `proceso_lookup_status = 'verified'`
**When** `<ProcesoHeader detail={...}/>` renders
**Then** the "Ver en SECOP II" link is visible with the correct `numero_proceso`-encoded href
**And** no "Datos ingresados manualmente" badge is present

### Behavior: Renders unverified branch (RN-009)

**Given** an analysis with `proceso_lookup_status = 'unverified'`
**Then** the "Datos ingresados manualmente" amber chip is visible
**And** the "Ver en SECOP II" link is replaced with "No disponible"

**Test file:** `src/__tests__/proceso-header.test.tsx`

---

## T13: Verdict banner

### Behavior: SemPill canonical mapping (RN-002)

**Given** `<SemPill status="verde"/>`
**Then** renders Chip variant `green`, label "Cumple"

**Given** `<SemPill status="amarillo"/>`
**Then** Chip variant `amber`, label "Con observaciones"

**Given** `<SemPill status="rojo"/>`
**Then** Chip variant `red`, label "No cumple"

**Given** `<SemPill status="eligible"/>` (legacy)
**Then** Chip variant `green`, label "Elegible"

**Test file:** `src/__tests__/sem-pill.test.tsx`

### Behavior: No verdict-edit affordance (RN-006)

**Given** `<VerdictBanner detail={...}/>` with any verdict
**When** rendered
**Then** there is no element with role `textbox`, `combobox`, `slider`, or any input that affects the verdict
**And** the only writable controls are the re-run, export, and feedback buttons

**Test file:** `src/__tests__/verdict-banner.test.tsx`

---

## T14: Requisito row + citation

### Behavior: Citation block shows quote + page (REQ-022)

**Given** a requisito with `quote_fuente = "El proponente debe..."` and `pagina_fuente = 12`
**When** the row is expanded
**Then** the quote is rendered in italic with a left-border accent
**And** the footer reads "Página 12 del pliego"
**And** a button labeled "Abrir página en PDF" is present

### Behavior: Missing citation forces amarillo (RN-008)

**Given** a requisito with `quote_fuente = null` (data layer marks verdict as `amarillo`)
**When** the row is expanded
**Then** the citation block reads "Cita no disponible — verifica manualmente en el pliego."

**Test file:** `src/__tests__/requisito-row.test.tsx`

---

## T15: PDF viewer + signed URL

### Behavior: Signed URL is RLS-scoped (NFR-07)

**Given** an analysis owned by `company_a`
**When** `POST /api/analyses/<id>/pliego-url` is called by a session of `company_b`
**Then** the response is 404
**And** no signed URL is generated

**Test file:** `src/__tests__/integration/pliego-url.test.ts`

### Behavior: Quote-not-found shows chip, not silent fail (REQ-023)

**Given** the PdfViewer is opened with `highlightQuote = "X"` and a page where "X" is not in the rendered text
**When** the page renders
**Then** an amber chip "Cita no encontrada en esta página" is visible
**And** the page is still navigated to `initialPage`

**Test file:** `src/__tests__/pdf-viewer.test.tsx`

---

## T16: Re-run action

### Behavior: Re-run inserts new row, never mutates (RN-007)

**Given** an analysis `A1` with `created_at = T1`
**When** `rerunAnalysis(A1.id)` is called
**Then** a new analysis `A2` exists with `pliego_upload_id = A1.pliego_upload_id` and `proceso_id = A1.proceso_id`
**And** `A1` row is byte-identical to its pre-call state (verified by snapshot)
**And** `A2.id !== A1.id`

**Test file:** `src/__tests__/integration/rerun-analysis.test.ts`

### Behavior: RLS prevents cross-company re-run

**Given** an analysis `A1` owned by `company_a`
**When** `rerunAnalysis(A1.id)` is called by a session of `company_b`
**Then** a `NotFoundError` is thrown
**And** no insert happens

**Test file:** `src/__tests__/integration/rerun-analysis.test.ts`

---

## T17: Partial-extraction warning

### Behavior: Banner appears above verdict (RN-010)

**Given** an analysis with `pages_flagged = 3`
**When** the page renders
**Then** the warning banner appears in DOM order **before** the verdict banner (asserted via DOM position)
**And** the banner has no dismiss button

**Test file:** `src/__tests__/extraction-warning.test.tsx`

### Behavior: Failed extraction replaces verdict

**Given** an analysis with `extraction_status = 'failed'`
**When** the page renders
**Then** the verdict banner is **not** in the DOM
**And** a red banner with "Volver a analizar" CTA is visible

**Test file:** `src/__tests__/extraction-warning.test.tsx`

---

## T18: Relevance feedback

### Behavior: Upsert on submit (REQ-026)

**Given** no feedback row exists for `(analysisId, userId)`
**When** `submitFeedback({ analysisId, rating: 'up', comment: 'útil' })` is called
**Then** a row is inserted

**Given** an existing feedback row with rating `'down'`
**When** `submitFeedback({ analysisId, rating: 'up' })` is called
**Then** the row is updated (rating = 'up'); a unique-constraint violation does **not** occur

**Test file:** `src/__tests__/integration/submit-feedback.test.ts`

### Behavior: Toggle-off deletes the row

**Given** an existing feedback row with rating `'up'`
**When** `submitFeedback({ analysisId, rating: null })` is called
**Then** the row is deleted

**Test file:** `src/__tests__/integration/submit-feedback.test.ts`

### Behavior: RLS scopes feedback by company

**Given** an analysis owned by `company_a`
**When** a `company_b` user calls `submitFeedback`
**Then** the insert is rejected by the RLS policy (SQLState `42501`)

**Test file:** `src/__tests__/integration/submit-feedback.rls.test.ts`

---

## T19: Export trigger

### Behavior: Disabled placeholder when `report-export` not shipped (REQ-025)

**Given** `NEXT_PUBLIC_REPORT_EXPORT_ENABLED = 'false'`
**When** the export button renders
**Then** the button has `disabled={true}`
**And** the tooltip shows "Próximamente — exportar a PDF estará disponible en la siguiente versión"

**Test file:** `src/__tests__/export-button.test.tsx`

---

## T20: Loading states

### Behavior: No generic spinner (REQ-028)

**Given** an analysis with `extraction_status = 'extracting'` and `extraction_stage = 'analisis'`
**When** the loading screen renders
**Then** a 4-step stepper is visible with stage 2 active
**And** there is **no** generic spinner element (assert by query)

### Behavior: Polling stops on terminal status

**Given** the poller mounted with `extraction_status = 'extracting'`
**When** the status endpoint returns `extraction_status = 'completed'`
**Then** the polling interval is cleared
**And** `router.refresh()` is called once

**Test file:** `src/__tests__/extraction-loading.test.tsx`
