# Company Profiling Onboarding — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Usuario empresa | Authenticated member of an empresa; completes and edits the profile |
| Sistema | Server actions, RUES API client, Supabase DB |

---

## User Stories

### US-01 — Completar onboarding obligatorio

**As a** usuario empresa  
**I want** to complete steps 1-3 of the onboarding wizard  
**So that** I can access the dashboard and see matching procesos from day one

### US-02 — Definir capacidades técnicas

**As a** usuario empresa  
**I want** to select my UNSPSC codes and enter experience data  
**So that** the matching engine can filter procesos relevant to my activity

### US-03 — Auto-rellenar desde RUES

**As a** usuario empresa  
**I want** the system to pre-fill my empresa data from RUES using my NIT  
**So that** I don't have to type information that is already publicly registered

### US-04 — Completar dimensión financiera

**As a** usuario empresa  
**I want** to enter my last fiscal year's financial statements  
**So that** COLTRATOS can evaluate my eligibility for pliegos with financial thresholds (Layer 2)

### US-05 — Completar dimensión jurídica

**As a** usuario empresa  
**I want** to enter my RUP data, certifications, and declare my antecedentes  
**So that** COLTRATOS can check my legal eligibility and certification requirements

### US-06 — Editar perfil post-onboarding

**As a** usuario empresa  
**I want** to update any profile field after onboarding  
**So that** my matching scores reflect my current state

### US-07 — Ver puertas contextuales

**As a** usuario empresa  
**I want** to be prompted to complete my financial profile when I open a pliego that requires it  
**So that** I understand exactly why I need the information and can complete it in context

---

## Use Case Scenarios

### UC-01 — Onboarding obligatorio (US-01, US-02) {#uc-01}

**Preconditions:** User authenticated; no `empresa_perfil` row exists for their empresa

#### Main Scenario

1. User navigates to any dashboard route
2. System detects missing `empresa_perfil`; redirects to `/onboarding`
3. User completes Step 1 (Identidad legal): NIT, razon_social, tipo_societario, representante_legal_nombre, email_corporativo
4. User completes Step 2 (Dimensión Técnica): selects UNSPSC codes, enters experiencia_general_smmlv, anios_experiencia, numero_empleados
5. User completes Step 3 (Preferencias): sets departamentos_interes, modalidades_interes, presupuesto range
6. System upserts `empresa_perfil`; `completitud_tecnica = true`
7. System redirects to `/dashboard` — Layer 1 matching active

#### Alternative Scenarios

**3a. RUES returns data (UC-02)**  
System pre-fills razon_social, tipo_societario, representante_legal_nombre; user reviews and confirms

**3b. User on Step 2 or 3 refreshes page**  
Partially completed data preserved in server-side session or local state; user resumes from last completed step

#### Error Scenarios

**3e. User submits Step 1 with invalid NIT DV**  
Inline validation error; cannot advance until corrected

**5e. User submits Step 3 with presupuesto_min > presupuesto_max**  
Zod validation error shown inline; form does not submit

**Postconditions:** `empresa_perfil` row exists; `completitud_tecnica = true`; user on dashboard

---

### UC-02 — RUES auto-fill {#uc-02}

**Preconditions:** User on Step 1; NIT field populated

#### Main Scenario

1. User enters NIT and field loses focus
2. System sends NIT to `/api/empresa/rues-lookup`
3. RUES API responds within 2s
4. System pre-fills razon_social, tipo_societario, representante_legal_nombre with RUES data
5. User confirms or edits pre-filled values

#### Alternative Scenarios

**2a. RUES API timeout or error**  
After 2s AbortController fires; form shows "No encontramos tu empresa en RUES. Completa manualmente."; fields remain empty and editable

**4a. RUES returns partial data**  
Only available fields pre-filled; rest remain editable

**Postconditions:** Fields either pre-filled from RUES or filled manually by user; onboarding not blocked

---

### UC-03 — Dimensión financiera {#uc-03}

**Preconditions:** User has completed steps 1-3; `completitud_financiera = false`

#### Main Scenario

1. User navigates to `/dashboard/config/perfil` or clicks completitud banner CTA
2. System renders Step 4 (Dimensión Financiera)
3. User enters estados financieros fields: patrimonio_neto, activos_totales, activos_corrientes, pasivos_totales, pasivos_corrientes, ingresos_operacionales, utilidad_operacional, gastos_intereses
4. System shows calculated indicators (read-only preview): indice_liquidez, indice_endeudamiento, razon_cobertura_int
5. User submits
6. System upserts financial fields; generated columns materialized; `completitud_financiera = true`
7. Banner disappears from dashboard

#### Error Scenarios

**5e. activos_corrientes > activos_totales**  
Zod `.refine()` error; cannot submit

**Postconditions:** `completitud_financiera = true`; financial indicators available for Layer 2 matching

---

### UC-04 — Dimensión jurídica {#uc-04}

**Preconditions:** User has completed steps 1-3; `completitud_juridica = false`

#### Main Scenario

1. User navigates to Step 5 (Dimensión Jurídica)
2. System renders RUP fields, certificaciones input, antecedentes checkboxes
3. If UNSPSC primary codes include regulated sectors, conditional habilitaciones sectoriales fields appear
4. User fills fields and checks disclaimer acknowledgement
5. User submits
6. System logs `declaracion_antecedentes_at = now()` and `declaracion_antecedentes_ip` from request
7. `completitud_juridica = true`

#### Error Scenarios

**5e. User submits without checking disclaimer**  
Submission blocked; disclaimer checkbox highlighted with error

**Postconditions:** `completitud_juridica = true`; declaration logged with timestamp and IP

---

### UC-05 — Edición posterior {#uc-05}

**Preconditions:** User has completed onboarding; navigates to `/dashboard/config/perfil`

#### Main Scenario

1. System renders all 5 steps in edit mode; existing values pre-filled
2. User edits any field and submits the affected step
3. Server action validates and upserts changed fields
4. Generated columns recompute automatically

**Postconditions:** Updated `empresa_perfil` row; matching scores reflect new data on next query

---

### UC-06 — Contextual gate before analysis {#uc-06}

**Preconditions:** User with `completitud_financiera = false`; opens pliego that requires financial thresholds

#### Main Scenario

1. User clicks "Iniciar análisis" on a pliego
2. System checks `completitud_financiera`; finds it false
3. System checks pliego for financial threshold requirements; finds patrimonio mínimo or liquidez threshold
4. Gate modal shown: "Este pliego exige [threshold]. Completa tu perfil financiero para evaluarte automáticamente."
5. User clicks "Completar ahora" → navigated to Step 4
6. On return, analysis starts automatically

#### Alternative Scenarios

**4a. User dismisses modal**  
Analysis starts in Layer 1 mode; financial habilitantes not evaluated; verdict marked `unverified` for financial dimension

**Postconditions:** Analysis starts with correct depth level based on profile completeness

---

## UX/UI References

Design references pending — see [spec.md UX/UI section](./spec.md#uxui).
