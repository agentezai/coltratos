# Progress Tracker

**Status:** In Review (all 6 tasks implemented; 1 verification step deferred to dev machine — `supabase start` boot)

**Current Task:** None — ready for `/nybo-verify`

---

## Task Checklist

### T1: Next.js + TypeScript Scaffold
- [x] Implement Task 1: `create-next-app` scaffolded into `/tmp` then copied into repo (cnx aborts in non-empty dir); harden `tsconfig.json` (strict + `noUncheckedIndexedAccess` + `@/*` and `@/types` paths); author `app/layout.tsx` with `lang="es"` and `app/page.tsx` placeholder; create `src/.gitkeep` + `src/types/domain/.gitkeep`.
- [x] Verify Task 1: `npm run typecheck`, `npm run lint`, `npm run build` all exit 0; `pages/` does NOT exist; placeholder page prerenders at `/`.

### T2: Runtime + Dev Dependencies
- [x] Implement Task 2: `npm install` 8 runtime deps + 4 dev deps at spec majors (re-pinned `@supabase/ssr ^0.6`, `@anthropic-ai/sdk ^0.66`, `pdf-parse ^1` after initial install pulled latest). Commit `package-lock.json`. Author ADR-014.
- [x] Verify Task 2: All deps at spec majors; zero peer-dep warnings; 2 moderate audit findings (transitive `postcss` in `next`, documented in evidence); ADR-014 written.

### T3: Supabase Local Init
- [x] Implement Task 3: Hand-author `supabase/config.toml` with all spec values (CLI not available on executor); create `supabase/migrations/.gitkeep`, `supabase/.gitignore`, `supabase/seed.sql`. Author ADR-015.
- [⚠] Verify Task 3: Config file structure verified; **`supabase start` boot not verified** because Supabase CLI is not on the executor's machine. Deferred to a developer-machine session — see suggestions.md [S001].

### T4: Vitest Setup
- [x] Implement Task 4: Author `vitest.config.ts` (non-globals, projects defined inline since vitest 4 removed `defineWorkspace`); author `tests/bootstrap.test.ts` (REQ-013 expected-failure smoke).
- [x] Verify Task 4: `npm run test` reports 2 tests passing (107 ms); zero `globals: true`; named imports used.

### T5: CI + Package Scripts
- [x] Implement Task 5: Wire all 14 `package.json` scripts; edit `.github/workflows/ci.yml` to add `npm run typecheck` before `npm run lint`. Author ADR-013.
- [x] Verify Task 5: Full quality gate `npm ci && typecheck && lint && build && test` exits 0 in **20.5s** wall clock (NFR-02 < 90s — pass); CI workflow contains the 5-step ordered sequence.

### T6: Cleanup + Domain-Model Side-Edit
- [x] Implement Task 6: Edit `.env.example` (rewrite Prisma comment); `.gitignore` Prisma line auto-removed by `create-next-app`'s overwrite; rewrite 3 `pnpm typecheck` references in [docs/domain-model/spec/spec.md](../../domain-model/spec/spec.md); append delta entry to [docs/domain-model/deltas.md](../../domain-model/deltas.md); bulk-sweep 24 downstream task plans / contract / verify files across `docs/semaforo-aggregation/`, `docs/requisitos-extraction/`, `docs/pdf-ingestion/`, `docs/domain-model/feat,contract,use-cases`.
- [x] Verify Task 6: `grep -i 'prisma' .env.example .gitignore` → 0 matches; `grep -rn 'pnpm' docs/` → 38 matches (all in project-bootstrap meta-text and the deltas record — intentional, see evidence/notes.md TC-013 deviation).

---

## Completion Summary

**Final quality gate** (clean `npm ci`):
- `npm ci` → exit 0 (382 packages)
- `npm run typecheck` → exit 0
- `npm run lint` → exit 0
- `npm run build` → exit 0 (4 routes prerendered)
- `npm run test` → exit 0 (2/2 tests pass)
- **Total wall clock:** 20.5s on developer machine (NFR-02 target: < 90s)

**Audit:** 2 moderate-severity findings (transitive `postcss` inside Next.js); 0 high-severity. NFR-05 met (high = 0).

**Pin adjustments during execution:** none required by the install resolver — all spec-pinned majors resolved cleanly. The 3 deps that initially pulled latest (`@supabase/ssr`, `@anthropic-ai/sdk`, `pdf-parse`) were re-pinned to spec majors via a follow-up `npm install` at the explicit `^X.Y` ranges.

**Deferred verifications** (recorded in `suggestions.md`):
- [S001] `supabase start` local boot — needs Supabase CLI on a dev machine
- [S002] `npm run test:coverage` baseline run
- [S003] `npm run dev` cold-boot timing
