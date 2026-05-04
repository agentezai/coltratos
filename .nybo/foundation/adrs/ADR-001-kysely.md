# ADR-001: Kysely as Query Builder

**Status**: Accepted

## Decision

Use Kysely as the SQL query builder instead of Prisma or Drizzle.

## Rationale

- Fine-grained SQL control — no hidden N+1s, no generated query surprises.
- No codegen step required; types are hand-authored and stay in sync with migrations.
- Compatible with Supabase RLS: Kysely does not bypass row-level security policies.
- `ColumnType<select, insert, update>` enables immutable column enforcement at the type layer (e.g. `categoria` on `requisito`, `profile_updated_at` on `empresa`).

## Consequences

- Migrations are hand-written SQL (not generated from the schema). Domain types in `src/types/db.ts` must be kept in sync manually.
- No ORM magic — joins and aggregations are explicit.
