# TDD Contract: project-bootstrap

Markdown TDD guide for `nybo-run`. The Executor Agent reads this file and, for each behavior, writes a failing test (Red), implements (Green), and refactors as needed.

**Test framework:** vitest (the bootstrap installs it; subsequent specs use it).
**Test file root:** `tests/` for repo-level smoke tests; `lib/<feature>/__tests__/` for feature-specific unit tests (per existing pdf-ingestion / requisitos-extraction / semaforo-aggregation conventions).

---

## Task T1: Next.js + TypeScript Scaffold

### Behavior: tsconfig has strict mode and the @/types alias (REQ-003) — TC-009

**Given** `tsconfig.json` after running `create-next-app` and the T1 hardening
**When** parsed as JSON
**Then** `compilerOptions.strict === true`, `compilerOptions.noUncheckedIndexedAccess === true`, `compilerOptions.paths['@/*']` is `['./src/*']`, AND `compilerOptions.paths['@/types']` is `['./src/types/index.ts']`

**Test file:** `tests/bootstrap.tsconfig.test.ts` (read the file with `node:fs`, `JSON.parse`, assert structure)
**Framework:** vitest

---

### Behavior: pages/ directory does not exist (RN-002)

**Given** the repo after T1
**When** `tests/bootstrap.layout.test.ts` checks for the existence of a `pages/` directory at the repo root
**Then** the directory does NOT exist (`fs.existsSync('./pages') === false`)

**Test file:** `tests/bootstrap.layout.test.ts`
**Framework:** vitest

---

### Behavior: app/layout.tsx sets lang="es" (REQ-002)

**Given** `app/layout.tsx`
**When** the file's source is read and parsed for `<html` attributes
**Then** the `lang` attribute is exactly `"es"` (Colombian Spanish localization)

**Test file:** `tests/bootstrap.layout.test.ts`
**Framework:** vitest

---

### Behavior: dev server boots and serves the placeholder (TC-006, NFR-03)

**Given** the bootstrapped repo
**When** `npm run dev` is started in a child process and the test waits up to 60s for `Ready` in stdout
**Then** the child process logs `Ready` within 60 seconds; an HTTP GET to `http://localhost:3000/` returns 200; the response HTML contains `COLTRATOS` and `lang="es"`

**Test file:** Manual or scripted via `tests/bootstrap.dev.test.ts` (uses `child_process.spawn` and `node:http`); flagged as a **slow** test, opt-in via `--project=integration` if a third workspace project is added later. For v1, this is verified manually and the result recorded in `evidence/dev-boot.txt`.
**Framework:** vitest (slow lane) or manual

---

## Task T2: Runtime + Dev Dependencies

### Behavior: package.json declares the runtime dep set at major-pinned versions (REQ-004)

**Given** `package.json` after T2
**When** parsed as JSON
**Then** `dependencies` contains keys `next`, `react`, `react-dom`, `zod`, `kysely`, `kysely-postgres-js`, `postgres`, `@supabase/supabase-js`, `@supabase/ssr`, `@anthropic-ai/sdk`, `pdf-parse`, each with a `^` major-pin range

**Test file:** `tests/bootstrap.deps.test.ts`
**Framework:** vitest

---

### Behavior: package.json declares the dev dep set (REQ-005)

