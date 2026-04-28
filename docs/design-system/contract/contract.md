# TDD Contract: design-system

Markdown TDD guide for nybo-run. The Executor Agent reads this file and writes failing tests before implementing each task (Red phase), then implements (Green), then refactors.

This spec's tests are unusual: most assert structural / textual invariants of the codebase rather than runtime behavior. The Executor writes them as standard vitest tests; "Red" means the test fails because the asserted file or shape does not yet exist.

---

## Task T1: Vendor source bundle + write 3 ADRs

### Behavior: Bundle is vendored verbatim with 50 files (REQ-001, RN-001)

**Given** the repo root
**When** `find docs/design-system/source -type f | wc -l` runs
**Then** the output is exactly `51`

**Test file:** `src/__tests__/bundle-vendored.test.ts`
**Framework:** vitest

---

### Behavior: Three ADRs exist with required sections (REQ-009, RN-006)

**Given** `.nybo/foundation/adrs/` after T1 ships
**When** the files `ADR-016-geist-self-hosted.md`, `ADR-017-tailwind-v4-theme-tokens.md`, `ADR-018-inline-icon-component.md` are read
**Then** each contains the substrings `Status: Accepted`, `Context`, `Decision`, `Alternatives Considered`, `Consequences`

**Test file:** `src/__tests__/adrs-present.test.ts`
**Framework:** vitest

---

## Task T2: Self-host Geist + JetBrains Mono via next/font/google

### Behavior: 10 Geist .ttf files vendored to public/fonts (REQ-002)

**Given** the repo after T2 ships
**When** `ls public/fonts/Geist-*.ttf` runs
**Then** 10 files print: `Geist-Black.ttf`, `Geist-Bold.ttf`, `Geist-ExtraBold.ttf`, `Geist-ExtraLight.ttf`, `Geist-Light.ttf`, `Geist-Medium.ttf`, `Geist-Regular.ttf`, `Geist-SemiBold.ttf`, `Geist-Thin.ttf`, `Geist-VariableFont_wght.ttf`

**Test file:** `src/__tests__/fonts-self-hosted.test.ts`
**Framework:** vitest

---

### Behavior: Each font file is byte-identical to bundle source (REQ-002, RN-001)

**Given** any `public/fonts/Geist-*.ttf`
**When** compared via byte hash against the corresponding `docs/design-system/source/project/fonts/Geist-*.ttf`
**Then** the hashes match

**Test file:** `src/__tests__/fonts-self-hosted.test.ts` (same file, second `it`)
**Framework:** vitest

---

### Behavior: Geist Variable is preloaded from app/layout.tsx (REQ-002, NFR-01)

**Given** `app/layout.tsx` after T2 ships
**When** read as a string
**Then** it contains `<link rel="preload" as="font" type="font/ttf" crossorigin` and `/fonts/Geist-VariableFont_wght.ttf`

**Test file:** `src/__tests__/fonts-self-hosted.test.ts` (same file, third `it`)
**Framework:** vitest

---

## Task T3: Logo SVGs + favicon

### Behavior: Three logo SVG files exist with warning comment (REQ-003, REQ-013, RN-008)

**Given** the repo after T3 ships
**When** each of `public/logo/coltratos-mark.svg`, `public/logo/coltratos-lockup.svg`, `app/icon.svg` is read
**Then** the file's contents include the literal substring `⚠️ Reverse-engineered from raster mocks`

**Test file:** `src/__tests__/logo-favicon.test.ts`
**Framework:** vitest

---

## Task T4: Token layer (globals.css)

### Behavior: globals.css starts with @import "tailwindcss" (REQ-004)

**Given** `src/app/globals.css` after T4 ships
**When** read
**Then** the first non-comment, non-empty line is `@import "tailwindcss";`

**Test file:** Folded into `src/__tests__/token-parity.test.ts` (a separate `it` block)
**Framework:** vitest

---

### Behavior: Token names parity with bundle (NFR-04, RN-002, RN-003)

**Given** `src/app/globals.css` and `docs/design-system/source/coltratos-design-system/project/colors_and_type.css`
**When** the set of `--*-NNN:` token names is extracted from each file (the bundle's lines 30–199; the production's `:root` block)
**Then** the two sets are equal

**Test file:** `src/__tests__/token-parity.test.ts`
**Framework:** vitest

---

## Task T5: `<Icon>` component

### Behavior: IconName union matches the registry exactly (REQ-005, REQ-011, RN-004)

**Given** `src/components/ui/icon.tsx` after T5 ships
**When** the type-test asserts `IconName` equals the literal union of 28 names from REQ-005
**Then** `npm run test:type` exits 0

