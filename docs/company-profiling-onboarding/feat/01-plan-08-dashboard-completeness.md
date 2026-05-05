# T8: Dashboard Completeness Badge

## Scope

- `src/components/dashboard/ProfileCompletenessBadge.tsx` — new component
- `src/lib/utils/profile-completeness.ts` — completeness scoring util
- `src/app/(dashboard)/layout.tsx` — wire badge into dashboard header

## Changes

### profile-completeness.ts

```typescript
export interface CompletenessResult {
  score: number      // 0–5 (sections complete count)
  total: number      // always 5
  sections: {
    datos_legales: boolean
    capacidad_financiera: boolean
    experiencia: boolean
    personal_clave: boolean
    alcance_comercial: boolean
  }
}

export function computeCompleteness(profile: CompanyProfileRow | null): CompletenessResult
```

Section complete conditions:
- datos_legales: nit + razon_social both non-null
- capacidad_financiera: ejercicios_fiscales array has ≥ 1 entry
- experiencia: contratos_previos array has ≥ 1 entry
- personal_clave: personal_clave array has ≥ 1 entry
- alcance_comercial: unspsc_codes has ≥ 1 code

### ProfileCompletenessBadge.tsx

- Reads `CompletenessResult`
- Renders pill badge: "X de 5 secciones completas"
- If score < 5: badge links to `/dashboard/config/perfil`
- If score = 5: badge shows success state (no link)
- Never blocks navigation or action buttons

### Dashboard layout wire-up

`src/app/(dashboard)/layout.tsx`:
- Call `getCompanyProfile()` (server component)
- Pass result to `<ProfileCompletenessBadge />` in header
- If no profile exists: redirect to `/onboarding`

### Design Rationale

Completeness is a dashboard-level concern — the badge lives in the layout so it appears on every dashboard page without per-page fetches. `computeCompleteness` is pure and easily testable.

## Dependencies

T7 (ProfileForm + getCompanyProfile must exist before wiring into layout).

## Done When

- [ ] `computeCompleteness(null)` returns score = 0
- [ ] `computeCompleteness(profile)` returns correct score for all section combinations
- [ ] Badge renders "X de 5 secciones completas"; links to /config/perfil when score < 5
- [ ] Dashboard layout redirects to /onboarding if no profile exists
- [ ] Analysis page (if exists) does NOT check completeness before starting — no blocking gate
- [ ] `npm run build` succeeds; smoke test: full profile save → badge shows 5/5
