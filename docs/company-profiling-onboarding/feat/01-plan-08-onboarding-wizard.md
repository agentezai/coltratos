# T8: Onboarding Wizard UI (Steps 1-3)

## Scope

- `src/components/onboarding/OnboardingWizard.tsx` — wizard shell
- `src/components/onboarding/Step1IdentidadLegal.tsx`
- `src/components/onboarding/Step2DimensionTecnica.tsx` — includes contratos_previos + CV entries
- `src/components/onboarding/Step3Preferencias.tsx`
- `app/onboarding/page.tsx`

## Changes

### OnboardingWizard.tsx

Client component; `step: 1 | 2 | 3` state; progress indicator; step transitions no page reload.

### Step1IdentidadLegal.tsx

NIT field: debounce 500ms → `/api/empresa/rues-lookup`. On RUES success: pre-fill with "Pre-llenado desde RUES" indicator. On timeout: silent, manual entry. NIT DV validated on blur. Submits via `upsertEmpresaPerfilStep1`.

### Step2DimensionTecnica.tsx

Three sub-sections:

**UNSPSC search:** autocomplete over `searchUnspsc`; pills with primary toggle; soft-warn > 15 codes. Advisory shown (non-blocking yellow toast) if selected code not in `rup_clasificaciones_unspsc` when step5 RUP data is available.

**Contratos previos:** repeatable entry group — each row: `objeto` (text), `entidad`, `valor_smmlv`, `fecha_inicio`/`fecha_fin` date pickers, UNSPSC tag. Add/remove rows. Empty state shows "Agrega tus contratos previos para mejorar el análisis de experiencia". Optional at step 2 (can add later in profile editor).

**Personal CV entries:** repeatable entry — each row: `nombre`, `cargo`, `fecha_inicio`, `fecha_fin` (null = current), `empresa_contratante`. When 2+ entries for the same person overlap date ranges, inline advisory: "Detectamos solapamiento de fechas. Solo se contará el tiempo efectivo (N meses)." Advisory uses `calcularExperienciaEfectiva` client-side.

**Experience totals:** `experiencia_general_smmlv`, `anios_experiencia` (required numeric fields). `numero_contratos_ejecutados` auto-suggested from `contratos_previos.length` if non-empty.

Submits via `upsertEmpresaPerfilStep2`.

### Step3Preferencias.tsx

`cobertura_nacional` toggle hides `departamentos_interes` when true. `modalidades_interes` checkboxes. Budget range with COP formatting. Submits via `upsertEmpresaPerfilStep3`; success → redirect `/dashboard` with secondary CTA "Completar perfil financiero".

### app/onboarding/page.tsx

Server component; `completitud_tecnica = true` → `redirect('/dashboard')`. Renders `<OnboardingWizard />`.

### Design Rationale (SRP)

CV overlap advisory is client-side only (calls pure util). Server action receives raw entries; DB stores them as-is. Overlap computation in matching engine reads stored CV.

## Dependencies

T5 (UNSPSC search), T7 (server actions).

## Done When

- [ ] RUES pre-fill works and fails gracefully
- [ ] UNSPSC advisory shown when code not in RUP classifications (non-blocking)
- [ ] Contratos previos rows can be added/removed; auto-suggests `numero_contratos_ejecutados`
- [ ] CV overlap advisory fires client-side with correct month count
- [ ] Step 3 `cobertura_nacional` toggle works
- [ ] Successful step 3 redirects to `/dashboard`
- [ ] `npm run build` succeeds
