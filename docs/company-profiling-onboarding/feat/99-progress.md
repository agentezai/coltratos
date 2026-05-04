# Progress Tracker — company-profiling-onboarding

**Status:** Not Started

**Current Task:** T1: Domain Primitives & Zod Schemas

---

## Task Checklist

### T1: Domain Primitives & Zod Schemas
- [ ] Implement T1: Add EmpresaPerfilId, TipoSocietario, TipoDocumentoJuridico; create Step1-5 Zod schemas; add ContratoPrevio, PersonalCvEntry types; implement calcularExperienciaEfectiva
- [ ] Verify T1: Schema unit tests pass; CV overlap tests pass; type compilation clean

### T2: DB Migration
- [ ] Implement T2: empresa_perfil table (simplified financial cols, contratos_previos/personal_cv JSONB, generated indicators + completitud) + empresa_documento_juridico table + RLS policies + indexes
- [ ] Verify T2: Migration applies cleanly; generated columns correct; both RLS policies block cross-tenant access

### T3: Kysely DB Types
- [ ] Implement T3: EmpresaPerfilTable (simplified financial, no balance sheet, no antecedentes booleans) + EmpresaDocumentoJuridicoTable; update Database interface
- [ ] Verify T3: Build passes; generated cols typed ColumnType<..., never, never>; old balance sheet fields absent

### T4: RUES Lookup Service
- [ ] Implement T4: rues-lookup.ts with 2s AbortController timeout; POST /api/empresa/rues-lookup
- [ ] Verify T4: Timeout returns { found: false }; 500 returns { found: false }; correct NIT mapping

### T5: UNSPSC Catalog
- [ ] Implement T5: unspsc-v23.json catalog; searchUnspsc util with lazy import
- [ ] Verify T5: software/construcción queries return correct results; empty query returns []

### T6: Document Upload Service
- [ ] Implement T6: uploadDocumentoJuridico (SHA-256, storage, DB insert, 30-day expiry); getDocumentosJuridicos with estado computation; POST /api/empresa/documentos-juridicos
- [ ] Verify T6: Upload stores at correct path; expiry computed correctly; vencido/por_vencer/vigente states correct; 5MB limit enforced

### T7: Server Actions
- [ ] Implement T7: upsertEmpresaPerfilStep1-5 (step4 uses new financial fields, step5 has no antecedentes); getEmpresaPerfil
- [ ] Verify T7: New financial fields upsert; no antecedentes logic; unauthenticated returns error

### T8: Onboarding Wizard (Steps 1-3)
- [ ] Implement T8: OnboardingWizard, Step1-3 components; contratos_previos repeatable entries in step2; CV entries with overlap advisory; UNSPSC RUP advisory
- [ ] Verify T8: RUES non-blocking; CV overlap advisory fires; contratos_previos add/remove works; step3 redirects to dashboard

### T9: Profile Editor (Steps 4-5)
- [ ] Implement T9: Step4DimensionFinanciera (two groups: raw inputs + manual indicators; calculated previews); Step5DimensionJuridica (5 document upload cards with expiry countdown; no antecedentes booleans); /dashboard/config/perfil page
- [ ] Verify T9: Calculated previews update live; document cards show correct expiry state; upload updates card; 5MB rejected

### T10: Dashboard Integration
- [ ] Implement T10: CompletitudBanner (financial only); DocumentExpiryAlerts (per expired/expiring certificate); ContextualGateModal (updated copy); wire into dashboard layout
- [ ] Verify T10: Banner hidden when completitud_financiera true; expiry alerts show per estado; gate fires before analysis; smoke test full flow

---

## Completion Summary

Not yet started.
