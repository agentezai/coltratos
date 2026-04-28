# T7: Shell — Sidebar (Client) + Topbar (Server)

## Scope

- `src/components/shell/sidebar.tsx` — Client Component (`'use client'`)
- `src/components/shell/topbar.tsx` — Server Component
- `src/components/shell/index.ts` — barrel re-exports

## Changes

### `Sidebar` — `src/components/shell/sidebar.tsx`

This is the **only** Client Component shipped by the design-system spec (NFR-05).

Structure (translated from [project/ui_kits/coltratos-app/shell.jsx:47-105](../source/project/ui_kits/coltratos-app/shell.jsx#L47-L105) and styled per [project/ui_kits/coltratos-app/app.css:18-105](../source/project/ui_kits/coltratos-app/app.css#L18-L105)):

```tsx
'use client';
import { useState } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';

interface NavItem { id: string; label: string; icon: IconName; badge?: string; }

const PRINCIPAL: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',    icon: 'chart' },
  { id: 'subir',     label: 'Subir pliego', icon: 'upload' },
  { id: 'analisis',  label: 'Mis análisis', icon: 'file', badge: '147' },
  { id: 'alertas',   label: 'Alertas',      icon: 'bell', badge: '3' },
];
const CUENTA: NavItem[] = [
  { id: 'creditos', label: 'Créditos',      icon: 'card' },
  { id: 'equipo',   label: 'Mi equipo',     icon: 'users' },
  { id: 'config',   label: 'Configuración', icon: 'settings' },
];

export interface SidebarProps {
  initialActive?: string;
  user?: { name: string; email: string; initials: string };
  credits?: { used: number; total: number };
}

export function Sidebar({
  initialActive = 'dashboard',
  user = { name: 'María Rodríguez', email: 'm.rodriguez@constru.co', initials: 'MR' },
  credits = { used: 23, total: 50 },
}: SidebarProps) {
  const [active, setActive] = useState(initialActive);
  const pct = Math.round((credits.used / credits.total) * 100);
  // ... renders <aside class="..."> with brand, nav sections, credits-card, user-card
  // Active state: shows .active style (navy-800 bg + 2px blue inset on left)
}
```

Visual rules (from `app.css`):
- `aside` is `w-[244px] bg-navy-900 text-white p-[22px_14px_18px] sticky top-0 h-screen flex flex-col gap-1.5`
- Brand: `<img src="/logo/coltratos-mark.svg" />` 34×34 + COLTRATOS wordmark `font-display font-extrabold tracking-[0.06em] text-[17px]`
- Nav section header: `text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--fg-on-dark-3)] px-3 pt-3.5 pb-1.5`
- Nav item: `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--fg-on-dark-2)] text-sm font-medium hover:bg-navy-800 hover:text-white`
- Nav item active: `bg-navy-800 text-white shadow-[inset_2px_0_0_var(--color-blue-500)]`
- Badge: `ml-auto bg-blue-600 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full`
- Credits card: `bg-navy-800 border border-[var(--border-on-dark)] rounded-xl p-3.5` with `font-display font-bold text-[22px]` for the `23 / 50` count
- User card: avatar gradient `from-blue-600 to-green-400`, name + email + chev-down

### `Topbar` — `src/components/shell/topbar.tsx`

Server Component. No state; the search input is uncontrolled in v1 (downstream specs add the search behavior).

```tsx
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

export interface TopbarProps { className?: string; }

export function Topbar({ className = '' }: TopbarProps) {
  return (
    <header className={`h-[72px] bg-white border-b border-[var(--border-subtle)] flex items-center gap-[18px] px-8 ${className}`}>
      <label className="flex-1 max-w-[460px] flex items-center gap-2.5 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[10px] px-3 py-2.5">
        <Icon name="search" size={16} className="stroke-[var(--fg-3)]" />
        <input
          className="flex-1 bg-transparent border-0 outline-none text-[var(--fg-1)] text-sm"
          placeholder="Buscar análisis, procesos, entidades..."
        />
      </label>
      <div className="ml-auto flex gap-2.5 items-center">
        <button className="relative w-[38px] h-[38px] rounded-[10px] inline-flex items-center justify-center border border-[var(--border-subtle)] bg-white hover:bg-graphite-100">
          <Icon name="bell" />
          <span aria-hidden className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
        </button>
        <button className="w-[38px] h-[38px] rounded-[10px] inline-flex items-center justify-center border border-[var(--border-subtle)] bg-white hover:bg-graphite-100">
          <Icon name="settings" />
        </button>
        <Button variant="primary" leadingIcon="plus">Subir pliego</Button>
      </div>
    </header>
  );
}
```

Note: the notification + settings buttons in the bundle are not styled `Button` primitives (they're `icon-btn` from `app.css:128-141`). We inline that pattern here since it doesn't recur enough to deserve its own primitive in v1.

### `src/components/shell/index.ts` — barrel

```ts
export { Sidebar, type SidebarProps } from './sidebar';
export { Topbar, type TopbarProps } from './topbar';
```

### Design Rationale (REQ-007, NFR-05, RN-005)

- Sidebar is Client because it holds active-route state. v1 keeps the state local (`useState`); the first downstream FE spec replaces with `usePathname()` from `next/navigation` in a one-line edit.
- Topbar is Server because it has no state. The search input is uncontrolled — downstream specs lift it into a Client wrapper if/when they need to react to typing.
- The bundle's `Object.assign(window, { Icon, Sidebar, Topbar })` global injection (shell.jsx line 122) is dropped — modern Next.js 16 RSC pattern uses imports.

## Dependencies

Requires T4 (tokens), T5 (`Icon`), and T6 (`Button` for the Topbar CTA).

## Done When

- [ ] `src/components/shell/sidebar.tsx` exists with `'use client'` directive on line 1
- [ ] `src/components/shell/topbar.tsx` exists WITHOUT `'use client'`
- [ ] `src/components/shell/index.ts` re-exports both
- [ ] Sidebar renders 7 nav items in the order Dashboard / Subir pliego / Mis análisis (badge 147) / Alertas (badge 3) / Créditos / Mi equipo / Configuración
- [ ] Sidebar credits card shows `23 / 50` with a 46% progress bar
- [ ] Sidebar user card shows `María Rodríguez` / `m.rodriguez@constru.co` / `MR` avatar
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "'use client'" src/components/` reports exactly 1 line: `src/components/shell/sidebar.tsx:1`
