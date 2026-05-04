# T7: Single-Page Profile Form UI

## Scope

- `src/app/(dashboard)/onboarding/page.tsx` — first-save route
- `src/app/(dashboard)/config/perfil/page.tsx` — edit route
- `src/components/profile/ProfileForm.tsx` — stateful form component
- `src/components/profile/sections/` — one component per section (5 total)
- `src/components/profile/fields/DynamicList.tsx` — reusable add/remove list control

## Changes

### ProfileForm.tsx

- Accepts `initialData: CompanyProfile | null`
- Uses `react-hook-form` + `zodResolver(CompanyProfileSchema)` for client-side validation
- Renders 5 section components in order
- Submit calls `saveCompanyProfile(formData)`; handles `fieldErrors` by setting RHF errors
- All labels and error messages in Spanish
- On success: redirect to `/dashboard`

### Section 1 — DatosLegalesSection

Fields: nit (with RUES lookup trigger on blur), digito_verificacion, razon_social, representante_legal_nombre, representante_legal_cedula, domicilio_principal, anio_constitucion.

RUES trigger:
- On nit field blur: `POST /api/empresa/rues-lookup`
- On success: `setValue('razon_social', data.razon_social)` etc.
- On timeout/error: show "No encontramos tu empresa en RUES. Completa manualmente." inline; fields remain editable

### Section 2 — CapacidadFinancieraSection

Dynamic list of 1–3 `EjercicioFiscal` entries. Add/remove year rows. Each row: ejercicio (year selector), ingresos_operacionales, patrimonio, activo_corriente, pasivo_corriente, activo_total, pasivo_total.

Read-only derived preview (computed client-side from most recent year entry):
- Liquidez corriente
- Nivel de endeudamiento
- Capital de trabajo

Preview updates on field change via `watch()`.

### Section 3 — ExperienciaSection

`DynamicList` of `ContratoPrevio` entries. Add/remove rows. Fields per row: entidad_contratante, objeto, valor_cop, fecha_inicio, fecha_fin, unspsc_code (optional text, no autocomplete in this section).

### Section 4 — PersonalClaveSection

`DynamicList` of `PersonalClaveEntry` entries. Add/remove rows. Fields per row: nombre, cedula, profesion, titulo, anios_experiencia, certificaciones (tag input or comma-separated).

### Section 5 — AlcanceComercialSection

- UNSPSC multi-select: text input with autocomplete from `searchUnspsc`; selected codes shown as removable chips
- departamentos_interes: multi-select from static list of Colombian departments
- presupuesto_min_cop / presupuesto_max_cop: numeric inputs in COP

### DynamicList.tsx

Generic component: `<DynamicList fields={fields} append={append} remove={remove} renderRow={(field, index) => JSX} />`

### Routes

- `/onboarding`: loads `getCompanyProfile()`; if profile exists redirect to `/dashboard`; otherwise render ProfileForm with `initialData = null`
- `/dashboard/config/perfil`: loads `getCompanyProfile()`; render ProfileForm with `initialData = profile`; if no profile redirect to `/onboarding`

### Design Rationale

Single stateful form — no step-by-step wizard — avoids cross-page state management. `react-hook-form` + Zod keeps validation co-located. Sections are components, not routes, so holistic Zod validation (cross-section .refine) works in one pass.

## Dependencies

T5 (UNSPSC catalog for Section 5 autocomplete), T6 (saveCompanyProfile, getCompanyProfile).

## Done When

- [ ] ProfileForm renders with 5 sections; all labels in Spanish
- [ ] RUES auto-fill fires on NIT blur; non-blocking on timeout
- [ ] Derived financial preview updates live in Section 2
- [ ] DynamicList add/remove works for Experiencia and Personal clave sections
- [ ] UNSPSC autocomplete returns results <100ms
- [ ] Submit calls saveCompanyProfile; fieldErrors surface as inline messages
- [ ] `/onboarding` redirects to dashboard if profile exists
- [ ] `/config/perfil` pre-fills existing values
- [ ] `npm run build` succeeds; no TypeScript errors
