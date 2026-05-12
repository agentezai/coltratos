# Use Cases: coltratos-app-ui

## Actors

| Actor | Description |
|-------|-------------|
| Analista | Authenticated empresa member who uploads pliegos and reviews results |
| Administrador | Analista with additional team and billing management access |

## User Stories

| ID | Story |
|----|-------|
| US-01 | As an Analista, I want to see a summary of my recent activity on login, so that I can quickly assess what needs attention |
| US-02 | As an Analista, I want to browse and filter my tracked procesos, so that I can prioritize which to work on |
| US-03 | As an Analista, I want to upload a pliego linked to a proceso, so that the system can analyze my eligibility |
| US-04 | As an Analista, I want to see live progress while my pliego is being analyzed, so that I know when the result is ready |
| US-05 | As an Analista, I want to review all past análisis with filtering, so that I can audit my history |
| US-06 | As an Analista, I want to inspect an eligibility result in detail, so that I understand what to fix before submitting a bid |
| US-07 | As an Administrador, I want to view and purchase credits, so that the team can continue running analyses |
| US-08 | As an Administrador, I want to manage team members and their roles, so that the right people have the right access |

## Use Case Scenarios

### UC-01: View Dashboard

**Main Scenario**
1. User lands on `/dashboard` after login
2. System displays 4 stat cards with 30-day metrics
3. System displays table of last 5 análisis
4. User clicks a row → navigates to `/dashboard/analisis/[id]`

**Alternative**: No recent análisis → table shows empty state with CTA to upload.

---

### UC-02: Browse Procesos

**Main Scenario**
1. User navigates to `/dashboard/procesos`
2. System shows 4 count cards + full table of tracked procesos
3. User types in search box → table filters in real time
4. User selects Semáforo filter → table narrows to matching rows
5. User clicks upload icon on a row → navigates to `/dashboard/upload?procesoId=…`

**Error**: No procesos match filters → table shows "Sin resultados" row.

---

### UC-03: Upload pliego

**Main Scenario**
1. User navigates to `/dashboard/upload`
2. User selects "Elegir proceso" mode, picks from dropdown → preview card appears
3. User drags a PDF onto the dropzone → file row appears with green "Archivo cargado" chip
4. "Iniciar análisis" button enables
5. User clicks → navigates to progress step

**Alternative — SECOP II URL**
1. User selects "Pegar URL o ID SECOP II"
2. User pastes URL/ID, clicks Verificar
3. System shows "Proceso encontrado" card after mock 800ms delay

**Alternative — Crear nuevo**
1. User selects "Crear nuevo"
2. User fills número, nombre, entidad, modalidad fields
3. Any file upload enables "Iniciar análisis"

**Error**: No file selected → "Iniciar análisis" stays disabled regardless of proceso mode.

---

### UC-04: Monitor analysis progress

**Main Scenario**
1. System shows progress step (reached after clicking "Iniciar análisis")
2. Stepper shows step 2 active (Análisis y segmentación)
3. Progress ring at 42%, check rows show done/active/pending states
4. User clicks "Ver resultado (demo)" → navigates to `/dashboard/analisis/ANA-2026-00048`

---

### UC-05: Browse Mis Análisis

**Main Scenario**
1. User navigates to `/dashboard/analisis`
2. System shows 5 stat cards + table of all 8 análisis
3. User filters by Semáforo = "Elegible" → table narrows
4. User clicks "Ver análisis" button on a row → navigates to detail

---

### UC-06: Inspect Resultado del análisis (real-data)

