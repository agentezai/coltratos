# Verification: coltratos-app-ui

## T1: Nav shell

**Test scenarios**
- Dashboard active when pathname is `/dashboard`
- Procesos active when pathname is `/dashboard/procesos`
- Collapse hides labels and credits card
- Nav item click triggers correct route

**Gate criteria**: Sidebar active state driven by `usePathname`, not internal state. All 8 routes reachable from sidebar. Collapse works visually.

---

## T2: Shared primitives

**Test scenarios**
- `SemPill` renders green Chip for "eligible", amber for "conditional", red for "not-eligible"
- `StatCard` with `delta.direction="down"` renders red delta text
- Mock data exports correct TypeScript types (no `any`)

**Gate criteria**: All 6 components importable from `@/components/page`. `SemPill` tests pass. Mock data compiles without type errors.

---

## T3: Dashboard page

**Test scenarios**
- 4 stat cards visible on `/dashboard`
- Recent análisis table shows exactly 5 rows
- Clicking row navigates to correct analisis detail URL

**Gate criteria**: `/dashboard` loads with 4 stat cards and a 5-row table. No runtime errors.

---

## T4: Procesos page

**Test scenarios**
- Filter by semáforo "eligible" → only green rows remain
- Search "Medellín" → narrows to matching rows
- Upload icon on row navigates to `/dashboard/upload?procesoId=PROC-2026-014`

**Gate criteria**: Filter + search combinations work correctly. Table shows all 5 mock procesos unfiltered.

---

## T5: Upload flow

**Test scenarios**
- Button disabled with no proceso or file
- Button disabled with proceso but no file
- Button disabled with file but no proceso (select mode)
- Button enabled after proceso selected + file set
- URL mode: Verificar → found card appears after delay
- "Iniciar análisis" → progress step renders
- "Ver resultado" → navigates to ANA-2026-00048

**Gate criteria**: All enable/disable cases correct. Steps transition. Progress stepper renders correctly.

---

## T6: Mis Análisis page

**Test scenarios**
- Table renders all 8 análisis rows
- Dot indicators show correct colors and counts per row (e.g., ANA-2026-00048: 16 green, 3 amber, 1 red)
- Pagination shows "Mostrando 1 a 8 de 48 resultados"

**Gate criteria**: 8 rows rendered. Dot counts match mock data. Pagination text correct.

---

## T7: Resultado del análisis page

**Test scenarios**
- `/dashboard/analisis/ANA-2026-00048` renders amber hero (70%, 16/3/1/20 summary)
- Tab click switches content (Jurídico tab shows ShieldCheck icon active)
- Accordion expands on click; ChevronDown rotates
- "¿Por qué?" text different for ok/warn/fail status

**Gate criteria**: Hero card correct for "conditional" semáforo. All 5 tabs clickable. Accordion toggle works.

---

## T8: Créditos page

**Test scenarios**
- Balance card shows "22"
- Selecting "Pro" package highlights it and deselects "Básico"
- Invoice FAC-0450 shows "Vencida" red pill
- Bar chart renders 6 rows

**Gate criteria**: Package selection works. Vencida invoice shows red. Balance card renders with navy gradient.

---

## T9: Equipo page

**Test scenarios**
- 16 total members (stat card)
- Daniela Valencia shows "Suspendido" red pill and "Analista" role
- Search "Laura" filters to 1 result
- Activity feed shows 4 events

**Gate criteria**: Correct role/status pills. Search works. Activity feed renders.

---

## T10: Placeholder pages

**Test scenarios**
- `/dashboard/alertas` renders bell icon and "Módulo en fase 2"
- `/dashboard/config` renders settings icon and correct subtitle

**Gate criteria**: Both pages render without errors.

---

## End-to-End Verification

1. `npm run build` — zero TypeScript errors, zero ESLint errors
2. Start dev server (`npm run dev`)
3. Login and navigate to each of the 8 routes via sidebar
4. Verify: stat cards, tables, and SemPills render correctly on each page
5. Run full analysis flow: Dashboard → Procesos → Upload (select + file) → Progress → Resultado
6. Verify semáforo pills display correctly for all 3 states (check Procesos list)
7. Verify collapse: toggle sidebar collapse, verify icon-only mode

**Final gate**: All 8 pages load without runtime errors. End-to-end flow from Upload → Result Detail works.
