=== Diff summary (project-bootstrap T1-T6) ===

--- New top-level files ---
-rw-r--r--  1 carlosvilla  staff     737 Apr 28 10:52 eslint.config.mjs
-rw-r--r--  1 carlosvilla  staff     247 Apr 28 10:51 next-env.d.ts
-rw-r--r--  1 carlosvilla  staff     133 Apr 28 10:51 next.config.ts
-rw-r--r--  1 carlosvilla  staff  285283 Apr 28 10:53 package-lock.json
-rw-r--r--  1 carlosvilla  staff    1251 Apr 28 10:55 package.json
-rw-r--r--  1 carlosvilla  staff      94 Apr 28 10:51 postcss.config.mjs
-rw-r--r--  1 carlosvilla  staff     816 Apr 28 10:52 tsconfig.json
-rw-r--r--  1 carlosvilla  staff    1165 Apr 28 10:56 vitest.config.ts

--- New directories ---
app/
node_modules/
public/
src/
supabase/
tests/

--- ADR files added ---
.nybo/foundation/adrs/ADR-013-nextjs-16-app-router.md
.nybo/foundation/adrs/ADR-014-npm-package-manager.md
.nybo/foundation/adrs/ADR-015-kysely-postgres-js-dialect.md
.nybo/foundation/adrs/ADR-016-geist-self-hosted.md
.nybo/foundation/adrs/ADR-017-tailwind-v4-theme-tokens.md
.nybo/foundation/adrs/ADR-018-inline-icon-component.md

--- Files edited in domain-model ---
spec.md NFR-01 / TC-005 / Performance Goals — pnpm → npm run typecheck (3 lines)
deltas.md — appended Delta 2026-04-28 entry
feat/, contract/, etc — bulk pnpm → npm run sweep (downstream task plans)
