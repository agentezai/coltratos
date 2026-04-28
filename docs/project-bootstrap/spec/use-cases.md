# project-bootstrap — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Engineer | Developer cloning the repo to begin work on any approved spec |
| DB Admin | Developer or CI step responsible for booting the local Supabase stack and applying migrations |
| CI Pipeline | The GitHub Actions workflow at `.github/workflows/ci.yml` running on every PR and push to main |
| Future Spec Executor | nybo-run executing `domain-model`, `pdf-ingestion`, `requisitos-extraction`, or `semaforo-aggregation` after this spec ships |

---

## User Stories

### US-01 — Bootstrap a new checkout

**As an** Engineer
**I want** `npm install` followed by `npm run dev` to produce a running Next.js dev server
**So that** I can begin work on any feature without an additional setup ritual

### US-02 — Run the full quality gate locally

**As an** Engineer
**I want** a single command sequence (`npm run typecheck && npm run lint && npm run test && npm run build`) to mirror what CI runs
**So that** I catch breakages before pushing

### US-03 — Boot the local Supabase stack

**As a** DB Admin (or Engineer)
**I want** `npm run db:start` to launch a Dockerized local Supabase instance
**So that** I can run migration tests (TC-004 / TC-006 / TC-008-013 / TC-017 / TC-018 in domain-model) locally

### US-04 — CI runs the same gate I run locally

**As an** Engineer pushing a PR
**I want** the CI workflow to run `npm run typecheck && npm run lint && npm run build && npm run test` in that order
**So that** the gate is consistent between local and CI; typecheck failures fail fastest

### US-05 — Domain-model T1 unblocks immediately

**As a** Future Spec Executor (nybo-run on `domain-model`)
**I want** `tsc --noEmit --strict` to be runnable against new files at any path under `src/`
**So that** T1 of `domain-model` (Type Primitives) can begin without an additional setup checkpoint

---

## Use Case Scenarios

### UC-01 — Bootstrap a clean checkout (US-01)

**Preconditions:** Engineer has cloned the repo. Node 20.x and npm 10.x are installed locally. `node_modules/` does not exist.

#### Main Scenario

1. Engineer runs `npm install` (or `npm ci` if `package-lock.json` is present and they want reproducible installs).
2. npm reads `package.json`, resolves the dependency graph, downloads packages, builds `node_modules/`.
3. The install completes with zero peer-dependency warnings (NFR-05) and zero high-severity audit findings.
4. Engineer runs `npm run dev`.
5. Next.js starts the dev server. Within 60 seconds (NFR-03), it logs `Ready in <N> ms` and binds to `http://localhost:3000`.
6. A GET to `/` returns HTTP 200 with HTML containing the placeholder content from `app/page.tsx`.

#### Alternative Scenarios

