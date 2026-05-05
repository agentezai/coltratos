## Delta 2026-05-05 — edit | Rev 2 final: remove RUES from scope

**Mode:** edit
**Rationale:** Discovery answers did not include RUES auto-fill. User approved checkpoint explicitly listing RUES removal. Manual NIT entry + server-side DV validation (Modulo 11) is sufficient for the MVP form.
**Affected domains:** empresa-profile, integrations

### Tasks added
- None

### Tasks modified
- T6: dependency on T4 (RUES) removed; now depends only on T3

### Tasks removed
- T4 (RUES Lookup Service) — not in user's discovery answers; manual entry sufficient

### Impact on memory
- integrations domain: RUES API is not part of the company-profiling-onboarding MVP flow; no T4 to implement

---

## Delta 2026-05-04 — edit | Rev 2: MVP scope alignment

**Mode:** edit  
**Rationale:** Adapt spec to MVP constraints: 15-min completion target, profile versioning for reproducible verdicts, discovery filter derivation, single-page form (no wizard state), no document uploads in scope.  
**Affected domains:** empresa-profile, database, integrations, eligibility-matching

### Tasks added
- None

### Tasks modified
- T1: Replaced step-by-step schemas with unified CompanyProfileSchema (5 sections); replaced ContratoPrevio+PersonalCvEntry with updated field names (entidad_contratante, valor_cop, cedula); replaced calcularExperienciaEfectiva with computarIndicadoresFinancieros; added validarDigitoVerificacion
- T2: Replaced empresa_perfil (single-row) with versioned company_profiles (UNIQUE company+version, is_current); removed empresa_documento_juridico; added ejercicios_fiscales JSONB; changed flat financial cols to derived numerics (not generated)
- T3: Replaced EmpresaPerfilTable/EmpresaDocumentoJuridicoTable with CompanyProfileTable; removed Updateable export (immutable rows)
- T4: Updated RuesLookupResult fields (removed tipo_societario; added domicilio_principal)
- T6 (was T7): saveCompanyProfile now does versioned INSERT in transaction; removed step1-5 individual upserts
- T7 (was T8+T9 merged): Single-page form with 5 sections replaces multi-step wizard + profile editor
- T8 (was T10 simplified): Completeness badge only (no gate, no document expiry alerts)

### Tasks removed
- T6 (Document Upload Service) — Jurídica document uploads removed from MVP scope
- T8 (Onboarding Wizard) — replaced by single-page form (T7)
- T9 (Profile Editor) — merged into single-page form (T7)
- T10 (Dashboard Integration) — replaced by simpler T8 (completeness badge only)

### Impact on memory
- empresa-profile domain: no wizard pattern; single form; versioned snapshots (not upserts)
- database domain: company_profiles is versioned; no empresa_documento_juridico in this spec

---

## Delta 2026-05-01 — edit | Rev 1: align with real product description

**Mode:** edit  
**Rationale:** Spec compared against actual product requirements (objeto contractual comparison, CV overlap elimination, document uploads with expiry, simplified financial model, Jurídica removed from score). 5 structural mismatches found and corrected.  
**Affected domains:** empresa-profile, eligibility-matching, database, integrations

### Tasks added
- T6: Document upload service (Supabase storage + expiry tracking for 5 certificate types)
- T10: Dashboard integration (renamed from T9; now handles DocumentExpiryAlerts separately from CompletitudBanner)

### Tasks modified
- T1: Added ContratoPrevio, PersonalCvEntry types; calcularExperienciaEfectiva utility; removed antecedentes booleans from Step5Schema; updated Step4Schema to simplified financial model
- T2: Added empresa_documento_juridico table; revised empresa_perfil financial columns (removed full balance sheet, added contratos_previos/personal_cv JSONB, added ebit/gastos_financieros raw inputs, removed antecedentes cols)
- T3: Updated Kysely interfaces to match T2 changes; added EmpresaDocumentoJuridicoTable; removed old balance sheet fields
- T7 (was T6): Server actions — step4 uses new financial fields; step5 removes all antecedentes logic
- T8 (was T7): Onboarding wizard — step2 adds contratos_previos and CV entry UI with overlap advisory
- T9 (was T8): Profile editor — step4 restructured (2 input groups); step5 changed to document upload cards with expiry countdown; no antecedentes booleans
- T10 (was T9): Dashboard — CompletitudBanner remains financial only; new DocumentExpiryAlerts component for certificate health; score formula updated to Técnica 50% + Financiera 40% + Semantic 10%

### Tasks removed
- None

### Impact on memory
- empresa-profile domain: conventions should note that Jurídica is an alert track, not a scoring dimension
- database domain: empresa_documento_juridico is a new tenant-scoped table pattern; note the per-tipo uniqueness constraint
