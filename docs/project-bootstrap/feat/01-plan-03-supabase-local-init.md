# T3: Supabase Local Init

## Scope

- `supabase/` — directory created by `supabase init`.
- `supabase/config.toml` — configuration for the local Supabase stack.
- `supabase/migrations/` — empty directory (domain-model T3 writes the first migration).
- `supabase/.gitignore` — generated; ensures local secrets aren't committed.
- `.nybo/foundation/adrs/ADR-015-kysely-postgres-js-dialect.md` — NEW.

## Changes

### Install Supabase CLI (prerequisite — Engineer-side)

The Supabase CLI is **not** an npm dependency. It's installed globally on the developer's machine:

```bash
# macOS (Homebrew)
brew install supabase/tap/supabase

# OR via npm global (deprecated path; works but Homebrew is preferred)
npm install -g supabase
```

CI does not need the Supabase CLI for the v1 quality gate (no migration tests run in CI). When migration tests are added (post-domain-model T3), CI will install the CLI as a separate step.

### Run `supabase init` (REQ-007)

```bash
supabase init
```

This produces:
- `supabase/config.toml` — local stack config.
- `supabase/.gitignore` — keeps local artifacts out of git.
- `supabase/seed.sql` (empty) — convention-only, no domain seed in v1.

### Configure `supabase/config.toml`

Edit the generated config to set:

```toml
project_id = "coltratos"

[api]
enabled = true
port = 54321
schemas = ["public"]

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/**"]

[storage]
enabled = false  # not needed in v1; pliego files live in Postgres / object store TBD by upload-flow spec
```

`db.major_version = 15` matches Supabase's current default (Postgres 15.x); domain-model T3's migration is authored against this version.

`auth.enabled = true` is for future FE specs; the auth table set is auto-created by Supabase. RLS in [domain-model T4](../../domain-model/feat/01-plan-04-rls-policies.md) joins `auth.uid()` and `empresa_member.user_id`.

### Verify the local stack boots (TC-007)

```bash
npm run db:start  # alias for `supabase start` — wired in T5
```

Expected output (abbreviated):

```
Started supabase local development setup.
         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
        anon key: eyJhbGc...
service_role key: eyJhbGc...
```

Smoke test:

```bash
psql 'postgresql://postgres:postgres@localhost:54322/postgres' -c '\dt'
# Expected: "Did not find any relations." — empty schema.
```

### Author ADR-015 (REQ-011, RN-009)

Write `.nybo/foundation/adrs/ADR-015-kysely-postgres-js-dialect.md`:

```markdown
# ADR-015: kysely-postgres-js as the Kysely dialect

## Status
Accepted (2026-04-27)

## Context
[ADR-001](./ADR-001-kysely.md) chose Kysely as the query builder over
Prisma/Drizzle. Kysely is dialect-agnostic; the dialect package determines
which Postgres driver runs the SQL. The repo targets Vercel deployment
(per CORE.md) and Supabase as the database; both support multiple driver
choices.

## Decision
Use **kysely-postgres-js** as the Kysely dialect. The underlying driver is
**Postgres.js** (`postgres@^3`).

## Alternatives Considered
- **pg + built-in `PostgresDialect`** — the legacy choice. Heavier (no Bun
  support), older API, no first-class connection pooling for serverless.
  Rejected.
- **@vercel/postgres-kysely** — Vercel-branded wrapper around `pg`. Locks
  semantics to Vercel's Postgres SDK even though we're using Supabase.
  Rejected: the Vercel hosting choice is current but not future-proof; a
  vendor-neutral dialect is cheaper to migrate from.
- **kysely-d1** / **kysely-deno-postgres** / others — irrelevant runtimes.

## Consequences
- (+) **Bun-ready** — Postgres.js supports Bun's native SQL binding;
  kysely-postgres-js@^3 ships with Bun support out of the box. Future
  migrations to Bun (test-runner or runtime) need no dialect change.
- (+) **Vercel + Supabase compatible** — works with Supabase's pgbouncer
  pooling on `DATABASE_URL` and direct connections on `DIRECT_URL`.
- (+) **Simple API** — Postgres.js's tagged-template + connection pool API
  is straightforward.
- (−) Less mainstream than `pg`; some StackOverflow answers won't apply
  directly.
- (−) Connection lifecycle (`sql.end()`) needs explicit handling in
  long-running scripts (not on the critical path for serverless).

## References
- kysely-postgres-js README (npm, version 3.x)
- [domain-model ADR-001](./ADR-001-kysely.md)
- [project-bootstrap REQ-004](../../docs/project-bootstrap/spec/spec.md#L51)
```

### Design Rationale (Single Responsibility)

T3 owns one concern: the local database substrate. The dialect choice is co-located here (rather than in T2 with the dependency install) because the dialect choice is **about the connection layer**, and the connection layer is what `supabase init` makes real. The dependency install in T2 is a mechanical consequence of this decision, not its origin.

## Dependencies

Requires **T2** — `kysely-postgres-js` and `postgres` must already be installed (they appear in `package.json`) before this task documents the connection-layer choice in the ADR.

Requires **Docker** running on the developer's machine for `supabase start` to succeed. CI does NOT require Docker for v1.

## Done When

- [ ] `supabase/` directory exists.
- [ ] `supabase/config.toml` exists with the values above.
- [ ] `supabase/migrations/` directory exists (empty; gitkeep optional — Supabase may track it implicitly).
- [ ] `supabase start` boots the local Docker stack within ~60s on first run, ~10s on subsequent runs (TC-007).
- [ ] `psql $DIRECT_URL -c '\dt'` returns "Did not find any relations." on an empty schema.
- [ ] `.nybo/foundation/adrs/ADR-015-kysely-postgres-js-dialect.md` exists with all required sections (TC-012).
