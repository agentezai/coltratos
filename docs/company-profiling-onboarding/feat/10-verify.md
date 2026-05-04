# Verification Plan — company-profiling-onboarding (Rev 1)

## T1: Domain Primitives & Zod Schemas

### Test Scenarios
- `validarDigitoVerificacion` accepts valid NITs, rejects incorrect DVs
- `Step3Schema` fails when `presupuesto_min > presupuesto_max`
- `Step3Schema` fails when `cobertura_nacional = false` and `departamentos_interes` empty
- `Step4Schema` fails when `activo_corriente > activo_total` (optional cross-field check)
- `calcularExperienciaEfectiva`: two overlapping entries Jan-Jun + Apr-Sep → 9 months
- `calcularExperienciaEfectiva`: two non-overlapping entries Jan-Mar + Jun-Sep → 6 months
- `calcularExperienciaEfectiva`: null `fecha_fin` treated as today
- `ContratoPrevioSchema` fails when `objeto` empty

### Gate Criteria
All unit tests pass. Type compilation succeeds. CV overlap function is deterministic.

---

## T2: DB Migration

### Test Scenarios
- Migration applies to fresh DB without errors
- `activo_corriente = 300, pasivo_corriente = 150` → `liquidez_corriente = 2.0`
- `activo_total = 0` → `nivel_endeudamiento = NULL`
- `completitud_tecnica = true` when unspsc_codes non-empty + experience fields set
- `completitud_financiera = true` when activo_total + pasivo_total + activo_corriente + pasivo_corriente all set
- `empresa_documento_juridico` CHECK constraint rejects unknown `tipo_documento`
- RLS: empresa B cannot read empresa A's `empresa_perfil` or `empresa_documento_juridico`

### Gate Criteria
Migration clean; generated columns compute correctly; both RLS policies block cross-tenant.

---

## T3: Kysely Types

### Test Scenarios
- `db.insertInto('empresa_perfil').values({ nivel_endeudamiento: 0.5 })` → compile error
- `db.insertInto('empresa_perfil').values({ patrimonio_neto: 1000 })` → compile error (field removed)
- `db.selectFrom('empresa_documento_juridico').select('fecha_vencimiento')` → compiles OK

### Gate Criteria
Build passes. Old balance sheet fields not present in type. Generated cols reject writes.

---

## T4: RUES Lookup Service

### Test Scenarios
- Fetch timeout > 2s → `{ found: false }` without throw
- HTTP 500 → `{ found: false }`
- Valid RUES response → `{ found: true, data: { razon_social, tipo_societario, ... } }`
- Invalid NIT → API route returns 400

### Gate Criteria
Unit tests pass for all error paths.

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

## T6: Document Upload Service

### Test Scenarios
- Upload PDF → `file_path` = `empresas/<id>/documentos-juridicos/certificado_policia/<hash>.pdf`
- `fecha_emision = 2026-05-01` → `fecha_vencimiento = 2026-05-31`
- `getDocumentosJuridicos` with `fecha_vencimiento = yesterday` → `estado = 'vencido'`
- `getDocumentosJuridicos` with `fecha_vencimiento = now + 5d` → `estado = 'por_vencer'`
- `getDocumentosJuridicos` tipo with no upload → `estado = 'vencido'` (treated as missing)
- File > 5MB → API returns 413

### Gate Criteria
Upload stores at correct path. Expiry states computed correctly including missing documents.

---

## T7: Server Actions

### Test Scenarios
- Step4 with valid inputs upserts new financial fields; `completitud_financiera = true`
- Step4 with old `patrimonio_neto` field ignored (not in schema)
- Step5 with RUP data upserts without antecedentes booleans
- Unauthenticated call → `{ ok: false, error: 'unauthorized' }`

### Gate Criteria
New financial fields upsert. No antecedentes logic present. Unauthenticated rejected.

---

## T8: Onboarding Wizard

### Test Scenarios
- `/onboarding` with `completitud_tecnica = true` → redirects `/dashboard`
- RUES timeout → form continues, no blocking error
- UNSPSC advisory fires when code not in `rup_clasificaciones_unspsc`
- Adding contratos_previos entry populates repeatable row; removing works
- Two CV entries with overlapping dates → advisory shows computed effective months
- Step 3 submit without departments when `cobertura_nacional = false` → blocked

### Gate Criteria
Wizard full flow creates `empresa_perfil` row with `completitud_tecnica = true`. RUES non-blocking. CV advisory correct.

---

## T9: Profile Editor

### Test Scenarios
- `/dashboard/config/perfil` pre-fills all existing values
- Group A raw inputs: changing `activo_corriente`/`pasivo_corriente` updates `liquidez_corriente` preview
- Step5: all 5 document cards render with correct `estado` from DB
- Upload new certificate → card updates to `vigente`
- File > 5MB → error shown inline
- No antecedentes booleans or disclaimer checkbox anywhere in step5

### Gate Criteria
Profile editor pre-fills. Calculated previews live-update. Document cards reflect DB state. No antecedentes remnants.

---

## T10: Dashboard Integration

### Test Scenarios
- `completitudFinanciera = true` → `CompletitudBanner` hidden
- `completitudFinanciera = false` → banner visible with CTA
- `empresa_documento_juridico` with `estado = 'vencido'` → alert card shown
- `empresa_documento_juridico` all `vigente` → no alerts
- No uploads yet (no rows) → no alerts shown (grace period)
- After one upload exists: otros tipos shown as "pendiente" softer message
- `ContextualGateModal` fires before analysis; both CTAs resolve correctly

### Gate Criteria
Banner responds to financiera flag. Alerts respond to document expiry. No completitud_juridica flag used. Gate modal works.

---

## End-to-End Verification

1. Fresh user → navigates `/dashboard` → redirected to `/onboarding`
2. Enters NIT → RUES pre-fills or times out gracefully
3. Adds UNSPSC codes + 2 contratos_previos + CV entries with overlap → advisory fires
4. Completes step 3 → redirected `/dashboard`; financial completitud banner visible
5. Goes to `/dashboard/config/perfil#financiera` → enters raw inputs → calculated previews update
6. Saves step 4 → `completitud_financiera = true` → banner disappears
7. Goes to step5 → uploads `certificado_policia.pdf` → card turns green; remaining 4 red
8. Initiates pliego analysis with `completitud_financiera = false` (before step 4) → gate modal fires
9. Returns after step 4 → analysis starts in Layer 2 mode
10. Checks document expiry cards after 25 days → `camara_comercio` shows `por_vencer` alert

**Gate Criteria:** Full flow completes without errors. Score formula correct. Banner and expiry alerts respond to state. No antecedentes booleans anywhere.
