# domain-model-primitives — Suggestions

## Quick Wins

- **[S001]** Add a shared `TEST_IDS` helper in `src/__tests__/helpers/ids.ts` with RFC-compliant UUIDs reused across all domain tests — eliminates the per-file UUID constant duplication introduced by Zod v4's strict UUID validation.

- **[S002]** Add `zod` version constraint to `package.json` (pin `"zod": "4.x"`) — a future `npm update` could pull in a breaking v5 that changes the UUID validation behavior again without warning.

## Future Enhancements

- **[S003]** Add a `PromptCacheId`-to-`PliegoId` mapping helper once caching logic is implemented — the `PromptCacheTable` shape is ready but no domain service consumes it yet.

- **[S004]** Consider extracting `ModelMetadata` from `db.ts` into `src/types/domain/analisis.ts` — it is a domain concept, not a Kysely concern, and living in `db.ts` makes it slightly awkward to import in test-only or non-DB contexts.

## Technical Debt

- **[S005]** `TYPECHECK_ONLY = false as boolean` pattern in type tests is a workaround for vitest running `.test-d.ts` files at runtime. Revisit when vitest adds a "type-check only" project mode that skips runtime execution.

- **[S006]** `SegmentoSchema` `.refine()` validators mirror Postgres CHECK constraints — if the constraints change in `domain-model-postgres`, these must be kept in sync manually. Consider a shared validation constants file to reduce drift risk.

## Questions for the Human

- **[S007]** Should `PromptCacheSchema` validate that `expires_at > cached_at`? The DB schema doesn't enforce this, but an invalid cache entry (already expired at creation) would silently waste storage.

- **[S008]** `AnalisisSchema.pliego_ids` is typed as `z.array(z.string().uuid())` with no length constraint. Should it enforce `length === 1` for MVP (v1 always has exactly one pliego)? This would make the constraint explicit and catch bugs earlier.
