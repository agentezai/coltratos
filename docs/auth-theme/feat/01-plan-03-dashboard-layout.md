# T3: Dashboard Layout — Sidebar + Topbar Wiring

## Scope

| File | Change |
|------|--------|
| `app/dashboard/layout.tsx` | NEW — Server Component wrapping Sidebar + Topbar |
| `app/dashboard/page.tsx` | Minor: `neutral-900` → `graphite-900` on heading |

## Changes

### New: `app/dashboard/layout.tsx`

```tsx
import type { ReactNode } from 'react'
import { Sidebar } from '@/components/shell'
import { Topbar } from '@/components/shell'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-graphite-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### Update: `app/dashboard/page.tsx`

```tsx
// Before
<h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>

// After
<h1 className="text-2xl font-semibold text-graphite-900">Dashboard</h1>
```

## Design Rationale
- `h-screen overflow-hidden` on the outer container + `overflow-y-auto` on `<main>` — Sidebar is `sticky top-0 h-screen` (from shell spec), so the outer `flex h-screen` creates a full-viewport row. `overflow-hidden` on the outer div prevents double scrollbars.
- Dashboard layout is a Server Component. `<Sidebar>` is `'use client'` internally — Next.js handles the client island boundary automatically.
- `<Sidebar>` and `<Topbar>` use default props (v1 hardcoded data). No prop passing needed in this spec.

## Dependencies
None — independent of T1/T2.

## Done When
- [ ] `app/dashboard/layout.tsx` exists and exports a default Server Component
- [ ] `data-component="sidebar"` is in the dashboard DOM
- [ ] `<header>` (Topbar) is in the dashboard DOM
- [ ] No layout overflow on 1280px viewport
- [ ] `npm run build` clean
