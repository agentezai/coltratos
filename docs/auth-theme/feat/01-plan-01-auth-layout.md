# T1: Auth Layout — Logo + Background Token

## Scope

| File | Change |
|------|--------|
| `app/(auth)/layout.tsx` | Logo SVG + bg-graphite-50 |

## Changes

### Auth Layout

Replace text logo with `next/image` logo and swap background token:

```tsx
// Before
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <span className="text-2xl font-semibold tracking-tight text-neutral-900">
            Coltratos
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

// After
import Image from 'next/image'
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-graphite-50">
      <div className="w-full max-w-md px-4">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo/coltratos-lockup.svg"
            alt="Coltratos"
            width={140}
            height={32}
            priority
          />
        </div>
        {children}
      </div>
    </div>
  )
}
```

## Design Rationale
- `coltratos-lockup.svg` (mark + wordmark) is the correct logo for a standalone auth context — `coltratos-mark.svg` (mark only) is for the sidebar where wordmark is shown separately.
- `bg-graphite-50` (#f8fafc) is visually identical to `neutral-50` but references the design system token, satisfying NFR-01.

## Dependencies
None.

## Done When
- [ ] `bg-neutral-50` is gone from `app/(auth)/layout.tsx`
- [ ] `<img>` with src `coltratos-lockup.svg` is rendered in the auth layout
- [ ] No TypeScript errors (`npm run build` clean)
