# TDD Contract: auth-theme

## T1: Auth Layout — Logo + Background Token

### Behavior: renders lockup SVG not text logo (REQ-001)

**Given** `app/(auth)/layout.tsx` is rendered with a child  
**When** the DOM is inspected  
**Then** an `<img>` with `src` containing `coltratos-lockup.svg` exists and no `<span>` with text "Coltratos" exists as logo

**Test file:** `src/__tests__/auth-layout.test.tsx`  
**Framework:** vitest + @testing-library/react

---

## T2: Auth Form Pages — Button + Graphite Tokens

### Behavior: submit button uses Button component (REQ-002)

**Given** a login / signup / forgot-password / reset-password page is rendered  
**When** the submit element is queried  
**Then** `data-component="button"` is present on the element

**Test file:** `src/__tests__/auth-form-themes.test.tsx`  
**Framework:** vitest + @testing-library/react

### Behavior: WithAuthError story resolves after Suspense (REQ-005)

**Given** the `WithAuthError` Storybook story is mounted with `searchParams.error` set  
**When** the play function awaits `findByText('El enlace de verificación ha expirado.')`  
**Then** the element is found (no timeout error)

**Test file:** `app/(auth)/login/login.stories.tsx` (play function update)  
**Framework:** Storybook vitest integration

### Behavior: no neutral-* token remains in auth pages (NFR-01)

**Given** all auth page files after changes  
**When** grepped for `neutral-`  
**Then** 0 matches found

**Test file:** `src/__tests__/auth-form-themes.test.tsx` (or CI grep step)  
**Framework:** vitest (file content assertion) or shell grep in verify step

---

## T3: Dashboard Layout — Sidebar + Topbar

### Behavior: dashboard route renders shell components (REQ-006)

**Given** `app/dashboard/layout.tsx` wraps `app/dashboard/page.tsx`  
**When** the dashboard route is rendered (RSC)  
**Then** `data-component="sidebar"` is in the DOM and a `<header>` element is in the DOM

**Test file:** `src/__tests__/dashboard-layout.test.tsx`  
**Framework:** vitest + @testing-library/react (or Storybook story for Sidebar already covers it)
