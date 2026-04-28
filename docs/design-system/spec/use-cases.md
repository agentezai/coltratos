# design-system — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Frontend Developer | Author of any downstream FE feature spec (e.g., `dashboard-screen`, `subir-pliego-screen`). Imports primitives + shell from `@/components/ui` and `@/components/shell`. |
| Designer / Reviewer | Visual auditor. Opens `/design-system` to verify token / primitive consistency before greenlighting a downstream FE PR. |
| Executor Agent | Future `/nybo-run` invocations on downstream FE specs. Reads this design system as the substrate; never reinvents tokens or primitives. |

---

## User Stories

### US-01 — Compose a new screen on top of the system

**As a** Frontend Developer (or Executor Agent on their behalf)
**I want** to import `Sidebar`, `Topbar`, `Card`, `Button`, `Chip`, `Well`, `Banner`, and `Icon` from typed barrel exports
**So that** I can ship a new product screen without inventing colors, fonts, components, or icon paths — and so that the screen visually matches every other screen in COLTRATOS by construction

### US-02 — Audit the system at one URL

**As a** Designer or Reviewer
**I want** to open `/design-system` in a running dev server and see every token (color ramps, type scale, spacing, radii, shadows), every primitive (Button, Card, Chip, Well, Banner), and brand assets (logo, icons) on one page
**So that** I can verify visual consistency in one pass without hunting through individual screens, and so that I can give targeted feedback ("the amber chip's contrast is too low") that lands in a single edit point

### US-03 — Find the canonical definition of a token

**As a** Frontend Developer (or anyone debugging a color drift)
**I want** to grep the codebase for a token name (`--blue-600`, `bg-blue-600`, or the literal `#2563eb`) and find a single canonical definition site
**So that** I can change the brand color in one place and have it propagate everywhere — and so that nobody can sneak a parallel definition past code review

### US-04 — Add an icon the registry doesn't have

**As a** Frontend Developer
**I want** to add a missing icon (e.g., `paperclip`) by appending one entry to the `<Icon>` registry in `src/components/ui/icon.tsx`, and have the typed `IconName` union pick it up automatically
**So that** I can extend the system without touching `package.json`, without adding `lucide-react`, and without introducing a parallel icon system — and so that the type-test fails loudly if I forget to update either side of the registry/union pair

---

## Use Case Scenarios

### UC-01 — A downstream FE feature composes the system (US-01)

**Preconditions:**
- `project-bootstrap` has shipped (`package.json`, `tsconfig.json`, Tailwind v4, `src/` exist).
- `design-system` v1 has shipped (all 9 tasks complete, all primitives + shell exported from barrels).
- A new FE spec (e.g., `dashboard-screen`) has been planned and approved.

#### Main Scenario

1. The Executor Agent (or Frontend Developer) opens `src/app/(app)/dashboard/page.tsx` to implement the dashboard.
2. They import `import { Sidebar, Topbar } from '@/components/shell'` and `import { Card, CardHead, CardBody, Button, Chip, Well, Icon } from '@/components/ui'`.
3. They compose the layout: `<Sidebar />`, `<Topbar />`, then a grid of `<Card>` elements containing `<Well tint="blue"><Icon name="chart"/></Well>` + numeric KPIs + `<Chip variant="green" dot>+12%</Chip>`.
4. TypeScript validates every variant prop at compile time. No raw `style={{ color: '#2563eb' }}` appears anywhere.
5. The screen renders matching the bundle's `dashboard.png` reference within pixel tolerance because every color, font, radius, and shadow comes from the same `globals.css`.

#### Alternative Scenarios

**1a. The dashboard needs a component this spec deferred (e.g., KPI grid, Table)**
The Frontend Developer writes the new component as part of the `dashboard-screen` spec, in `src/components/ui/kpi.tsx`, following the same Server-Component-by-default rule. The new component is added to `src/components/ui/index.ts` and consumed by the dashboard page. No design-system spec edit is needed unless the new component is reusable across screens — in which case `/nybo-plan edit design-system` adds it to v2.

#### Error Scenarios

**1e. The Frontend Developer tries to use a non-existent variant**
TypeScript fails at compile time: `Type '"purple"' is not assignable to type '"primary" | "secondary" | "ghost" | "success"'`. The build fails before the screen reaches review.

**1e. The Frontend Developer tries to override a token with inline style**
RN-005 forbids `style` overrides on primitives. The component prop type does not include `style`. TypeScript fails: `Property 'style' does not exist on type 'ButtonProps'`.

**Postconditions:**
- The new screen consumes the design system without forking tokens or primitives.
- A reviewer auditing the PR sees only Tailwind utility classes and barrel imports — no raw hex codes, no font URLs, no SVG paths.

