# Progress Tracker — company-profiling-onboarding

**Status:** Not Started

**Current Task:** T1: Domain Primitives & Zod Schemas

---

## Task Checklist

### T1: Domain Primitives & Zod Schemas
- [ ] Implement T1: Add CompanyProfileId; create CompanyProfileSchema (5-section full form); ContratoPrevio, EjercicioFiscal, PersonalClaveEntry types; validarDigitoVerificacion; computarIndicadoresFinancieros
- [ ] Verify T1: Unit tests pass for DV validation, indicator computation (null-guard), and date range refine

### T2: DB Migration
- [ ] Implement T2: versioned company_profiles table (UNIQUE company+version, is_current, ejercicios_fiscales JSONB, unspsc_codes/departamentos_interes text[], NUMERIC monetary fields) + RLS + GIN indexes + companies.current_profile_id column
- [ ] Verify T2: Migration clean; UNIQUE constraint; GIN indexes; RLS blocks cross-company; CHECK rejects invalid presupuesto range

### T3: Kysely DB Types
- [ ] Implement T3: CompanyProfileTable interface (no Updateable export); add to Database interface
- [ ] Verify T3: Build passes; no UpdateableCompanyProfile type; Database includes company_profiles

### T4: RUES Lookup Service
- [ ] Implement T4: lookupByNit with 2s AbortController timeout; POST /api/empresa/rues-lookup; returns razon_social, representante_legal_nombre, domicilio_principal
- [ ] Verify T4: Timeout returns { found: false }; HTTP 500 returns { found: false }; valid response maps correctly

### T5: UNSPSC Catalog
- [ ] Implement T5: unspsc-v23.json catalog; searchUnspsc util with lazy import; max 20 results
- [ ] Verify T5: software/construccion queries return correct results; empty query returns []

### T6: Server Actions
- [ ] Implement T6: saveCompanyProfile (Zod validate → NIT DV validate → compute indicators → versioned INSERT in transaction); getCompanyProfile (is_current row)
- [ ] Verify T6: Versioning correct; no DB write on validation failure; unauthenticated rejected

### T7: Single-Page Profile Form
- [ ] Implement T7: ProfileForm (5 sections, react-hook-form + zodResolver); DatosLegalesSection with RUES trigger; CapacidadFinancieraSection with derived preview; ExperienciaSection + PersonalClaveSection (DynamicList); AlcanceComercialSection (UNSPSC autocomplete); /onboarding and /config/perfil routes
- [ ] Verify T7: RUES non-blocking; dynamic lists functional; inline validation; pre-fill on edit; derived preview live

### T8: Dashboard Completeness Badge
- [ ] Implement T8: computeCompleteness util; ProfileCompletenessBadge component; wire into dashboard layout; redirect to /onboarding if no profile
- [ ] Verify T8: Badge reflects state; score = 5 shows success; analysis never blocked; smoke test full flow

---

## Completion Summary

Not yet started.
