# project-bootstrap — Suggestions

Captured during `/nybo-run project-bootstrap` on 2026-04-28. These are not blocking; each is sized for a future spec, curation pass, or PR conversation.

---

## Quick Wins

### [S001] Verify `supabase start` boots locally

**Effort:** 10 min on a developer machine with Docker.
**Why:** T3 created the `supabase/config.toml` with the spec values, but `supabase start` was not invoked because the executor lacked the Supabase CLI. Domain-model T3 (the first migration) cannot run without it.
**How:** `brew install supabase/tap/supabase && supabase start && psql "postgresql://postgres:postgres@localhost:54322/postgres" -c '\dt'`. Save the output to `docs/project-bootstrap/evidence/supabase-boot.txt`.

### [S002] Run `npm run test:coverage` once and review thresholds

**Effort:** 5 min.
**Why:** The script exists (T5) but was not invoked during T9 verification. Establishing a baseline coverage report before any feature ships gives downstream specs a concrete target.
**How:** `npm run test:coverage`, capture the `coverage/coverage-summary.json`, decide if a threshold gate is worth wiring into CI. Today's coverage is trivially 0% (only the bootstrap smoke test runs).

### [S003] Capture `npm run dev` boot time on a developer machine

**Effort:** 5 min.
**Why:** NFR-03 sets a `< 60s` cold-boot target. T1's contract verification was deferred because `npm run build` succeeded as a proxy. Capturing the actual `npm run dev` cold time validates the perf claim and locks the baseline before any future regression.

---

## Future Enhancements

### [S004] Add `npm run audit` script + medium-severity advisory tracking

**Why:** `npm audit --production` reports 2 moderate findings (transitive `postcss` inside Next 16.2.4). The fix is a breaking Next downgrade. Wire a script that runs `npm audit --omit=dev --audit-level=high` (fails only on high+) and document the moderate findings in `docs/project-bootstrap/evidence/audit-known-issues.md` with re-evaluation cadence.

### [S005] Self-host JetBrains Mono (defer until offline-mono required)

**Why:** ADR-016 explicitly chose `next/font/google` for JetBrains Mono and deferred self-hosting. If a future spec needs offline mono (e.g., air-gapped deploy), self-host alongside Geist. New ADR or amendment to ADR-016.

### [S006] Pre-commit hooks (husky + lint-staged)

**Why:** Spec explicitly defers these ("until a feature surfaces value"). The first time a contributor pushes a typecheck-failing PR, this becomes worth shipping.

---

## Technical Debt

### [S007] tsconfig drift detection

**Why:** Next.js 16 silently rewrote `tsconfig.json` during the first `npm run build` (changed `"jsx": "preserve"` → `"jsx": "react-jsx"`). Future Next majors may rewrite other fields. A pre-build check (e.g., `node -e "console.log(JSON.stringify(require('./tsconfig.json'),null,2))" | sha256sum`) and a post-build comparison would surface unexpected drift.

### [S008] Project-bootstrap re-bootstrap recipe

**Why:** `create-next-app` aborts in a non-empty directory (we hit this; pivoted to scaffold-in-temp + copy). When the next major Next.js release ships and we want to re-bootstrap, a documented recipe under `.nybo/skills/rebootstrap.md` would compress 30 minutes of "what conflicts can be ignored, what gets overwritten, what must be merged" into a single skill invocation.

### [S009] Audit `pnpm` references in newly-authored specs

**Why:** T6's bulk sweep cleared 24 files. Future contributors may copy-paste from old specs. A linter rule (`grep -E '\bpnpm\b' docs/*/spec/*.md docs/*/feat/*.md docs/*/contract/*.md && exit 1`) added to CI would catch new drift. Lightweight; doesn't fight legitimate meta-references in the project-bootstrap spec or deltas files (whitelist those paths).

---

## Questions for the Human

### [Q001] ✅ RESOLVED 2026-04-28 — Supabase storage IS in scope for v1

`supabase/config.toml` updated: `[storage] enabled = true`, `file_size_limit = "50MiB"`. Bucket layout / RLS / retention remain owned by the upload-flow spec. See [deltas.md Q001](./deltas.md).

### [Q002] ✅ RESOLVED 2026-04-28 — CI gains a `db` job with `postgres:15`

`.github/workflows/ci.yml` updated: added a parallel `db` job with the `postgres:15` service, `DATABASE_URL` / `DIRECT_URL` env, and a smoke-check (`SELECT version()`). Today the job is a stub; domain-model T4 onward replaces the smoke step with `npm run db:push` + integration tests. See [deltas.md Q002](./deltas.md).

### [Q003] ✅ RESOLVED 2026-04-28 — `.env` contents are dev-only (acknowledged)

User confirmed during /nybo-verify that no production keys are in the repo's `.env`. `.gitignore` excludes `.env*`. No file change required. See [deltas.md Q003](./deltas.md).
