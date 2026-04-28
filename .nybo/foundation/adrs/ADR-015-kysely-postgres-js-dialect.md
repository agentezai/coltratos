# ADR-015: kysely-postgres-js as the Kysely dialect

## Status
Accepted (2026-04-28)

## Context

[ADR-001](./ADR-001-kysely.md) chose Kysely as the query builder over Prisma / Drizzle. Kysely is dialect-agnostic; the dialect package determines which Postgres driver runs the SQL. The repo targets Vercel deployment (per [CORE.md](../../memory/CORE.md)) and Supabase as the database; both support multiple driver choices.

## Decision

Use **kysely-postgres-js** as the Kysely dialect. The underlying driver is **Postgres.js** (`postgres@^3`). Both packages are installed by [project-bootstrap T2](../../../docs/project-bootstrap/feat/01-plan-02-runtime-dependencies.md).

## Alternatives Considered

- **`pg` driver + built-in `PostgresDialect`** — the legacy choice. Heavier (no Bun support), older API, no first-class connection pooling for serverless runtimes. Rejected.
- **`@vercel/postgres-kysely`** — Vercel-branded wrapper around `pg`. Locks semantics to Vercel's Postgres SDK even though we're using Supabase. Rejected: the Vercel hosting choice is current but not future-proof; a vendor-neutral dialect is cheaper to migrate from.
- **`kysely-d1` / `kysely-deno-postgres` / others** — irrelevant runtimes.

## Consequences

- (+) **Bun-ready** — Postgres.js supports Bun's native SQL binding; `kysely-postgres-js@^3` ships with Bun support out of the box. Future migrations to Bun (test-runner or runtime) need no dialect change.
- (+) **Vercel + Supabase compatible** — works with Supabase's pgbouncer pooling on `DATABASE_URL` and direct connections on `DIRECT_URL`.
- (+) **Simple API** — Postgres.js's tagged-template + connection pool API is straightforward.
- (−) Less mainstream than `pg`; some StackOverflow answers won't apply directly.
- (−) Connection lifecycle (`sql.end()`) needs explicit handling in long-running scripts (not on the critical path for serverless).

## References
- kysely-postgres-js README (npm, version 3.x)
- [domain-model ADR-001](./ADR-001-kysely.md)
- [project-bootstrap REQ-004](../../../docs/project-bootstrap/spec/spec.md)