**Test file:** `src/components/ui/__tests__/icon.test-d.ts`
**Framework:** vitest type-testing (`vitest/type-testing` + `expectTypeOf`)

---

### Behavior: Icon renders an svg with documented attributes (REQ-005)

**Given** `<Icon name="upload" size={24} />` rendered in jsdom
**When** the resulting `<svg>` element is inspected
**Then** it has `viewBox="0 0 24 24"`, `stroke="currentColor"`, `stroke-width="1.75"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`, `aria-hidden="true"`, `width="24"`, `height="24"`

**Test file:** `src/components/ui/__tests__/icon.test.tsx`
**Framework:** vitest + @testing-library/react

---

## Task T6: Primitives

### Behavior: Each primitive renders without crashing and carries data-component (REQ-006)

**Given** `<Button variant="primary">Subir pliego</Button>`, `<Card><CardHead>X</CardHead><CardBody>Y</CardBody></Card>`, `<Chip variant="green">Elegible</Chip>`, `<Well tint="blue"><Icon name="upload"/></Well>`, `<Banner variant="info">…</Banner>` rendered in jsdom
**When** queried for `data-component` attributes
**Then** they expose `button` (the native element is a `<button>` — for Button we assert the tag name; for the other four, we assert `data-component` matches)

**Test file:** `src/components/ui/__tests__/primitives.test.tsx`
**Framework:** vitest + @testing-library/react

---

### Behavior: TypeScript rejects invalid variants (REQ-006, RN-005)

**Given** a TypeScript file that attempts `<Button variant="purple">` or `<Chip variant="green" style={{color:"red"}} />`
**When** `npm run typecheck` runs
**Then** it fails with the expected error

**Test file:** `src/components/ui/__tests__/primitives.test-d.ts` (uses `expectTypeOf` and `// @ts-expect-error`)
**Framework:** vitest type-testing

---

## Task T7: Shell

### Behavior: Sidebar is the only Client Component (REQ-007, NFR-05, RN-005)

**Given** the `src/` tree after T7 ships
**When** `grep -rl "'use client'" src/` runs
**Then** the result is exactly `src/components/shell/sidebar.tsx`

**Test file:** `src/__tests__/rsc-purity.test.ts`
**Framework:** vitest

---

### Behavior: Sidebar renders 7 nav items in the documented order (REQ-007)

**Given** `<Sidebar />` rendered in jsdom
**When** the rendered `<aside>` is queried for nav-item text
**Then** the items appear in order: `Dashboard`, `Subir pliego`, `Mis análisis`, `Alertas`, `Créditos`, `Mi equipo`, `Configuración`. The `Mis análisis` item shows badge `147` and `Alertas` shows badge `3`

**Test file:** `src/components/shell/__tests__/sidebar.test.tsx`
**Framework:** vitest + @testing-library/react

---

## Task T8: `/design-system` preview route

### Behavior: Page renders all 5 primitives + the wordmark (REQ-008, REQ-012)

**Given** the page rendered in jsdom
**When** queried for `<button>` and `[data-component="card"]` and `[data-component="chip"]` and `[data-component="well"]` and `[data-component="banner"]`
**Then** at least one of each is present, and the rendered text includes `COLTRATOS`

**Test file:** `src/app/(internal)/design-system/__tests__/page.test.tsx`
**Framework:** vitest + @testing-library/react (jsdom env)

---

## Task T9: Smoke + parity + RSC-purity tests

### Behavior: All test files exist and pass (NFR-04, NFR-05, REQ-011, REQ-012)

**Given** the repo after T9 ships
**When** `npm run test && npm run test:type` runs
**Then** both exit 0 and all the test files referenced above are listed in the runner output

**Test file:** N/A — this is the meta-test for the spec
**Framework:** vitest CI

---

## Notes for the Executor Agent

- **Order:** Write each test file in the Red phase (the file or behavior it asserts does not yet exist). Run vitest, see it fail. Implement. Run vitest, see it pass. Refactor.
- **Tooling:** `@testing-library/react` and `jsdom` may not be installed by `project-bootstrap`. T9 adds them as devDependencies if missing.
- **Type-tests:** The `vitest/type-testing` API requires a separate `tsconfig` for type-testing — `project-bootstrap` REQ-006 set this up.
- **Cross-task tests:** `bundle-vendored.test.ts`, `adrs-present.test.ts`, `fonts-self-hosted.test.ts`, `logo-favicon.test.ts`, `token-parity.test.ts`, `rsc-purity.test.ts` all live in `src/__tests__/` (project-level invariants). Component tests live alongside their component in `__tests__/` subfolders.
