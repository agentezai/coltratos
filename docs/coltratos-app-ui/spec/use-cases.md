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

### UC-06: Inspect Resultado del análisis

**Main Scenario**
1. User lands on `/dashboard/analisis/[id]`
2. System renders hero card with semáforo state + requisito summary
3. User clicks a tab (e.g. "Jurídico") → tab content updates
4. User clicks an accordion row → "¿Por qué?" reasoning text expands
5. User clicks "Exportar PDF" → (stub, no-op in this spec)

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
