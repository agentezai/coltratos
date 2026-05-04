# T10: Dashboard Integration — Completitud Banner + Document Expiry Alerts

## Scope

- `src/components/shell/CompletitudBanner.tsx` — financial completitud banner
- `src/components/profile/DocumentExpiryAlerts.tsx` — certificate expiry alerts (new)
- `src/components/profile/ContextualGateModal.tsx`
- `app/dashboard/layout.tsx`

## Changes

### CompletitudBanner.tsx

Shows when `completitudFinanciera = false`. Hidden when true.

Single message: "Mejora tu matching completando tu perfil financiero (2 min)" + CTA → `/dashboard/config/perfil#financiera`.

Note: no `completitud_juridica` flag anymore — Jurídica health is shown by `DocumentExpiryAlerts`, not this banner.

### DocumentExpiryAlerts.tsx

```typescript
interface DocumentExpiryAlertsProps {
  documentos: DocumentoJuridicoExpiry[]  // from getDocumentosJuridicos
}
```

Renders one dismissible alert card per non-vigente certificate. Priority order: `vencido` first, then `por_vencer`.

Alert copy:
- `vencido`: "Tu [Certificado de Policía] venció hace [N] días. Actualízalo para participar en licitaciones."
- `por_vencer`: "Tu [Cámara de Comercio] vence en [N] días. Renuévalo antes del [fecha]."

CTA: "Actualizar" → `/dashboard/config/perfil#documentos-juridicos`

No alerts shown when all documents are `vigente` or when no documents have been uploaded yet (onboarding grace period — don't alarm users who haven't started step 5).

Show upload reminder (softer tone) only after user has uploaded at least one document: "También tienes pendiente: RMNC, REDAM."

### ContextualGateModal.tsx

Same as original spec — fires before analysis when `completitudFinanciera = false`. Updated copy: reflects new financial model (mentions `liquidez_corriente` or `nivel_endeudamiento` specifically rather than generic "información financiera").

Score formula reference updated: "Este proceso requiere evaluación financiera (40% del score de compatibilidad)."

### app/dashboard/layout.tsx

Server component:
1. Load `empresa_perfil` for `completitudFinanciera`
2. Load `getDocumentosJuridicos` for expiry states
3. Render `<CompletitudBanner>` + `<DocumentExpiryAlerts>` below top nav

### Design Rationale (SRP)

Financial completitud and certificate expiry are two distinct concerns — separate components. Dashboard layout is the only place that loads both; no prop drilling through page components.

## Dependencies

T8 (onboarding creates profile), T9 (profile editor linked from CTA). T6 provides `getDocumentosJuridicos`.

## Done When

- [ ] `CompletitudBanner` hidden when `completitudFinanciera = true`
- [ ] `DocumentExpiryAlerts` shows vencido cards; shows por_vencer cards; silent when all vigente
- [ ] No `completitud_juridica` flag used anywhere in dashboard integration
- [ ] Contextual gate fires and both CTAs work
- [ ] `npm run build` succeeds
- [ ] Manual smoke: new user completes steps 1-3 → financial banner shows; uploads step-4 data → banner disappears; uploads expired certificate → expiry alert fires
