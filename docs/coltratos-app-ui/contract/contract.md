# TDD Contract: coltratos-app-ui

## T1: Nav shell wiring

### Behavior: Active nav item matches current pathname (REQ-019)

**Given** the user is on `/dashboard/procesos`
**When** the Sidebar renders
**Then** the "Procesos" nav item has the active class and "Dashboard" does not

**Test file:** `src/__tests__/nav-shell.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: Sidebar collapse hides labels (REQ-020)

**Given** Sidebar is rendered with `collapsed={true}`
**When** the component renders
**Then** nav labels, user-info text, and credits card are not visible in the DOM

**Test file:** `src/__tests__/nav-shell.test.tsx`

---

## T2: Shared primitives

### Behavior: SemPill maps semáforo to correct Chip variant (RN-002)

**Given** `<SemPill status="eligible"/>`
**When** rendered
**Then** renders a Chip with `variant="green"` and text "Elegible"

**Given** `<SemPill status="conditional"/>`
**Then** renders `variant="amber"` and text "Con observaciones"

**Given** `<SemPill status="not-eligible"/>`
**Then** renders `variant="red"` and text "No elegible"

**Test file:** `src/__tests__/sem-pill.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: Mock data exports typed constants

**Given** import of `ANALISIS` from `src/lib/mock`
**When** TypeScript compiles
**Then** `ANALISIS[0].sem` is assignable to `"eligible" | "conditional" | "not-eligible"`

**Test file:** `src/__tests__/mock-data.test-d.ts`
**Framework:** vitest type tests

---

## T5: Upload flow

### Behavior: "Iniciar análisis" disabled without proceso (REQ-003, RN-004)

**Given** the Upload page with no proceso selected and a file loaded
**When** rendered
**Then** the "Iniciar análisis" button has `disabled={true}`

**Given** a proceso selected and no file
**Then** the button still has `disabled={true}`

**Given** a proceso selected AND a file
**Then** the button has `disabled={false}`

**Test file:** `src/__tests__/upload-flow.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: URL verification mock flow

**Given** the URL mode selected with a non-empty URL value
**When** "Verificar" is clicked
**Then** after 800ms, `urlStatus` becomes "found" and the found card is visible

**Test file:** `src/__tests__/upload-flow.test.tsx`

---

## T7: Resultado del análisis

### Behavior: Accordion toggle (REQ-009)

**Given** the ResultTabs component with mock reqs
**When** user clicks the first accordion row
**Then** the body text becomes visible and chevron has `rotate(180deg)` transform

**When** user clicks the same row again
**Then** the body text is hidden

**Test file:** `src/__tests__/result-tabs.test.tsx`
**Framework:** vitest + React Testing Library

### Behavior: Tab switching

**Given** the ResultTabs component
**When** user clicks the "Jurídico" tab
**Then** the "Jurídico" tab has the active class and "Resumen" does not

**Test file:** `src/__tests__/result-tabs.test.tsx`
