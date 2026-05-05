# T9: Equipo page

## Scope

| File | Change |
|------|--------|
| `app/dashboard/equipo/page.tsx` | New — stat cards + member table + roles sidebar + activity feed |
| `app/dashboard/equipo/_components/member-table.tsx` | New — `'use client'` filterable member table |

## Changes

### Page (`page.tsx`)

Server Component. Renders:

1. `<PageHeader>` — "Mi equipo" + Exportar + Invitar miembro buttons.
2. 4 x `<StatCard>`: Miembros activos (blue/16) / Invitaciones pendientes (amber/3) / Administradores (purple/4) / Último acceso promedio (green/2.4 días).
3. 2-column layout: `<MemberTable/>` (left, 2fr) + sidebar (right, 1fr).

**Sidebar cards**:

- **Roles y permisos**: 3 info rows — Administrador (purple, ShieldCheck) / Analista (blue, BarChart3) / Viewer (gray, Search) with description text.
- **Actividad reciente**: 4 activity rows with tinted circle icons (UserPlus blue, Check green, Settings amber, X red). Each: icon + text + timestamp. "Ver toda la actividad →" ghost button.

### `MemberTable` (`'use client'`)

State: `q`, `filterRol`, `filterEstado`, `tab: "miembros" | "invitaciones"`.

**Tabs**: Miembros | Invitaciones pendientes (badge: 3).

**Toolbar**: Search input + Rol select + Estado select + Filtros button.

**Table columns**: Usuario (avatar circle + name + email) | Rol (tinted pill) | Estado (pill) | Último acceso (mono) | Acciones (eye, settings, ···).

**Rol pill colors**: Administrador → violet, Analista → blue, Viewer → gray.

**Estado pill**: Activo → green, Suspendido → red.

**Avatar**: 28px circle, gradient `from-blue-600 to-emerald-400`, initials text.

**Pagination**: "Mostrando 1 a 6 de 16 miembros" + page buttons.

## Design Rationale

Same RSC-with-client-child pattern. Sidebar (roles + activity) is static and stays in the Server Component. Only member filtering needs client state.

## Dependencies

T1 (nav), T2 (StatCard, PageHeader, Pagination, mock `EQUIPO`).

## Done When

- [ ] `/dashboard/equipo` renders 4 stat cards
- [ ] Member table shows 6 mock members with correct role pills
- [ ] Daniela Valencia shows "Suspendido" red pill
- [ ] Rol pills: purple for Administrador, blue for Analista, gray for Viewer
- [ ] Search filters by name or email
- [ ] Activity feed shows 4 events with tinted icons
- [ ] Roles & permisos sidebar renders 3 role rows
- [ ] `npm run build` no type errors
