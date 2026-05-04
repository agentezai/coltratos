# T9: Profile Editor UI (Steps 4-5)

## Scope

- `src/components/profile/Step4DimensionFinanciera.tsx` — simplified financial form
- `src/components/profile/Step5DimensionJuridica.tsx` — document upload UI with expiry countdown
- `app/dashboard/config/perfil/page.tsx`

## Changes

### Step4DimensionFinanciera.tsx

**Two input groups:**

Group A — raw inputs for calculated indicators (labeled "Datos base"):
- `activo_total`, `pasivo_total` → displays calculated `nivel_endeudamiento` preview
- `activo_corriente`, `pasivo_corriente` → displays `liquidez_corriente` preview
- `ebit`, `gastos_financieros` → displays `razon_cobertura_int` preview

Group B — manual indicators (labeled "Indicadores adicionales"):
- `ingresos_operacionales`, `utilidad_neta`, `margen_neto`, `margen_ebitda` (from empresa records)
- `roe`, `roa` (can be transcribed from RUP document)

Calculated previews update client-side as user types; generated columns store the truth. Tool-tip on each manual field: "Puedes encontrar este valor en tu RUP o en tus estados financieros."

No balance sheet inputs (`patrimonio_neto` etc. are gone).

### Step5DimensionJuridica.tsx

**Document upload cards** — one card per certificate type:

```
┌──────────────────────────────────────┐
│ 🔴 Certificado de Policía            │
│ Vence: hace 10 días                  │
│ [Subir PDF]  max 5MB, ≤ 30 días     │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 🟡 Cámara de Comercio                │
│ Vence en: 5 días (2026-05-06)       │
│ [Actualizar]                         │
└──────────────────────────────────────┘
```

Each card shows: `estado` icon (🟢 vigente / 🟡 por_vencer / 🔴 vencido), certificate type label, days remaining or days expired, upload button. Upload calls `POST /api/empresa/documentos-juridicos` multipart. On success, card updates to `vigente`.

Five cards: `certificado_policia`, `certificado_contraloria`, `rmnc`, `redam`, `camara_comercio`.

**RUP section** (below document cards): `rup_vigente` toggle; conditional K fields; certifications tag input. Habilitaciones sectoriales conditional on primary UNSPSC segment. Submits via `upsertEmpresaPerfilStep5`.

**No antecedentes booleans. No disclaimer checkbox.** These are replaced entirely by the document upload cards above.

### app/dashboard/config/perfil/page.tsx

Server component; loads `empresa_perfil` + `getDocumentosJuridicos`. Renders Step4 and Step5 in edit mode (pre-filled). Also shows steps 1-3 read-only summary with "Editar" links.

### Design Rationale (SRP)

Document upload is via API route (multipart, not server action). Step5 RUP section still uses server action. Cards load expiry state from `getDocumentosJuridicos` on server-render; optimistic update on upload.

## Dependencies

T6 (document upload service + API route), T7 (server actions for RUP/certifications fields).

## Done When

- [ ] Step4 shows two groups; calculated previews update on input
- [ ] No balance sheet fields present
- [ ] Step5 shows 5 document cards with correct expiry state from DB
- [ ] Uploading a PDF updates card to `vigente`
- [ ] File > 5MB shows error
- [ ] RUP section and habilitaciones sectoriales conditional render correct
- [ ] No antecedentes booleans or disclaimer anywhere in step5
- [ ] `npm run build` succeeds