**1a. Lockfile mismatch**
If `package.json` and `package-lock.json` are out of sync (e.g., a recent dependency edit hasn't been locked), `npm ci` rejects. Engineer runs `npm install` to regenerate the lockfile, commits, and retries.

**1b. Engineer is on Node 18 or below**
`engines.node: ">=20.0.0"` produces a warning. The install may still succeed (npm doesn't hard-fail on engines mismatches by default), but the engineer is informed they should upgrade Node.

#### Error Scenarios

**1e. `npm install` fails on a missing peer dependency**
NFR-05 says zero warnings; if a real failure occurs, ship-time evidence captures it and the dependency graph is fixed before merging.

**Postconditions:** Working development environment. The dev server is live; the engineer can edit `app/page.tsx` and see HMR.

---

### UC-02 — Run the full quality gate locally (US-02)

**Preconditions:** UC-01 completed. `node_modules/` is up to date.

#### Main Scenario

1. Engineer runs `npm run typecheck`. `tsc --noEmit` runs against the project. Exit 0.
2. Engineer runs `npm run lint`. ESLint runs with `eslint-config-next`. Exit 0.
3. Engineer runs `npm run test`. Vitest discovers `tests/bootstrap.test.ts` (and any other `*.test.ts` files), runs them, reports pass count. Exit 0.
4. Engineer runs `npm run build`. `next build` produces `.next/` output. Exit 0.
5. Total wall time on a developer's machine: ≤ 60s combined for the four commands on the empty scaffold.

#### Alternative Scenarios

**2a. Engineer modifies `app/page.tsx` and introduces a type error**
`npm run typecheck` exits non-zero with the type error. Engineer fixes; retries.

**2b. Engineer's edit breaks an ESLint rule**
`npm run lint` exits non-zero with the rule violation. Engineer fixes; retries.

#### Error Scenarios

**2e. The bootstrap smoke test (REQ-013) starts failing in an unexpected way**
If `tests/bootstrap.test.ts` reports a failure that is NOT the "Cannot find module '@/types'" expected failure, something has structurally drifted in the path-alias config. Engineer investigates `tsconfig.json` and `vitest.config.ts`.

**Postconditions:** All four checks pass. The engineer's working tree is provably ready to push.

---

### UC-03 — Boot the local Supabase stack (US-03)

**Preconditions:** UC-01 completed. Docker Desktop is running. `supabase` CLI is installed locally (`npm install -g supabase` OR via Homebrew).

#### Main Scenario

1. DB Admin runs `npm run db:start` (which invokes `supabase start`).
2. Supabase CLI pulls Docker images on first run (~30-60s); subsequent runs reuse cached images and start in ~10s.
3. The CLI prints a table of URLs: API (`http://localhost:54321`), DB (`postgresql://postgres:postgres@localhost:54322/postgres`), Studio (`http://localhost:54323`).
4. DB Admin opens Studio and confirms the empty schema (no tables — domain-model T3 writes the first migration).
5. The connection string is now live for `npm run db:push` (which applies any migrations under `supabase/migrations/`).

#### Alternative Scenarios

**3a. Docker is not running**
`supabase start` exits with `Cannot connect to the Docker daemon`. DB Admin starts Docker Desktop and retries.

**3b. Supabase CLI is not installed**
`npm run db:start` fails with `command not found: supabase`. DB Admin installs the CLI per the README pointer.

**3c. Port conflict**
Default Supabase ports are taken by another local stack. The CLI prints the conflict; DB Admin either stops the other stack or edits `supabase/config.toml` to use alternate ports.

#### Error Scenarios

**3e. Migration application fails after T3 ships**
Out of scope for this spec — covered by [domain-model T3 verify](../../domain-model/feat/10-verify.md).

**Postconditions:** Local Supabase stack reachable. `psql` against `DIRECT_URL` works. Engineer can run migration-touching tests from any approved spec.

---

### UC-04 — CI runs typecheck on every PR (US-04)

**Preconditions:** A PR is opened against `main` or `develop` (or a push lands on `main`).

#### Main Scenario

1. GitHub Actions detects the trigger event and starts the `quality` job.
2. The job runs `actions/checkout@v4`, then `actions/setup-node@v4` with `node-version: '20'` and `cache: 'npm'`.
3. The job runs `npm ci` (the deterministic install path, NFR-04).
4. The job runs `npm run typecheck`. If type errors exist, the job fails here — fastest fail mode (RN-005).
5. The job runs `npm run lint`. If lint violations exist, fail.
6. The job runs `npm run build`. If build fails (e.g., a syntactic error not caught by typecheck), fail.
7. The job runs `npm run test`. If tests fail, fail.
8. All four steps green → the job succeeds. PR is mergeable (subject to other checks).

#### Alternative Scenarios

**4a. Cold cache**
First CI run after a dependency edit incurs a cache miss; `npm ci` takes ~90s (NFR-02). Total job duration approaches 4 minutes.

**4b. Warm cache**
Cache hit. `npm ci` completes in ~15s; total job duration ≤ 2 minutes.

#### Error Scenarios

**4e. CI YAML drift**
If the workflow file is edited and the typecheck step is moved or removed, TC-008 catches it (the test asserts step ordering).

**Postconditions:** PR carries a green or red CI signal. Reviewers and the merge button trust the gate.

---

### UC-05 — Domain-model T1 unblocks (US-05)

**Preconditions:** This spec has shipped. The repo carries `package.json`, `tsconfig.json` (with `@/*` and `@/types` path aliases), `vitest.config.ts`, `supabase/`, and the three ADRs.

#### Main Scenario

1. Engineer (or nybo-run) starts `domain-model` T1 (Type Primitives).
2. T1 creates `src/types/domain/primitives.ts` with branded ID types and enum const objects.
3. Engineer runs `npm run typecheck` to validate the file.
4. Typecheck passes (the file uses only TypeScript primitives — no domain dependencies). domain-model T1's "Done When" criterion `tsc --noEmit on primitives.ts in isolation produces zero errors` is satisfiable.
5. As T2-T6 progress, each task's verify gate runs against the same toolchain. The bootstrap-smoke-test in `tests/bootstrap.test.ts` (REQ-013) flips from "expected fail" to "passing" the moment T6 creates `src/types/index.ts`.

#### Alternative Scenarios

**5a. Future spec needs a new dev dependency**
The spec's `feat/01-plan-NN-*.md` declares the dep; the implementing PR adds it via `npm install <pkg>`; the lockfile updates; CI's `npm ci` picks up the new entry on the next run.

#### Error Scenarios

**5e. Engineer skips the bootstrap smoke test**
Not an error — REQ-013's smoke test is a defensive structural signal. If it gets deleted, the engineer or CI would still notice toolchain regressions via TC-002 (typecheck on the empty scaffold).

**Postconditions:** All four downstream specs (domain-model, pdf-ingestion, requisitos-extraction, semaforo-aggregation) are unblocked at T1. The system is ready for cumulative implementation.

---

## UX/UI References

No UI in this spec. The `app/page.tsx` placeholder ("COLTRATOS — coming soon") is intentional and is replaced by the first FE feature.
