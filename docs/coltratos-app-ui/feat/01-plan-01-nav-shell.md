# T1: Nav shell wiring

## Scope

| File | Change |
|------|--------|
| `src/components/shell/sidebar.tsx` | Add Procesos nav item; swap `useState` active for `usePathname`; add collapse prop/toggle |
| `src/components/shell/topbar.tsx` | (verify no routing dependency; no change expected) |
| `app/dashboard/layout.tsx` | Pass collapse state down to Sidebar if needed |

## Changes

### Sidebar nav update

Add `{ id: "procesos", label: "Procesos", icon: "file-text" }` between Dashboard and Subir pliego in `PRINCIPAL`.

Update nav constants order:
```
PRINCIPAL: dashboard → procesos → subir → analisis → alertas
CUENTA:    creditos → equipo → config
```

### Routing: replace `useState(initialActive)` with `usePathname`

Map nav item IDs to paths:
```ts
const PATHS: Record<string, string> = {
  dashboard: "/dashboard",
  procesos:  "/dashboard/procesos",
  subir:     "/dashboard/upload",
  analisis:  "/dashboard/analisis",
  alertas:   "/dashboard/alertas",
  creditos:  "/dashboard/creditos",
  equipo:    "/dashboard/equipo",
  config:    "/dashboard/config",
};
```

Use `usePathname()` to determine active item. Render nav items as `<Link href={PATHS[id]}>` (or keep as `<button>` with `router.push` if the Link wrapper breaks the existing style).

### Collapse support

Add `collapsed` boolean prop (default `false`). When `true`:
- Container width: `w-[76px]`
- Hide: labels, `sidebar-user-info`, credits card, section headings
- Nav items: `justify-center px-3`

Collapse toggle button renders as a small chevron at the bottom of the nav (above user area). Store collapse state in `app/dashboard/layout.tsx` with `useState`; pass down to Sidebar.

## Design Rationale

Sidebar must be `'use client'` (uses `usePathname` and collapse state). This is consistent with its current implementation. No Server Component behavior needed here.

## Dependencies

None — T1 can start immediately.

## Done When

- [ ] Procesos appears in sidebar between Dashboard and Subir pliego
- [ ] Active item highlights based on current pathname (not internal state)
- [ ] Clicking a nav item navigates to the correct route
- [ ] Collapsed sidebar shows 76px icon-only mode
- [ ] `npm run build` succeeds with no type errors
