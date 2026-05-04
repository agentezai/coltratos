# TDD Contract: company-profiling-onboarding (Rev 1)

---

## Task T1: Domain Primitives & Zod Schemas

### Behavior: CV overlap elimination — overlapping ranges (REQ-013, RN-014)

**Given** two PersonalCvEntry records for same person: Jan 2024–Jun 2024 and Apr 2024–Sep 2024  
**When** `calcularExperienciaEfectiva([entry1, entry2])` called  
**Then** returns 9 months (Jan–Sep, not 12)

**Test file:** `src/__tests__/empresa-perfil-validators.test.ts`  
**Framework:** vitest

---

### Behavior: CV overlap — non-overlapping ranges (RN-014)

**Given** two entries: Jan–Mar 2024 and Jun–Sep 2024  
**When** `calcularExperienciaEfectiva([...])` called  
**Then** returns 6 months

**Test file:** `src/__tests__/empresa-perfil-validators.test.ts`  
**Framework:** vitest

---

### Behavior: CV overlap — null fecha_fin treated as today (RN-014)

**Given** one entry with `fecha_inicio = 2024-01-01` and `fecha_fin = null`  
**When** `calcularExperienciaEfectiva([entry])` called with mocked `now = 2024-07-01`  
**Then** returns 6 months

**Test file:** `src/__tests__/empresa-perfil-validators.test.ts`  
**Framework:** vitest

---

### Behavior: Step4Schema rejects when activo_corriente > activo_total (REQ-007)

**Given** step4 data with `activo_corriente: 500, activo_total: 300`  
**When** `Step4Schema.safeParse(data)` called  
**Then** `result.success === false`

**Test file:** `src/__tests__/empresa-perfil-validators.test.ts`  
**Framework:** vitest

---

### Behavior: Step4Schema has no patrimonio_neto field (REQ-007)

**Given** step4 data including `patrimonio_neto: 1000000`  
**When** `Step4Schema.safeParse(data)` called  
**Then** `patrimonio_neto` not present in parsed output (stripped as unknown key)

**Test file:** `src/__tests__/empresa-perfil-validators.test.ts`  
**Framework:** vitest

---

### Behavior: Step5Schema has no antecedentes boolean fields (REQ-009)

**Given** step5 data including `tiene_antecedentes_disciplinarios: false`  
**When** `Step5Schema.safeParse(data)` called  
**Then** `tiene_antecedentes_disciplinarios` not present in parsed output

**Test file:** `src/__tests__/empresa-perfil-validators.test.ts`  
**Framework:** vitest

---

## Task T2: DB Migration

### Behavior: liquidez_corriente generated column computes (REQ-008, RN-009)

**Given** `empresa_perfil` with `activo_corriente = 300, pasivo_corriente = 100`  
**When** row inserted  
**Then** `liquidez_corriente = 3.0`

**Test file:** `src/__tests__/domain/empresa-perfil-migration.test.ts`  
**Framework:** vitest (integration)

---

### Behavior: nivel_endeudamiento NULL-guarded (NFR-07)

**Given** `activo_total = 0`  
**When** row inserted  
**Then** `nivel_endeudamiento IS NULL`

**Test file:** `src/__tests__/domain/empresa-perfil-migration.test.ts`  
**Framework:** vitest (integration)

---

### Behavior: empresa_documento_juridico rejects unknown tipo (REQ-009)

**Given** insert with `tipo_documento = 'pasaporte'`  
**When** DB insert attempted  
**Then** CHECK constraint violation; insert fails

**Test file:** `src/__tests__/domain/empresa-perfil-migration.test.ts`  
**Framework:** vitest (integration)

---

## Task T6: Document Upload Service

### Behavior: expiry computed as emision + 30 days (REQ-009, RN-010)

**Given** `fecha_emision = 2026-05-01`  
**When** `uploadDocumentoJuridico(...)` called  
**Then** row has `fecha_vencimiento = 2026-05-31`

**Test file:** `src/__tests__/documento-juridico.test.ts`  
**Framework:** vitest (mocked Supabase)

---

### Behavior: getDocumentosJuridicos returns vencido for missing tipo (RN-011)

**Given** empresa has no `certificado_contraloria` row  
**When** `getDocumentosJuridicos(empresaId)` called  
**Then** result includes `{ tipo_documento: 'certificado_contraloria', estado: 'vencido', diasRestantes: -Infinity }`

**Test file:** `src/__tests__/documento-juridico.test.ts`  
**Framework:** vitest

---

### Behavior: por_vencer when 5 days remain (RN-011)

**Given** `fecha_vencimiento = now() + 5 days` (mocked)  
**When** `getDocumentosJuridicos` called  
**Then** `estado = 'por_vencer'`, `diasRestantes = 5`

**Test file:** `src/__tests__/documento-juridico.test.ts`  
**Framework:** vitest

---

### Behavior: file > 5MB rejected (NFR-05)

**Given** multipart request with file of 6MB  
**When** `POST /api/empresa/documentos-juridicos`  
**Then** HTTP 413

**Test file:** `src/__tests__/api/documentos-juridicos.test.ts`  
**Framework:** vitest

---

## Task T7: Server Actions

### Behavior: step4 upserts new financial fields (REQ-007)

**Given** valid step4 data with `activo_total`, `ingresos_operacionales`, `roe`  
**When** `upsertEmpresaPerfilStep4(data)` called  
**Then** `{ ok: true }`; DB row has those fields set; `completitud_financiera = true`

**Test file:** `src/__tests__/actions/empresa-perfil-actions.test.ts`  
**Framework:** vitest

---

### Behavior: step5 has no antecedentes writes (REQ-009)

**Given** step5 data (RUP fields + certificaciones only)  
**When** `upsertEmpresaPerfilStep5(data)` called  
**Then** no `tiene_antecedentes_*` columns written; no `declaracion_antecedentes_at` written

**Test file:** `src/__tests__/actions/empresa-perfil-actions.test.ts`  
**Framework:** vitest

---

## Task T10: Dashboard Integration

### Behavior: CompletitudBanner hidden when financiera complete (REQ-016)

**Given** `completitudFinanciera = true`  
**When** `<CompletitudBanner>` renders  
**Then** component returns null / not visible

**Test file:** `src/__tests__/completitud-banner.test.tsx`  
**Framework:** vitest + @testing-library/react

---

### Behavior: DocumentExpiryAlerts shows expired certificate (REQ-010)

**Given** `documentos = [{ tipo: 'certificado_policia', estado: 'vencido', diasRestantes: -3 }]`  
**When** `<DocumentExpiryAlerts>` renders  
**Then** one alert card visible with "venció hace 3 días" copy

**Test file:** `src/__tests__/document-expiry-alerts.test.tsx`  
**Framework:** vitest + @testing-library/react

---

### Behavior: no alerts when all vigente (REQ-010)

**Given** all 5 documentos have `estado = 'vigente'`  
**When** `<DocumentExpiryAlerts>` renders  
**Then** no alert cards rendered

**Test file:** `src/__tests__/document-expiry-alerts.test.tsx`  
**Framework:** vitest + @testing-library/react
