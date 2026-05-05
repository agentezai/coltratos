# Verification Plan — company-profiling-onboarding (Rev 2)

## T1: Domain Primitives & Zod Schemas

### Test Scenarios
- `validarDigitoVerificacion` accepts valid NITs; rejects NITs with incorrect DV
- `CompanyProfileSchema` fails when presupuesto_min > presupuesto_max
- `ContratoPrevioSchema` fails when fecha_fin < fecha_inicio
- `computarIndicadoresFinancieros` with pasivo_corriente = 0 → liquidez_corriente = null
- `computarIndicadoresFinancieros` with activo_corriente = 800, pasivo_corriente = 400 → liquidez_corriente = 2.0
- `computarIndicadoresFinancieros` with empty array → all indicators null
- `CompanyProfileSchema` validates with all sections filled

### Gate Criteria
All unit tests pass. Type compilation succeeds. Indicator utility is deterministic.

---

## T2: DB Migration

### Test Scenarios
- Migration applies to fresh DB without errors
- UNIQUE (company_id, version) constraint rejects duplicate (company, version) insert
- GIN index on unspsc_codes responds to `@>` operator query
- RLS: company B cannot read company A's company_profiles rows
- CHECK constraint rejects presupuesto_min = 500, presupuesto_max = 100
- CHECK constraint accepts presupuesto_min = null (nullable fields allowed)
- companies.current_profile_id column present and accepts UUID

### Gate Criteria
Migration clean; constraints and indexes verified; RLS blocks cross-company access.

---

## T3: Kysely Types

### Test Scenarios
- `db.insertInto('company_profiles').values({ is_current: true, company_id: '...', version: 1, ... })` compiles OK
- No `UpdateableCompanyProfile` type exported (immutable pattern enforced)
- `Database` interface includes `company_profiles`

### Gate Criteria
Build passes. No Updateable export present.

---

## T4: RUES Lookup Service

### Test Scenarios
- Fetch timeout > 2s → `{ found: false }` without throw
- HTTP 500 → `{ found: false }`
- Valid RUES response → `{ found: true, data: { razon_social, representante_legal_nombre, domicilio_principal } }`
- Invalid NIT format → API route returns 400

### Gate Criteria
Unit tests pass for all error paths. Non-blocking on timeout.

---

## T5: UNSPSC Catalog

### Test Scenarios
- `searchUnspsc('software')` returns code in 432xx family
- `searchUnspsc('construccion')` returns code in 72xxxxx segment
- `searchUnspsc('')` returns `[]`
- Result count ≤ 20

### Gate Criteria
Unit tests pass. Catalog JSON present and parseable.

---

## T6: Server Actions

### Test Scenarios
- First save inserts version = 1, is_current = true; no prior rows exist
- Second save: prior row is_current = false; new row version = 2, is_current = true
- Invalid NIT DV → returns `{ ok: false, error }` without DB write
- Zod failure → returns `{ ok: false, fieldErrors }` without DB write
- Unauthenticated call → returns `{ ok: false, error: 'unauthorized' }`
- `getCompanyProfile` returns null when no profile exists
- `getCompanyProfile` returns is_current = true row

### Gate Criteria
Versioning logic correct; no writes on validation failure; unauthenticated rejected.

---

## T7: Profile Form UI

### Test Scenarios
- `/onboarding` redirects to `/dashboard` if is_current profile exists
- RUES timeout → form remains editable; "No encontramos tu empresa en RUES." shown
- Section 2 derived preview updates when activo_corriente / pasivo_corriente values change
- Adding a contrato_previo entry in Section 3 populates row; removing works
- fecha_fin < fecha_inicio on a contract entry → inline error shown
- UNSPSC autocomplete returns results on "software" query
- presupuesto_min > presupuesto_max → Zod error shown inline at submit
- `/config/perfil` pre-fills all existing values from is_current profile

### Gate Criteria
Full form renders; RUES non-blocking; dynamic lists functional; inline validation correct; pre-fill works.

---

## T8: Dashboard Completeness Badge

### Test Scenarios
- `computeCompleteness(null)` → score = 0, all sections false
- Profile with nit + razon_social only → datos_legales = true; others false
- Profile with all 5 sections filled → score = 5
- Badge with score = 3 shows "3 de 5 secciones completas" and links to /config/perfil
- Badge with score = 5 shows success state, no link
- Analysis page does NOT show gate modal regardless of completeness score

### Gate Criteria
Badge reflects profile state. Analysis never blocked by completeness.

---

## End-to-End Verification

1. Fresh user → navigates `/dashboard` → redirected to `/onboarding`
2. Enters NIT → RUES pre-fills razon_social and representante_legal_nombre (or times out gracefully)
3. Fills 3 fiscal years in Section 2 → derived previews compute correctly
4. Adds 2 contratos_previos entries in Section 3; adds 1 personal_clave entry in Section 4
5. Selects UNSPSC codes and departments in Section 5
6. Submits form → company_profiles version = 1, is_current = true created
7. Dashboard shows completeness badge "5 de 5 secciones completas"
8. User edits razon_social → submits → version = 2 created; version 1 is_current = false
9. Existing analysis (if any) still references version 1 snapshot
10. Badge updates to reflect new profile

**Gate Criteria:** Full flow completes without errors. Profile versioning correct. Badge accurate. Analysis not blocked at any point.
