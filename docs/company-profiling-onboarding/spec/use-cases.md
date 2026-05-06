# Company Profiling Onboarding — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Usuario empresa | Authenticated member of an empresa; completes and edits the profile |
| Sistema | Server actions, Supabase DB, UNSPSC static catalog |

---

## User Stories

### US-01 — Completar perfil por primera vez

**As a** usuario empresa  
**I want** to fill in my company profile with RUP data in a single form  
**So that** COLTRATOS can match procesos to my capabilities from day one

### US-02 — Editar perfil post-primer guardado

**As a** usuario empresa  
**I want** to update any profile field after the initial save  
**So that** my matching scores reflect my current capabilities without affecting past verdicts

### US-03 — Ver advertencia de completitud

**As a** usuario empresa  
**I want** to see how complete my profile is at all times  
**So that** I understand how much profile data is driving my verdicts

---

## Use Case Scenarios

### UC-01 — Primer guardado {#uc-01}

**Preconditions:** User authenticated; no `company_profiles` row exists for their company

#### Main Scenario

1. User navigates to any dashboard route
2. System detects no `is_current` company_profiles row; redirects to `/onboarding`
3. Single-page form rendered with 5 sections
4. User completes Datos legales: NIT, dígito de verificación, razón social, representante legal (nombre, cédula), domicilio principal, año de constitución
5. User completes Capacidad financiera (up to 3 fiscal years), Experiencia (past contracts), Personal clave (key staff), Alcance comercial (UNSPSC codes, geography, budget)
6. User submits form
7. Server validates NIT DV, date ranges, budget constraint; computes derived financial indicators from most recent fiscal year
8. New `company_profiles` row inserted: version = 1, `is_current = true`
9. Redirect to `/dashboard`; completeness badge shows filled sections count

#### Alternative Scenarios

**5a. User skips optional sections**  
Form submits with partial data; completeness badge reflects partial state; analysis proceeds with available data

#### Error Scenarios

**7e. NIT DV incorrect**  
Server returns 422; no row written; inline error: "El dígito de verificación es incorrecto"

**7e. presupuesto_min > presupuesto_max**  
Zod error: "El presupuesto mínimo no puede ser mayor al máximo"

**7e. fecha_fin < fecha_inicio in a contract entry**  
Server returns 422; error shown on the specific entry row

**Postconditions:** `company_profiles` row exists with version = 1, `is_current = true`; user on dashboard

---

### UC-02 — Edición posterior {#uc-02}

**Preconditions:** User has existing `is_current` company_profiles row; navigates to `/dashboard/config/perfil`

#### Main Scenario

1. System loads `is_current` row and pre-fills all form fields
2. User edits one or more sections
3. User submits form
4. Server validates; computes updated derived indicators from most recent fiscal year
5. New `company_profiles` row inserted: version = previous + 1, `is_current = true`; previous row `is_current = false`
6. Completeness badge updated in dashboard

#### Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-UC02-01 | Form pre-fills all fields from the `is_current` row; no field is blank unless originally empty |
| AC-UC02-02 | On valid submit, a new `company_profiles` row is inserted with `version = previous + 1` and `is_current = true` in a single transaction |
| AC-UC02-03 | Previous `is_current` row is set to `false` in the same transaction; no intermediate state where two rows are both current |
| AC-UC02-04 | Existing `analyses` rows retain their `profile_snapshot_id` referencing the pre-edit version; verdicts are unaffected |
| AC-UC02-05 | Dashboard completeness badge reflects the new version immediately after save; redirect lands on `/dashboard` |

#### Error Scenarios

**Same validation errors as UC-01 Step 7**

**Postconditions:** New `company_profiles` version created; existing analyses still reference their original snapshot

---

### UC-03 — Completeness warning {#uc-03}

**Preconditions:** User has `is_current` profile with one or more sections incomplete

#### Main Scenario

1. User views dashboard
2. Completeness badge shows "X de 5 secciones completas"
3. User clicks badge → navigated to `/dashboard/config/perfil`
4. User fills section and saves; badge updates

#### Key Constraint

Analysis is never blocked regardless of completeness score. Badge is informational only.

**Postconditions:** User aware of profile gaps; analysis available at any completeness level

---

## UX/UI References

Design System components only — see [spec.md UX/UI section](./spec.md#uxui). Spanish labels throughout.