---

### UC-02 — A reviewer audits the system at one URL (US-02)

**Preconditions:**
- `design-system` v1 has shipped.
- The dev server is running (`npm run dev`).

#### Main Scenario

1. The Designer opens `http://localhost:3000/design-system`.
2. The page renders 10 cards in order: Anchor colors (navy + graphite ramps), Primary + brand-green ramps, Semáforo trio, Type scale, Spacing/radii/shadow specimens, Buttons & chips, Form inputs, KPI card example, Logo on light/dark, Icon set + tinted wells.
3. Each card mirrors the layout of the corresponding `preview/*.html` file from the bundle.
4. The Designer scrolls through and verifies every primitive in every variant.
5. They notice the amber chip looks low-contrast on the white background; they leave a comment on the PR.

#### Alternative Scenarios

**1a. The Designer wants to compare against the bundle's reference**
They open `docs/design-system/source/project/preview/components-buttons-chips.html` in a side-by-side window and compare visual output pixel-for-pixel.

#### Error Scenarios

**1e. A primitive renders incorrectly (e.g., a Chip is missing its dot)**
The smoke test at `src/app/(internal)/design-system/__tests__/page.test.tsx` (REQ-012) catches the regression before the PR can merge. If the regression slips past tests, the manual reviewer catches it at this step.

**Postconditions:**
- The Designer's feedback lands at a single edit point (`globals.css` for tokens, `src/components/ui/chip.tsx` for the Chip primitive).

---

### UC-03 — A developer searches for a token's canonical definition (US-03)

**Preconditions:**
- `design-system` v1 has shipped.

#### Main Scenario

1. A developer notices a button's blue looks slightly off and wants to find where it's defined.
2. They run `grep -rn "blue-600" src/`.
3. The grep returns: (a) `src/app/globals.css` once in the `@theme` block, once in `:root`; (b) component files where `bg-blue-600` is used as a Tailwind class; (c) preview-page references.
4. They open `src/app/globals.css` line 87 and see `--color-blue-600: #2563eb;` in `@theme` and `--blue-600: #2563eb;` in `:root` — one definition for each layer.
5. They change the value in both places (or the developer notices NFR-04's parity test would fail otherwise).

#### Alternative Scenarios

**1a. The developer used the literal hex `#2563eb` somewhere**
A future curation pass adds an ESLint rule (`no-restricted-syntax` for hex literals in component files). For v1, this is enforced socially via PR review.

#### Error Scenarios

**1e. The developer changes only the `:root` definition, not `@theme`**
The token-parity test at `src/__tests__/token-parity.test.ts` (NFR-04) would not catch this directly (it checks names, not values). Captured as a v2 enhancement in the spec's revision log.

**Postconditions:**
- The brand color changes propagate uniformly across every screen.

---

### UC-04 — A developer adds a missing icon (US-04)

**Preconditions:**
- `design-system` v1 has shipped.
- A downstream spec (e.g., `subir-pliego-screen`) needs a `paperclip` icon for an attachment affordance.

#### Main Scenario

1. The developer opens `src/components/ui/icon.tsx`.
2. They append a new entry to the `paths` map: `"paperclip": <><path d="..."/></>`.
3. They append `"paperclip"` to the `IconName` union: `... | "paperclip"`.
4. They save.
5. They run `npm run test:type`. It passes — both sides of the registry/union pair are in sync.
6. Downstream code can now write `<Icon name="paperclip"/>` and TypeScript accepts it.

#### Alternative Scenarios

**1a. The developer wants to follow the bundle's path style**
They open [docs/design-system/source/project/ui_kits/coltratos-app/shell.jsx](../source/project/ui_kits/coltratos-app/shell.jsx) and copy a similar icon's path style as a reference. Lucide's source (https://github.com/lucide-icons/lucide) is the upstream reference for stroke weight and viewBox conventions.

#### Error Scenarios

**1e. The developer forgets to update the `IconName` union**
`npm run test:type` fails (REQ-011): the type-test compares the registry's keys against the union and reports the mismatch. The developer cannot merge until both sides agree.

**1e. The developer adds `lucide-react` instead of editing the registry**
RN-004 forbids this. PR review catches it; if it slips past review, a future ESLint rule (`no-restricted-imports`) catches it. For v1, social enforcement.

**Postconditions:**
- The codebase has one new icon, registered in one place, typed automatically.
- No new dependency was added.

---

## UX/UI References

See [spec.md § UX/UI](./spec.md#uxui). The bundle at [../source/](../source/) is the canonical visual source.
