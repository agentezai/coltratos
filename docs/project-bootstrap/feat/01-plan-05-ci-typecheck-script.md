# T5: CI Workflow + Package Scripts

## Scope

- `package.json` — extended with the full script set (REQ-001).
- `.github/workflows/ci.yml` — edited to add `npm run typecheck` before `npm run lint` (REQ-008).
- `.nybo/foundation/adrs/ADR-013-nextjs-16-app-router.md` — NEW.

## Changes

### Wire `package.json` scripts (REQ-001)

After T4's vitest config exists and T3's Supabase is initialized, the `scripts` block reads:

```jsonc
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:type": "vitest --project types",
    "test:coverage": "vitest run --coverage",
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:status": "supabase status",
    "db:push": "supabase db push",
    "db:reset": "supabase db reset"
  }
}
```

Notes:
- `dev`, `build`, `start`, `lint` come from `create-next-app` (T1). The customization here is `typecheck`, the `test:*` family, and the `db:*` family.
- `test:type` runs ONLY the type-test workspace project (the `*.test-d.ts` files). Useful for fast iteration on type-only tests.
- `test:watch` is convenience for local TDD work; CI runs `test` (single-pass).
- `db:reset` re-applies all migrations against a fresh local DB — domain-model T3's verification will use this to regression-test the migration.

### Edit `.github/workflows/ci.yml` (REQ-008, RN-005, TC-008)

Current state (T1 inherited from `nybo init`):

```yaml
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm run test
```

Edit: insert `npm run typecheck` between `npm ci` and `npm run lint`. Final shape:

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run build
      - run: npm run test
```

The order `typecheck → lint → build → test` is mandated by RN-005: typecheck is the cheapest fail-fast signal.

### Author ADR-013 (REQ-011, RN-009)

Write `.nybo/foundation/adrs/ADR-013-nextjs-16-app-router.md`:

```markdown
# ADR-013: Next.js 16 with App Router

## Status
Accepted (2026-04-27)

## Context
The project's stack (per CORE.md) is Next.js + TypeScript + Supabase + Vercel.
The Next.js choice was implicit at project inception. By the time of the
project-bootstrap spec, Next.js 16.x was the current stable line (16.2 shipped
2026-03-18 with major Turbopack performance work; 16.2.2 patch shipped 2026-04-01).
We need to pin a major and pick a routing model.

## Decision
Use **Next.js 16** (`next@^16.2`) with **App Router** (the `app/` directory).
Pages Router (`pages/`) is forbidden; the directory MUST NOT exist (RN-002).
Server Components are the default; Client Components opt in via `'use client'`.

## Alternatives Considered
- **Next.js 15** — older minor; we'd inherit perf bugs that 16.2's Turbopack
  work fixed (~400% faster dev startup). No upside.
- **Pages Router instead of App Router** — legacy; new Next.js features (Server
  Actions, streaming, partial prerendering) are App-Router-first or
  App-Router-only. Choosing Pages locks us out of those features. v2 migration
  cost would be high.
- **Remix / Sveltekit / Astro** — would require re-deciding hosting (Vercel
  is Next-optimized) and re-doing the auth integration plan. Out of scope.

## Consequences
- (+) Modern RSC defaults reduce client bundle size (relevant for the
  eligibility-results screen rendering many requisitos).
- (+) Server Actions usable in v2 for the upload flow (no separate API route
  needed).
- (+) Vercel deployment is the canonical target — minimal config required.
- (−) App Router has a learning curve; some patterns (e.g., layout-bound
  data fetching) differ from Pages Router muscle memory.
- (−) Server Component / Client Component boundary requires deliberate
  thinking about what state lives where.

## References
- [Next.js 16.2 release notes](https://nextjs.org/blog/next-16-2)
- [project-bootstrap REQ-002](../../docs/project-bootstrap/spec/spec.md#L46)
- [project-bootstrap RN-002](../../docs/project-bootstrap/spec/spec.md#L95)
```

### Verify (TC-002, TC-003, TC-004, TC-005, TC-008)

After the edits:

```bash
npm run typecheck   # TC-002 — exits 0
npm run lint        # TC-003 — exits 0
npm run build       # TC-004 — exits 0; .next/ produced
npm run test        # TC-005 — 2 tests pass

# CI workflow self-check:
grep -n 'npm run typecheck' .github/workflows/ci.yml  # 1 match
grep -n 'npm run lint' .github/workflows/ci.yml       # 1 match
# Confirm typecheck appears before lint:
awk '/npm run typecheck/{tc=NR}/npm run lint/{lint=NR}END{exit(tc<lint?0:1)}' .github/workflows/ci.yml
echo $?   # 0 — typecheck precedes lint
```

### Design Rationale (Open/Closed)

The script set is opinionated but minimal. The four CI gates (typecheck/lint/build/test) form the closed-set quality contract every PR honors. New scripts (e.g., `format`, `db:diff`) can be added without disturbing this set; removing one of these four requires a spec revision (NFR-02 / RN-005). ADR-013 is in T5 (not T1) because the Next.js version pin is the consequence of the CI script set — running `next build` requires a stable Next major.

## Dependencies

Requires **T1** (creates initial `package.json` + the four create-next-app scripts).
Requires **T2** (vitest installed, used by `test`/`test:coverage`).
Requires **T3** (Supabase initialized, used by `db:*` scripts) — though the scripts themselves work with the CLI even before the DB is "configured" (per `supabase init`).
Requires **T4** (vitest workspace, used by `test:type`).

## Done When

- [ ] `package.json` `scripts` block contains all 11 entries listed above (REQ-001, TC-008 cross-check).
- [ ] `.github/workflows/ci.yml` runs `npm run typecheck` immediately before `npm run lint` (TC-008).
- [ ] On a clean checkout: `npm ci && npm run typecheck && npm run lint && npm run build && npm run test` exits 0 with all four gates green.
- [ ] CI on a fresh PR shows the `quality` job green within 4 minutes cold cache, 2 minutes warm (NFR-02).
- [ ] `.nybo/foundation/adrs/ADR-013-nextjs-16-app-router.md` exists with all required sections (TC-012).
