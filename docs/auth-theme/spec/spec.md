# auth-theme — Software Design Document

## Intention

`auth-theme` applies the COLTRATOS design system consistently across all auth pages and the dashboard shell. Auth pages currently use hardcoded Tailwind `neutral-*` classes and raw `<button>` elements; this spec replaces them with design-system tokens (`graphite-*`, `blue-*`), the `<Button>` primitive, and the real logo SVG. The dashboard gets its `layout.tsx` wiring `<Sidebar>` + `<Topbar>` so the first protected screen pilots see after login reflects the product's visual identity.

This is a pure cosmetic + composition change — no new data, routes, or auth logic.

## Use Cases

Detailed scenarios in [use-cases.md](./use-cases.md).

| Use Case | Description | User Stories |
|----------|-------------|-------------|
| [UC-01 — Auth pages render on-brand](./use-cases.md#uc-01) | Login / signup / forgot-password / reset-password / check-email all use design tokens and `<Button>` | US-01 |
| [UC-02 — Auth layout shows real logo](./use-cases.md#uc-02) | The centered auth card shows `coltratos-lockup.svg`, not text "Coltratos" | US-02 |
| [UC-03 — Dashboard shows full shell](./use-cases.md#uc-03) | After login, pilots see `<Sidebar>` + `<Topbar>` + dashboard content | US-03 |

---

## Requirements

### Functional Requirements

| ID | Requirement | User Stories | Business Rules |
|----|-------------|-------------|----------------|
| REQ-001 | `app/(auth)/layout.tsx` changes `bg-neutral-50` → `bg-graphite-50` and replaces the `<span>` text logo with `<Image src="/logo/coltratos-lockup.svg" alt="Coltratos" width={140} height={32} priority />` via `next/image`. | US-02 | RN-001 |
| REQ-002 | All five auth form pages (`login`, `signup`, `forgot-password`, `reset-password`, `check-email`) replace every raw `<button type="submit">` with `<Button variant="primary" size="md" className="w-full">` imported from `@/components/ui`. | US-01 | RN-002 |
| REQ-003 | All form inputs across auth pages change focus style from `focus:border-neutral-900 focus:ring-neutral-900` → `focus:border-blue-600 focus:ring-blue-600`. Border colors change from `border-neutral-300` → `border-graphite-300`. Text colors change from `text-neutral-900` → `text-graphite-900`. | US-01 | RN-003 |
| REQ-004 | All card container `div`s across auth pages change from `border-neutral-200` → `border-graphite-200`. Heading text changes from `text-neutral-900` → `text-graphite-900`. Label text changes from `text-neutral-700` → `text-graphite-700`. Muted text changes from `text-neutral-500` → `text-graphite-500`. | US-01 | RN-003 |
| REQ-005 | Login page `LoginForm` story `WithAuthError`: the play function wraps the `getByText` call in `await within(canvasElement).findByText(...)` (async query) to allow Suspense to resolve before assertion. | US-01 | RN-004 |
| REQ-006 | New file `app/dashboard/layout.tsx` — a Server Component that renders `<div className="flex h-screen overflow-hidden"><Sidebar /><div className="flex flex-col flex-1 overflow-hidden"><Topbar /><main className="flex-1 overflow-y-auto">{children}</main></div></div>`. Imports `Sidebar` from `@/components/shell` and `Topbar` from `@/components/shell`. | US-03 | RN-005 |
| REQ-007 | `app/dashboard/page.tsx` heading changes from `text-neutral-900` → `text-graphite-900`. No other dashboard page changes in this spec. | US-03 | RN-003 |

### Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Correctness | Zero `neutral-*` Tailwind classes remain in any file touched by this spec after changes. |
| NFR-02 | Regression | `npm run build` passes with 0 TypeScript errors and 0 Next.js build errors. |
| NFR-03 | Regression | `npm run test` passes — all existing auth-and-tenancy unit tests remain green. |
| NFR-04 | Layout | Dashboard layout has no horizontal overflow and no FOUC — Sidebar and Topbar are always rendered server-side. |

---

## Business Rules

| Rule | Description |
|------|-------------|
| RN-001 | Auth layout uses `coltratos-lockup.svg` (mark + wordmark) not `coltratos-mark.svg` (mark only). Lockup is appropriate for standalone centered auth context. |
| RN-002 | `<Button>` `disabled` prop receives the `isPending` boolean directly — no extra `disabled:opacity-50` class needed (Button already handles that). Remove the duplicated class if present. |
| RN-003 | Every color class in touched files must map to a token defined in `app/globals.css` `@theme` block or `:root` block. `neutral-*` is not defined there — `graphite-*` is. |
| RN-004 | The `WithAuthError` story fix must use `findByText` (async, retries) not `getByText` (sync) — `useSearchParams` inside `<Suspense>` defers rendering to the next tick. |
| RN-005 | Dashboard layout is a Server Component. `<Sidebar>` receives no props (defaults apply). `<Topbar>` receives no props. Both components already have sensible defaults for v1. |

---

## Test Cases

### TC-001 — Auth layout renders lockup SVG (REQ-001)
**Given** the auth layout is rendered  
**When** the DOM is inspected  
**Then** an `<img>` with `src` containing `coltratos-lockup.svg` is present and no text node "Coltratos" is a direct child of the logo area

### TC-002 — Submit buttons use Button component (REQ-002)
**Given** any auth form page is rendered  
**When** the submit element is queried  
**Then** `data-component="button"` attribute is present (Button renders this attribute; raw `<button>` does not)

### TC-003 — Dashboard renders Sidebar and Topbar (REQ-006)
**Given** `app/dashboard/layout.tsx` wraps `app/dashboard/page.tsx`  
**When** the dashboard route is rendered  
**Then** `data-component="sidebar"` and the topbar `<header>` element are both in the DOM

### TC-004 — WithAuthError story passes (REQ-005)
**Given** the login page Storybook story `WithAuthError` runs  
**When** `searchParams.error` is set to `'El enlace de verificación ha expirado.'`  
**Then** the play function finds the text after Suspense resolves (no `Unable to find element` error)

---

## Architecture

### ADRs
No new ADRs. This spec is constrained by ADR-017 (Tailwind v4 `@theme` tokens) and ADR-016 (Geist self-hosted). The `Button` import follows the barrel export pattern from the design-system spec.

### Tradeoffs
- **`findByText` vs `waitFor`** — `findByText` is the minimal fix for TC-004; it retries until the Suspense boundary flushes. Wrapping in `waitFor` is equally valid but more verbose.
- **Dashboard layout as Server Component** — `<Sidebar>` is `'use client'` internally, so the layout itself can be a Server Component and Next.js will correctly hydrate the client island.

### Performance Goals & Metrics
- Build time unchanged (no new dependencies, no new routes).
- Sidebar renders server-side (no layout shift on first paint).

### Data Model
No schema changes.

### API / Data Contracts
No new API endpoints or Server Actions.

### Service Integrations
None.
