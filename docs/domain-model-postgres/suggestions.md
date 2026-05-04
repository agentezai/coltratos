# Suggestions — domain-model-postgres

## Quick Wins

- **[S001] Fix TC-013 test: use separate MCP calls not a DO block** — `now()` is transaction-scoped, so insert + update in the same DO block see the same timestamp. Integration test uses separate client calls (different transactions), which is correct.

- **[S002] Add `empresa_member` INSERT/UPDATE policies** — the current RLS only has a SELECT policy for `empresa_member`. The `handle_new_user()` trigger uses SECURITY DEFINER so it bypasses RLS for INSERT. But any app-level flow that needs to add members (e.g. inviting a collaborator) will fail silently without an INSERT policy. Add when the multi-member feature is specced.

## Future Enhancements

- **[S003] Replace `'PENDIENTE-'` NIT placeholder with a proper onboarding state** — `handle_new_user()` sets `nit = 'PENDIENTE-<uuid-prefix>'`. The onboarding flow must enforce completing empresa profile before allowing analysis. A `empresa.onboarding_complete BOOLEAN DEFAULT false` or an `estado` enum would make the constraint explicit at the DB layer.

- **[S004] Add `analisis.updated_at` auto-bump trigger** — `empresa` has `set_empresa_profile_updated_at` but `analisis.updated_at` is not auto-managed. Service layer must set it explicitly on every state transition. A trigger matching the empresa pattern would make it bulletproof.

- **[S005] Add `segmento_categoria` constraint to `segmento.categoria` CHECK** — currently `segmento.categoria` uses the `segmento_categoria` Postgres enum directly. Adding a redundant CHECK (matching Zod) is not needed, but consider whether `general` should be blocked at the DB layer for any foreign-key consumer. Currently only `requisito.categoria` blocks `general`.

## Technical Debt

- **[S006] `empresa_member` has no INSERT policy for app-level member creation** — if multi-member teams ship before an explicit policy is added, the feature will appear broken. Track this explicitly.

## Questions for the Human

- **[S007] Should `analisis.pliego_ids` remain `UUID[]` or move to a join table?** — v1 cardinality is always 1. If v2 ever needs to query "all analisis for a given pliego" efficiently, a join table with an index would be faster than an array `@>` operator scan. Decide before pliego volume grows.
