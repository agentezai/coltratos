# auth-theme — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Pilot | A paying COLTRATOS user — registers, logs in, uses the dashboard |
| Developer | Implements downstream FE features that compose auth pages and the dashboard shell |

## User Stories

| ID | Story |
|----|-------|
| US-01 | As a pilot, I want auth forms to look polished and on-brand so I trust the product from first contact |
| US-02 | As a pilot, I want to see the COLTRATOS logo on the login/signup page so I know I'm in the right product |
| US-03 | As a pilot, I want to see the full app navigation after I log in so I can orient myself immediately |

## Use Case Scenarios

### UC-01 — Auth pages render on-brand {#uc-01}

**Main Scenario:**
1. Pilot navigates to `/login`, `/signup`, `/forgot-password`, or `/reset-password`
2. Page renders with `graphite-*` color tokens, Geist font (inherited from `layout.tsx`), and a `<Button>` component for the primary CTA
3. If the pilot submits with invalid credentials, an inline error appears in `text-red-600`
4. Inputs highlight with `focus:border-blue-600` when focused

**Alternative Scenario — check-email:**
1. Pilot completes signup
2. Redirected to `/signup/check-email` — card uses `graphite-*` tokens

**Error Scenario:**
- None. Changes are cosmetic — no auth logic is touched.

### UC-02 — Auth layout shows real logo {#uc-02}

**Main Scenario:**
1. Pilot loads any auth route
2. Auth layout renders `coltratos-lockup.svg` via `next/image` above the child card
3. Pilot sees the COLTRATOS brand mark + wordmark

### UC-03 — Dashboard shows full shell {#uc-03}

**Main Scenario:**
1. Pilot logs in successfully
2. Redirected to `/dashboard`
3. `app/dashboard/layout.tsx` wraps content with `<Sidebar>` (left, 244px, navy) + `<Topbar>` (top, 72px, white) + main content area
4. Pilot sees the nav items, credits widget, and user card in the sidebar
5. Pilot sees the search bar and "Subir pliego" CTA in the topbar
