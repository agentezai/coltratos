# ADR-003: Supabase RLS for Tenant Isolation

**Status**: Accepted

## Decision

Enforce row-level tenant isolation via Supabase Row Level Security policies, not application-layer filters.

## Rationale

- DB-layer enforcement survives direct access, future microservices, and admin queries — application filters do not.
- Isolation is declared at table-creation time, not retroactively; any missed table is caught in the migration review.
- Future direct DB access tools (Supabase Studio, pg_dump) respect RLS automatically.

## Policy bifurcation

- **Public tables** (e.g. `proceso`): RLS requires `authenticated` role but NOT empresa membership — multiple companies reference the same proceso.
- **Empresa-private tables** (e.g. `analisis`, `requisito`, `pliego`, `segmento`, `prompt_cache`): RLS joins `empresa_member` to confirm the caller's JWT `sub` is a member of the owning empresa.

## Consequences

- Every new table MUST have an RLS policy declared in its migration.
- Storage bucket policies are separate from DB RLS — each bucket requires its own `storage.objects` policy.
- `procesos` is the single exception: it is shared infrastructure, not tenant-scoped.
