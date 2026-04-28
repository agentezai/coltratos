# T5: Author `<Icon>` component with 28-path registry

## Scope

- `src/components/ui/icon.tsx` — new file. Server Component. Single source of truth for all icons.
- `src/components/ui/__tests__/icon.test-d.ts` — vitest type-test (REQ-011)

## Changes

### `src/components/ui/icon.tsx`

Structure:

```tsx
import type { SVGProps } from 'react';

const PATHS = {
  "upload":          (<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5-5 5 5"/><path d="M12 5v12"/></>),
  "file":            (<><path d="M14 3v5h5"/><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/></>),
  // ... 26 more entries copied byte-identical from
  // docs/design-system/source/project/ui_kits/coltratos-app/shell.jsx:7-37
} as const satisfies Record<string, React.ReactNode>;

export type IconName = keyof typeof PATHS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
```

### Path data — copy byte-identical from the bundle

Source: [docs/design-system/source/project/ui_kits/coltratos-app/shell.jsx](../source/project/ui_kits/coltratos-app/shell.jsx) lines 7–37. The 28 keys to register:

`upload`, `file`, `chart`, `bell`, `card`, `users`, `settings`, `search`, `check-circle`, `alert`, `x-circle`, `eye`, `download`, `filter`, `chev-down`, `chev-right`, `sparkles`, `shield`, `clock`, `plus`, `x`, `arrow-up-right`, `database`, `more`, `logout`, `globe`, `trophy`, `rocket`, `build`, `trend`.

Each `<path d="..."/>` element copies the `d=` attribute byte-identical. `<circle>` and `<rect>` and `<ellipse>` elements (used in `check-circle`, `alert` triangle, `card` rect, `database` ellipse, etc.) also copy byte-identical.

### `src/components/ui/__tests__/icon.test-d.ts`

```ts
import { expectTypeOf } from 'vitest';
import type { IconName } from '../icon';

// REQ-011: IconName must be exactly the 28 names registered in icon.tsx.
type Expected =
  | "upload" | "file" | "chart" | "bell" | "card" | "users" | "settings"
  | "search" | "check-circle" | "alert" | "x-circle" | "eye" | "download"
  | "filter" | "chev-down" | "chev-right" | "sparkles" | "shield" | "clock"
  | "plus" | "x" | "arrow-up-right" | "database" | "more" | "logout"
  | "globe" | "trophy" | "rocket" | "build" | "trend";

expectTypeOf<IconName>().toEqualTypeOf<Expected>();
```

This test fails if the registry adds a new name without updating the union, or vice versa. It runs in `npm run test:type` (vitest type-test mode wired by `project-bootstrap` REQ-006).

### Design Rationale (ADR-018, RN-004)

- Single source of truth: registry keys → typed union via `keyof typeof PATHS`. No drift possible if the union is derived; the type-test asserts the union matches the documented set so future code-review catches accidental renames.
- Server-Component-friendly: no `useState`, no `useEffect`, no event handlers.
- `aria-hidden="true"` because icons are decorative inside primitives that already carry text labels (RN-007).

## Dependencies

Requires T1 — ADR-018 must be in place. Independent of T2 / T3 / T4.

## Done When

- [ ] `src/components/ui/icon.tsx` exists with all 28 path entries copied byte-identical from the bundle
- [ ] `IconName` is `export type IconName = keyof typeof PATHS;`
- [ ] The `Icon` component renders an `<svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} ... aria-hidden="true">`
- [ ] Default `size` is 18
- [ ] `src/components/ui/__tests__/icon.test-d.ts` exists with the `expectTypeOf` assertion
- [ ] `npm run test:type` exits 0
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