**Main Scenario**
1. User lands on `/dashboard/analisis/[id]`
2. Server reads `analyses + verdicts + requisitos + pliego_uploads + procesos` (RLS-scoped via `auth.company_id()`)
3. System renders the metadata header strip from `proceso_metadata_snapshot` (entidad, objeto, modalidad, valor estimado, fecha de cierre, "Ver en SECOP II" link)
4. System renders the verdict banner with the overall verdict, count summary, and one-sentence narrative
5. User clicks a tab (Resumen / Jurídico / Técnico / Financiero) → tab content updates with requisitos of that `tipo`
6. User clicks an accordion row → row expands showing full requisito text, verdict reason, source-quote citation, "Abrir página en PDF" button
7. User clicks "Abrir página en PDF" → see UC-09
8. User clicks "Volver a analizar" → see UC-10
9. User clicks "Exportar PDF" → trigger fires the `report-export` feature (out of this spec's implementation scope)
10. User clicks thumbs-up or thumbs-down → see UC-11

**Alternative — `proceso_lookup_status = unverified`**
- Header strip renders an explicit "Datos ingresados manualmente" badge alongside the metadata fields. The "Ver en SECOP II" link is hidden or replaced with a "No disponible" state.

**Alternative — partial extraction**
- A warning banner above the verdict displays "X páginas no fueron legibles". User clicks "Ver detalles" to see the list of flagged pages.

**Loading state**
- While `extraction_status ∈ {pending, extracting}`, the page renders the step-tied loader (Extracción → Análisis → Evaluación → Validación) using `extraction_stage`.

**Error**
- Analysis not found / not owned by user's company → 404. Pliego file missing / signed URL fails → "Abrir página en PDF" disabled with tooltip "Documento no disponible".

---

### UC-09: Open source citation in PDF viewer

**Main Scenario**
1. User clicks "Abrir página en PDF" on an expanded requisito row
2. Client opens the PdfViewer (modal on `< lg`, side panel on `≥ lg`)
3. Server returns a fresh signed URL (15-min TTL) for `pliego_uploads.file_storage_key` after RLS check
4. Viewer loads the PDF and navigates to `pagina_fuente`
5. Viewer highlights `quote_fuente` (text-search strategy per S6 Flag F-2)
6. User reviews the source quote, closes the viewer, returns to the result page

**Alternative — quote not found in rendered text**
- Viewer shows a "Cita no encontrada en esta página" chip; the page is still navigated to `pagina_fuente` so the user can locate the quote manually

**Error**
- Signed URL fails → toast "No pudimos abrir el documento. Intenta de nuevo." Viewer does not open.

---

### UC-10: Re-run analysis with current company profile

**Main Scenario**
1. User clicks "Volver a analizar" on the Resultado page
2. Confirmation dialog: "Esto creará un nuevo análisis con tu perfil actual. El análisis original se mantendrá."
3. User confirms → server action inserts a new `analyses` row with the same `pliego_upload_id` and the user's current company-profile snapshot
4. Per S6 Flag F-3 (option b): user is navigated to `/dashboard/analisis/<new-id>` showing the loading state from REQ-028
5. When the new analysis completes, the page renders the new verdict
6. The original analysis remains accessible at its prior URL and in `/dashboard/analisis` history

**Error**
- Re-run insert fails (DB error, quota exceeded, etc.) → toast with the reason; user stays on the original analysis page.

---

### UC-11: Submit relevance feedback

**Main Scenario**
1. User clicks thumbs-up or thumbs-down on the hero verdict
2. Optional one-line comment field appears
3. User types up to 200 chars (or leaves empty) and submits
4. Server action upserts a row in `analysis_feedback` keyed on `(analysis_id, user_id)`
5. UI shows a confirmation chip ("Gracias por tu opinión")

**Idempotency**
- Re-clicking the same thumb removes the feedback (toggle). Clicking the opposite thumb updates the existing row.

---

### UC-07: Manage Créditos

**Main Scenario**
1. User navigates to `/dashboard/creditos`
2. System shows navy balance card (22 créditos), usage summary, bar chart
3. User selects "Paquete Pro" radio → visual selection updates
4. User clicks "Continuar con la compra" → (stub in this spec)
5. Invoice table shows past purchases with download/view actions

---

### UC-08: Manage Equipo

**Main Scenario**
1. Administrador navigates to `/dashboard/equipo`
2. System shows 4 stat cards + member table
3. Admin searches for a member name → table filters
4. Admin clicks "Invitar miembro" → (stub in this spec)
