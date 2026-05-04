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
