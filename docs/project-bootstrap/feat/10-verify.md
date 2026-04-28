# Verification Plan

## T1: Next.js + TypeScript Scaffold

### Test Scenarios
- `package.json` exists at the repo root with `name: "coltratos"`, `private: true`, `engines.node: ">=20.0.0"`.
- `tsconfig.json` has `strict: true`, `noUncheckedIndexedAccess: true`, `paths.@/*` AND `paths.@/types`.
- `next.config.ts` exists (TypeScript form).
- `app/layout.tsx` and `app/page.tsx` exist; the `<html lang="es">` attribute is set.
- `app/globals.css` and `postcss.config.mjs` exist (Tailwind v4 wired).
- `eslint.config.mjs` exists (Next.js 16 flat config).
- `pages/` directory does NOT exist (RN-002).
- `src/` directory exists with `.gitkeep` files.
- `npm run typecheck` exits 0 (TC-002).
- `npm run lint` exits 0 (TC-003).
- `npm run dev` boots within 60s; HTTP GET to `/` returns 200 with the placeholder HTML (TC-006).

### Gate Criteria
The four `npm run` quality gates (typecheck/lint/build/test) all pass on the empty scaffold. The dev server boots; the placeholder page renders. `lang="es"` is present in the rendered HTML.

---

## T2: Runtime + Dev Dependencies

### Test Scenarios
- `package.json` lists all 8 runtime deps from REQ-004 and all 4+ dev deps from REQ-005 at major-pinned versions.
- `package-lock.json` exists and is committed.
- `npm ci` exits 0 on a clean checkout (TC-001).
- `npm ls --all` produces zero peer-dependency warnings (NFR-05).
- `npm audit --production` reports zero high-severity findings.
- `.nybo/foundation/adrs/ADR-014-npm-package-manager.md` exists with Status, Context, Decision, Alternatives Considered, Consequences (TC-012).

### Gate Criteria
Clean install reproducible from `package.json` + `package-lock.json` alone (NFR-01, NFR-04). No peer-dep warnings. ADR-014 written.

---

## T3: Supabase Local Init

### Test Scenarios
- `supabase/` directory and `supabase/config.toml` exist with the configured values (REQ-007).
- `supabase/migrations/` directory exists.
- `supabase start` (via `npm run db:start`) boots the local Docker stack within ~60s on first run (TC-007).
- `psql $DIRECT_URL -c '\dt'` against the local DB returns "Did not find any relations." (empty schema).
- `.nybo/foundation/adrs/ADR-015-kysely-postgres-js-dialect.md` exists with all required sections (TC-012).

### Gate Criteria
Local Supabase stack reachable. Empty schema confirmed (no domain tables yet — domain-model T3 ships them). ADR-015 written. **Out of scope for CI**: this verify step runs locally; CI does not need to boot Supabase.

---

## T4: Vitest Setup

### Test Scenarios
- `vitest.config.ts` exists with `globals: false`, `environment: 'node'`, the path-alias mirror, and the v8 coverage provider (TC-010).
- `vitest.workspace.ts` exists registering both `unit` and `types` projects.
- `tests/bootstrap.test.ts` exists; both tests pass (TC-005).
- The second test logs a `Cannot find module '@/types'` error to stdout (informational; the assertion confirms the alias is wired and the file is intentionally absent).
- `npm run test:coverage` exits 0; `coverage/` artifacts produced.
- Grep for `globals: true` in `vitest.config.ts` returns zero matches (TC-010).
- Grep for `import { describe, it, expect } from 'vitest'` in `tests/bootstrap.test.ts` returns one match (RN-006).

### Gate Criteria
Vitest runs; the bootstrap smoke test passes in its expected-failure shape (per REQ-013). Coverage reporter functional.

---

## T5: CI + Package Scripts

### Test Scenarios
- `package.json` `scripts` block contains all 11 entries: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `test:type`, `test:coverage`, `db:start`, `db:stop`, `db:status`, `db:push`, `db:reset` (REQ-001).
- `.github/workflows/ci.yml` runs `npm run typecheck` immediately before `npm run lint` (TC-008).
- The CI YAML still uses `actions/setup-node@v4` with `node-version: '20'` and `cache: 'npm'` (no regression).
- The CI triggers (`pull_request` to `main`/`develop`, `push` to `main`) are unchanged.
- A real CI run on a fresh PR completes the `quality` job within 4 minutes cold cache, ≤ 2 minutes warm (NFR-02).
- `.nybo/foundation/adrs/ADR-013-nextjs-16-app-router.md` exists with all required sections (TC-012).

### Gate Criteria
Local quality command sequence passes. CI runs all four gates in correct order. Three ADRs (013/014/015) written.

---

## T6: Cleanup + Domain-Model Side-Edit

### Test Scenarios
- `.env.example` line 4 rewritten; `grep -i 'prisma' .env.example` returns zero matches (TC-011).
- `.gitignore` no longer contains `/src/generated/prisma`; `grep -i 'prisma' .gitignore` returns zero matches (TC-011).
- All other env keys and `.gitignore` entries are preserved verbatim.
- [docs/domain-model/spec/spec.md NFR-01](../../domain-model/spec/spec.md#L48) reads `npm run typecheck` (TC-013).
- `grep -rn 'pnpm' docs/` returns zero matches across the entire `docs/` tree (TC-013).
- [docs/domain-model/deltas.md](../../domain-model/deltas.md) carries a new dated 2026-04-27 entry recording the side-edit rationale (TC-013).

### Gate Criteria
Stale Prisma references gone. Domain-model NFR-01 converged on npm. Delta entry recorded.

---

## End-to-End Verification

**Final acceptance — the bootstrap is complete:**

1. **Clean checkout.** `rm -rf node_modules .next coverage` (or work from a fresh clone).
2. **Install.** `npm ci` exits 0; `package-lock.json` integrity intact.
3. **Quality gate.** `npm run typecheck && npm run lint && npm run build && npm run test` exits 0 with all four green.
4. **Dev boot.** `npm run dev` reaches "Ready" within 60s; `curl http://localhost:3000/` returns 200 with `<html lang="es">` and the `COLTRATOS — coming soon` placeholder.
5. **Local DB.** `npm run db:start` boots the Supabase stack (Docker required); `psql $DIRECT_URL -c '\dt'` returns empty schema.
6. **CI.** Push the bootstrap PR; the `quality` job runs `npm ci → typecheck → lint → build → test` in that order; all green.
7. **ADRs.** `ls .nybo/foundation/adrs/ADR-013* ADR-014* ADR-015*` returns three files.
8. **Cleanup verified.** `grep -rni 'prisma' .env.example .gitignore` and `grep -rn 'pnpm' docs/` both return zero matches.
9. **Cross-spec smoke.** `cat tests/bootstrap.test.ts`'s second test runs in the "expected-failure" shape — when `domain-model` T6 ships, the same test starts passing without modification.

**Gate Criteria:** All 9 steps complete cleanly. The bootstrap unblocks T1 of every approved spec (`domain-model`, `pdf-ingestion`, `requisitos-extraction`, `semaforo-aggregation`). Status moves from `approved` → `in-review` after this verify pass; merging the PR moves it to `shipped`.