**Given** `package.json` after T2
**When** parsed as JSON
**Then** `devDependencies` contains keys `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `vitest`, `@vitest/coverage-v8`, `eslint`, `eslint-config-next`, `tsx`, each with a `^` major-pin range

**Test file:** `tests/bootstrap.deps.test.ts`
**Framework:** vitest

---

### Behavior: npm ci succeeds on a clean checkout (TC-001, NFR-04)

**Given** a clean checkout (no `node_modules/`)
**When** `npm ci` is run
**Then** it exits with code 0; `node_modules/` is created; `package-lock.json` is unchanged

**Test file:** Verified in CI directly (the `quality` job's `- run: npm ci` step). Local equivalent recorded in `evidence/install.txt`.
**Framework:** CI (no vitest assertion needed)

---

## Task T3: Supabase Local Init

### Behavior: supabase/config.toml has the configured shape (REQ-007)

**Given** `supabase/config.toml` after T3
**When** parsed (using a TOML parser, or grep for the key invariants)
**Then** `project_id === "coltratos"`, `db.major_version === 15`, `auth.enabled === true`, `storage.enabled === false`, `api.port === 54321`, `db.port === 54322`, `studio.port === 54323`

**Test file:** `tests/bootstrap.supabase.test.ts` (read file, parse TOML or use targeted regex)
**Framework:** vitest

---

### Behavior: supabase start boots a local stack (TC-007)

**Given** Docker is running and `supabase` CLI is installed
**When** `npm run db:start` is invoked
**Then** the command exits successfully and prints API/DB/Studio URLs; `psql $DIRECT_URL -c '\dt'` against the local DB returns a zero-row response (empty schema)

**Test file:** Manual / out-of-band (depends on Docker locally; not run in v1 CI). Result recorded in `evidence/supabase-boot.txt` during T3 execution.
**Framework:** Manual

---

## Task T4: Vitest Setup

### Behavior: vitest.config.ts uses non-globals (REQ-006, RN-006, TC-010)

**Given** `vitest.config.ts` after T4
**When** the file is read as text
**Then** it does NOT contain `globals: true`; it does contain `globals: false` OR the `globals` key is absent (both are equivalent — vitest's default is `false`)

**Test file:** `tests/bootstrap.vitest.test.ts`
**Framework:** vitest

---

### Behavior: vitest.workspace.ts has unit and types projects (REQ-006)

**Given** `vitest.workspace.ts` after T4
**When** read as text
**Then** the file contains exactly two project entries with `name: 'unit'` and `name: 'types'`; the `types` project has `typecheck.enabled === true`

**Test file:** `tests/bootstrap.vitest.test.ts`
**Framework:** vitest

---

### Behavior: bootstrap smoke test asserts the expected-failure shape (REQ-013, TC-005)

**Given** `tests/bootstrap.test.ts` after T4 and `src/types/index.ts` does NOT yet exist
**When** `npm run test` runs
**Then** the smoke test passes — the `import('@/types')` is wrapped in try/catch; the catch branch asserts the error message matches `/Cannot find module|@\/types/i`; the test logs the captured error to stdout for human inspection

**Given** the same test file AND a future state where `src/types/index.ts` has been created (e.g., by domain-model T6 in a later run)
**When** `npm run test` runs
**Then** the smoke test ALSO passes — the try succeeds; the success branch asserts `importedModule !== null`. The test is structurally future-proof: it flips between the two valid states without code changes

**Test file:** `tests/bootstrap.test.ts`
**Framework:** vitest

---

## Task T5: CI + Package Scripts

### Behavior: package.json scripts contains all 11+ entries (REQ-001)

**Given** `package.json` after T5
**When** parsed as JSON
**Then** `scripts` contains at minimum: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `test:type`, `test:coverage`, `db:start`, `db:stop`, `db:status`, `db:push`, `db:reset` (14 entries; partial overlap with create-next-app defaults)

**Test file:** `tests/bootstrap.scripts.test.ts`
**Framework:** vitest

---

### Behavior: ci.yml runs typecheck before lint (REQ-008, RN-005, TC-008)

**Given** `.github/workflows/ci.yml` after T5
**When** the YAML is parsed
**Then** the `quality` job's `steps` array contains entries with `run: npm run typecheck` and `run: npm run lint`, in that order. The typecheck step's array index is strictly less than the lint step's array index

**Test file:** `tests/bootstrap.ci.test.ts` (read YAML with `js-yaml` or scan with regex+ordering check)
**Framework:** vitest

---

### Behavior: three ADRs exist with required sections (REQ-011, TC-012)

**Given** `.nybo/foundation/adrs/` after T5
**When** the files `ADR-013-nextjs-16-app-router.md`, `ADR-014-npm-package-manager.md`, `ADR-015-kysely-postgres-js-dialect.md` are read
**Then** each contains the markdown headings `## Status`, `## Context`, `## Decision`, `## Alternatives Considered`, `## Consequences`. The `## Status` line includes `Accepted`

**Test file:** `tests/bootstrap.adrs.test.ts`
**Framework:** vitest

---

## Task T6: Cleanup + Domain-Model Side-Edit

### Behavior: zero Prisma references in env or gitignore (REQ-009, REQ-010, TC-011)

**Given** `.env.example` and `.gitignore` after T6
**When** grepped for `/prisma/i`
**Then** zero matches. The `# PostgreSQL directo (para `supabase db push` y conexiones sin pooling)` comment is present in `.env.example`. The `/src/generated/prisma` line is absent from `.gitignore`

**Test file:** `tests/bootstrap.cleanup.test.ts`
**Framework:** vitest

---

### Behavior: domain-model NFR-01 says npm run typecheck (REQ-012, TC-013)

**Given** `docs/domain-model/spec/spec.md` after T6
**When** read as text
**Then** the file contains `npm run typecheck` AND does NOT contain `pnpm typecheck`. A fresh `grep -rn 'pnpm' docs/` invocation returns zero matches across the entire `docs/` tree

**Test file:** `tests/bootstrap.cleanup.test.ts`
**Framework:** vitest

---

### Behavior: domain-model deltas.md records the side-edit (REQ-012, TC-013)

**Given** `docs/domain-model/deltas.md` after T6
**When** read
**Then** a section header matching `Delta 2026-04-27 — edit | Tooling-consistency rename: pnpm typecheck → npm run typecheck` is present; the section includes `**Mode:** edit` and a `Rationale` paragraph mentioning `npm` and `package manager`

**Test file:** `tests/bootstrap.cleanup.test.ts`
**Framework:** vitest

---

## End-to-End: Full Quality Gate

### Behavior: clean install + four-gate sequence exits 0 (UC-02, NFR-02)

**Given** a clean checkout (no `node_modules/`, no `.next/`, no `coverage/`)
**When** the sequence `npm ci && npm run typecheck && npm run lint && npm run build && npm run test` is run
**Then** every command exits 0; total wall time on a developer's machine is < 90s; total wall time on CI cold cache is < 4 minutes; warm cache is < 2 minutes

**Test file:** Verified in CI directly (the `quality` job is the gate). Local equivalent recorded in `evidence/full-gate.txt` at ship time.
**Framework:** CI + manual evidence
