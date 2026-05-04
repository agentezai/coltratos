# Company Profiling Onboarding — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Usuario empresa | Authenticated member of an empresa; completes and edits the profile |
| Sistema | Server actions, RUES API client, Supabase DB |

---

## User Stories

### US-01 — Completar perfil por primera vez

**As a** usuario empresa  
**I want** to fill in my company profile with RUP data in a single form  
**So that** COLTRATOS can match procesos to my capabilities from day one

### US-02 — Auto-rellenar datos legales desde RUES

**As a** usuario empresa  
**I want** the system to pre-fill my legal data from RUES using my NIT  
**So that** I don't have to type publicly registered information manually

### US-03 — Editar perfil post-primer guardado

**As a** usuario empresa  
**I want** to update any profile field after the initial save  
**So that** my matching scores reflect my current capabilities without affecting past verdicts

### US-04 — Ver advertencia de completitud

**As a** usuario empresa  
**I want** to see how complete my profile is at all times  
**So that** I understand how much profile data is driving my verdicts

---

## Use Case Scenarios

### UC-01 — Primer guardado {#uc-01}

**Preconditions:** User authenticated; no company_profiles row exists for their company

#### Main Scenario

1. User navigates to any dashboard route
2. System detects no is_current company_profiles row; redirects to `/onboarding`
3. Single-page form rendered with 5 sections
4. User enters NIT → RUES lookup triggered; legal fields pre-filled on success
5. User completes remaining sections (Capacidad financiera, Experiencia, Personal clave, Alcance comercial)
6. User submits form
7. Server validates NIT DV, date ranges, budget constraint; computes derived financial indicators
8. New company_profiles row inserted: version = 1, is_current = true
9. Redirect to `/dashboard`; completeness badge shows filled sections count

#### Alternative Scenarios

**4a. RUES returns data (UC-02)**  
Fields razon_social, representante_legal_nombre pre-filled; user reviews and may edit

**4b. RUES timeout or error**  
Form shows "No encontramos tu empresa en RUES. Completa manualmente."; fields remain editable; onboarding not blocked

**5a. User skips optional sections**  
Form submits with partial data; completeness badge reflects partial state; analysis proceeds with available data

#### Error Scenarios

**7e. NIT DV incorrect**  
Server returns 422; no row written; inline error shown: "El dígito de verificación es incorrecto"

**7e. presupuesto_min > presupuesto_max**  
Zod validation error: "El presupuesto mínimo no puede ser mayor al máximo"

**7e. fecha_fin < fecha_inicio in a contract entry**  
Server returns 422; error shown on the specific entry row

**Postconditions:** company_profiles row exists with version = 1, is_current = true; user on dashboard

---

### UC-02 — RUES auto-fill {#uc-02}

**Preconditions:** User on profile form; NIT field populated

#### Main Scenario

1. User enters NIT and field loses focus
2. System sends NIT to `POST /api/empresa/rues-lookup`
3. RUES API responds within 2s
4. Fields pre-filled: razon_social, representante_legal_nombre
5. User confirms or edits pre-filled values

#### Alternative Scenarios

**3a. RUES API timeout or error**  
After 2s AbortController fires; "No encontramos tu empresa en RUES. Completa manualmente." shown; fields remain editable; form not blocked

**4a. Partial RUES data**  
Only available fields pre-filled; rest remain empty and editable

**Postconditions:** Fields pre-filled from RUES or left for manual entry; form submission never blocked by RUES outcome

---

### UC-03 — Edición posterior {#uc-03}

**Preconditions:** User has an existing is_current company_profiles row; navigates to `/dashboard/config/perfil`

#### Main Scenario

1. System loads is_current row and pre-fills all form fields
2. User edits one or more sections
3. User submits form
4. Server validates; computes updated derived indicators from most recent fiscal year
5. New company_profiles row inserted: version = previous + 1, is_current = true; previous row is_current = false
6. Completeness badge updated in dashboard

#### Error Scenarios

**Same validation errors as UC-01 Step 7**

**Postconditions:** New company_profiles version created; existing analyses still reference their original snapshot; matching scores use new version on next query

---

### UC-04 — Completeness warning {#uc-04}

**Preconditions:** User has is_current profile with one or more sections incomplete

#### Main Scenario

1. User views dashboard
2. Completeness badge shows "X de 5 secciones completas"
3. User clicks badge → navigated to `/dashboard/config/perfil` with incomplete section highlighted
4. User fills section and saves
5. Badge updates

#### Key Constraint

Analysis is never blocked regardless of completeness score. Badge is informational only.

**Postconditions:** User aware of profile gaps; analysis available at any completeness level

---

## UX/UI References

Design System components only — see [spec.md UX/UI section](./spec.md#uxui). Spanish labels throughout.
