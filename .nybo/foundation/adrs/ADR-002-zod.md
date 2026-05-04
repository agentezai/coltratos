# ADR-002: Zod as Runtime Validator

**Status**: Accepted

## Decision

Use Zod for runtime schema validation across all domain entities.

## Rationale

- Single source of truth: `z.infer<typeof Schema>` generates TypeScript types; no separate type files needed.
- Parse-on-entry pattern: validation errors are surfaced at system boundaries (API responses, LLM output), not deep in business logic.
- `RequisitoExtractionPayloadSchema` validates LLM output before it reaches the orchestrator — schema validation failure is a well-typed `ZodError` the caller can handle.
- `.refine()` validators on `SegmentoSchema` mirror the Postgres CHECK constraints, catching invalid data before it hits the DB.

## Consequences

- Schemas with `.transform()` (e.g. branded ID coercion) become `ZodEffects` and cannot be `.partial()`ed directly.
- `z.infer<>` types reflect the output shape after transforms, which may differ from the raw DB row type. Use `Selectable<Table>` from Kysely for raw DB row types.
