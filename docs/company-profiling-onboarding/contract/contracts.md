# TDD Contract: company-profiling-onboarding (Rev 2)

---

## Task T1: Domain Primitives & Zod Schemas

### Behavior: NIT DV validation — valid NIT accepted (REQ-002, NFR-05)

**Given** a valid NIT with correct DV (e.g., "830115396" with DV = 7)  
**When** `validarDigitoVerificacion('830115396', 7)` called  
**Then** returns `true`

**Test file:** `src/__tests__/company-profile-validators.test.ts`  
**Framework:** vitest

---

### Behavior: NIT DV validation — invalid DV rejected (REQ-002, RN-002)

**Given** NIT "830115396" with incorrect DV = 5  
**When** `validarDigitoVerificacion('830115396', 5)` called  
**Then** returns `false`

**Test file:** `src/__tests__/company-profile-validators.test.ts`  
**Framework:** vitest

---

### Behavior: Financial indicators — liquidez computed correctly (REQ-005, RN-005)

**Given** ejercicios with most recent year: activo_corriente = 800, pasivo_corriente = 400  
**When** `computarIndicadoresFinancieros([{ ejercicio: 2024, activo_corriente: 800, pasivo_corriente: 400, ... }])` called  
**Then** returns `{ liquidez_corriente: 2.0, ... }`

**Test file:** `src/__tests__/company-profile-validators.test.ts`  
**Framework:** vitest

---

### Behavior: Financial indicators — null-guard on division by zero (NFR-07, RN-005)

**Given** most recent year with pasivo_corriente = 0  
**When** `computarIndicadoresFinancieros([{ pasivo_corriente: 0, ... }])` called  
**Then** returns `{ liquidez_corriente: null, ... }`

**Test file:** `src/__tests__/company-profile-validators.test.ts`  
**Framework:** vitest

---

### Behavior: Financial indicators — empty array returns all null (RN-005)

**Given** empty ejercicios array  
**When** `computarIndicadoresFinancieros([])` called  
**Then** returns `{ liquidez_corriente: null, nivel_endeudamiento: null, capital_de_trabajo: null }`

**Test file:** `src/__tests__/company-profile-validators.test.ts`  
**Framework:** vitest

---

### Behavior: CompanyProfileSchema rejects presupuesto_min > presupuesto_max (REQ-014, RN-014)

**Given** form data with presupuesto_min_cop = 5000000, presupuesto_max_cop = 1000000  
**When** `CompanyProfileSchema.safeParse(data)` called  
**Then** `result.success === false`; error message is "El presupuesto mínimo no puede ser mayor al máximo"

**Test file:** `src/__tests__/company-profile-validators.test.ts`  
**Framework:** vitest

---

### Behavior: ContratoPrevioSchema rejects invalid date range (REQ-016, RN-016)

**Given** entry with fecha_inicio = "2024-06-01", fecha_fin = "2024-01-01"  
**When** `ContratoPrevioSchema.safeParse(entry)` called  
**Then** `result.success === false`

**Test file:** `src/__tests__/company-profile-validators.test.ts`  
**Framework:** vitest

---

## Task T2: DB Migration

### Behavior: Versioning constraint — duplicate (company, version) rejected (RN-009)

**Given** company_profiles row with company_id = X, version = 1 exists  
**When** INSERT with same company_id = X, version = 1  
**Then** unique constraint violation

**Test file:** `supabase/migrations/tests/company_profiles.test.sql`  
**Framework:** pgTAP (or manual verification)

---

### Behavior: GIN index enables @> operator query (REQ-008, RN-008)

**Given** row with unspsc_codes = ARRAY['72131500', '81111500']  
**When** query: `SELECT * FROM company_profiles WHERE unspsc_codes @> '{72131500}'`  
**Then** row returned; EXPLAIN shows index scan

**Test file:** manual DB verification  
**Framework:** psql

---

### Behavior: RLS blocks cross-company read (REQ-015, RN-015)

**Given** company B user JWT; company A profile row in DB  
**When** `SELECT * FROM company_profiles` executed as company B user  
**Then** company A rows not returned

**Test file:** `supabase/tests/rls_company_profiles.sql`  
**Framework:** pgTAP

---

## Task T6: Server Actions

### Behavior: First save creates version 1 (REQ-009, RN-009)

**Given** no existing company_profiles rows for company  
**When** `saveCompanyProfile(validFormData)` called  
**Then** new row with version = 1, is_current = true

**Test file:** `src/__tests__/actions/save-company-profile.test.ts`  
**Framework:** vitest (with Supabase test client)

---

### Behavior: Second save creates version 2 and flips is_current (REQ-009, RN-009)

**Given** existing row with version = 1, is_current = true  
**When** `saveCompanyProfile(validFormData)` called again  
**Then** new row version = 2, is_current = true; previous row is_current = false

**Test file:** `src/__tests__/actions/save-company-profile.test.ts`  
**Framework:** vitest

---

### Behavior: Invalid NIT DV causes no DB write (REQ-002)

**Given** form data with invalid DV  
**When** `saveCompanyProfile(data)` called  
**Then** returns `{ ok: false, error }` without inserting any row

**Test file:** `src/__tests__/actions/save-company-profile.test.ts`  
**Framework:** vitest

---

## Task T8: Dashboard Completeness Badge

### Behavior: Null profile returns score 0 (REQ-011, RN-011)

**Given** `computeCompleteness(null)` called  
**When** —  
**Then** returns `{ score: 0, total: 5 }`

**Test file:** `src/__tests__/utils/profile-completeness.test.ts`  
**Framework:** vitest

---

### Behavior: Analysis proceeds without completeness gate (REQ-011, RN-011)

**Given** profile with score = 2 (3 sections missing)  
**When** user clicks "Iniciar análisis"  
**Then** analysis starts; no modal or redirect blocks it

**Test file:** e2e or manual smoke test  
**Framework:** manual
