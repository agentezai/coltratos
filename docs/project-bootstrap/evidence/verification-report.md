# Verification Report — project-bootstrap

**Date:** 2026-04-28
**Spec:** [project-bootstrap](../spec/spec.md)
**Verifier:** /nybo-verify (auto mode)
**Verdict:** ✅ **VERIFIED**

---

## Evidence summaries

### Build
- **Result:** ✅ pass — `next build` exit 0
- **Compile:** 2.3s (Turbopack)
- **TypeScript:** 2.7s, 0 errors
- **Routes:** 4 prerendered as static (`/`, `/_not-found`, `+ 2 internal`)
- **Warnings:** 1 — Next.js detected a stray `package-lock.json` outside the repo at `/Users/carlosvilla/package-lock.json`. Suppressible via `turbopack.root` in `next.config.ts`. Not in scope of this verification.
- **Log:** [build.log](./build.log)

### Tests
- **Result:** ✅ 2/2 passing, 0 failed, 0 skipped
- **Duration:** 108–119 ms across runs
- **Type errors during test run:** 0
- **Tests:**
  - `tests/bootstrap.test.ts > project-bootstrap smoke test > vitest is installed and runs (REQ-006)` — 1 ms
  - `tests/bootstrap.test.ts > project-bootstrap smoke test > the @/types path alias is wired but the barrel does not yet exist (REQ-013)` — 4 ms (expected-failure smoke; goes to the catch branch as designed)
- **Log:** [test-results.txt](./test-results.txt)

### Coverage
- **Result:** 0/0 statements, branches, functions, lines (vitest reports "Unknown%")
- **Reason:** RN-010 forbids domain code in the bootstrap spec. No source files exist yet to cover; the only test asserts a structural invariant. Coverage gates start applying once domain-model T1 lands `src/types/domain/primitives.ts`.
- **Log:** [coverage-summary.txt](./coverage-summary.txt) and [coverage-run.txt](./coverage-run.txt)

### Diff
- **Repo state:** No `HEAD` yet (master branch, no commits). Every file added during `/nybo-run project-bootstrap` is net-new.
- **Top-level entries created:** 13 (`app/`, `public/`, `src/`, `supabase/`, `tests/`, `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`).
- **Pre-existing entries kept:** `.github/`, `.claude/`, `.nybo/`, `.gitignore` (overwritten by cnx with no Prisma line), `AGENTS.md` (restored from backup), `CLAUDE.md`, `docs/`, `.env`, `.env.example` (Prisma comment rewritten).
- **Cross-spec edits:** 3 lines in `docs/domain-model/spec/spec.md` (`pnpm typecheck` → `npm run typecheck`); new delta entry in `docs/domain-model/deltas.md`; 24 downstream task plans rewritten via bulk `pnpm` → `npm run` sweep.
- **node_modules:** 557 MB.
- **Log:** [diff-summary.txt](./diff-summary.txt)

### Security
- **`npm audit --production`:** 2 moderate, 0 high.
- **Findings:** Both moderate findings are transitive `postcss <8.5.10` inside Next.js 16.2.4's bundled build pipeline (advisory GHSA-qx2v-qp2m-jg93 — XSS via Unescaped `</style>` in CSS Stringify Output). The `npm audit fix --force` would force a `next@9.3.3` downgrade (breaking).
- **NFR-05:** met (high = 0).
- **No standalone security scan run** (security-scan.txt absent — outside this spec's scope).
- **Peer-dep warnings:** 0.

### Design principles
- **Clarity:** Spec text + 6 ADRs (013–018) name choices and tradeoffs explicitly. Each task plan has a single-sentence "Design Rationale". No silent defaults.
- **Consistency:** All 6 ADRs follow the same Status / Context / Decision / Alternatives / Consequences shape. After T6's bulk sweep, all approved specs are uniform on `npm run` invocation; 38 meta-references to `pnpm` are preserved (project-bootstrap meta-text + the new domain-model delta), 0 prescriptive `pnpm` invocations remain.

### Wiki alignment
- **N/A.** No `wiki/` directory exists. project-bootstrap is infrastructure with no user-visible capabilities.

---

## Human decisions on each checklist item

| Item | Verdict | Notes |
|------|---------|-------|
| Build | ✅ accepted | One stray-lockfile warning, not project-owned |
| Tests | ✅ accepted | 2/2 pass; expected-failure smoke flips automatically when domain-model T6 ships |
| Coverage | ✅ accepted | 0/0 expected for bootstrap (RN-010 forbids domain code) |
| Diff | ✅ accepted | Repo has no HEAD yet; everything is net-new |
| Security | ✅ accepted | 2 moderate + 0 high; documented for re-eval |
| Design principles | ✅ accepted | Clarity + Consistency upheld across spec + ADRs |
| Wiki alignment | N/A | No user-visible capabilities to document |

### Open questions resolved (Q001–Q003)

The user resolved all three open questions during this verification step. All three landed as durable repo edits documented in [deltas.md](../deltas.md):

| Q | Decision | Edit applied |
|---|----------|--------------|
| **Q001** Supabase storage in scope? | ✅ YES, in scope for v1 | `supabase/config.toml`: `[storage] enabled = true, file_size_limit = "50MiB"` |
| **Q002** CI db job with postgres? | ✅ YES, add it now | `.github/workflows/ci.yml`: new `db` job with `postgres:15` service, smoke-check stub for now (replaced by migration tests as domain-model T4 ships) |
| **Q003** `.env` dev-only? | ✅ Confirmed | No file change; acknowledged in deltas.md |

After applying Q001 + Q002 edits, the full quality gate was re-run and all four checks remain green (typecheck ✅, lint ✅, build ✅, test ✅).

---

## Notable deviations from the spec (recorded for sign-off)

1. **cnx scaffold-in-temp workaround** — `create-next-app` aborted on the non-empty repo; pivot was to scaffold in `/tmp` and copy generated files in.
2. **vitest 4 API change** — `defineWorkspace` removed; workspace projects moved inline into `vitest.config.ts` under `test.projects`.
3. **`@ts-expect-error` in bootstrap smoke test** — TypeScript strict mode typechecks the dynamic `import('@/types')` at compile time; directive removes itself when domain-model T6 lands the barrel.
4. **TC-013 strict reading** — Zero `pnpm` matches in `docs/` is impossible (project-bootstrap and the new delta record describe the rename). Achieved: 0 prescriptive invocations across all non-meta surfaces.
5. **T3 Supabase boot deferred to dev machine** — CLI not on the executor. Tracked as [S001](../suggestions.md#s001).
6. **Pin re-roll** — initial install pulled latest for 3 deps; re-pinned to spec majors per RN-004.

---

## Verdict

**✅ VERIFIED** — All findings accepted; three scope decisions captured as durable edits + delta entries; status updated to `confirmed`.

**Status transitions:**
- `docs/status.yaml` `project-bootstrap.status`: `in-review` → `confirmed` (`verified_at: 2026-04-28`)
- `docs/project-bootstrap/status.yaml`: `in-review` → `confirmed` (`verified_at: 2026-04-28`)

**Events logged:** `verify_passed` + auto-emitted `curate_needed` (via `nybo verify --record pass --feature project-bootstrap`).

---

## Next steps

- `/nybo-pr` — open the pull request that ships project-bootstrap to `main`. The branch is currently `master` with no commits; the PR step will need to handle the initial-commit case.
- `/nybo-run design-system` — now unblocked. Runs the design-system spec on top of the bootstrapped scaffold.
- `/nybo-curate` — process the `curate_needed` signal (the three Q-decisions are good candidates for convention promotion).
