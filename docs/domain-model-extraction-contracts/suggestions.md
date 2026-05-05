# Suggestions — domain-model-extraction-contracts

## Quick Wins

- **[S001] Export `RequisitoExtractionPayloadArraySchema` from barrel** — currently only `RequisitoExtractionPayloadSchema` is exported. The array variant is defined but not re-exported. `requisitos-extraction` will need it when parsing multi-requisito LLM responses.

## Future Enhancements

- **[S002] Add `HABILITANTE_PATTERNS_VERSION` to per-analysis cost log** — when the version changes, cached `is_habilitante_source = 'structural'` classifications become stale. Recording the version at analysis creation time makes stale-cache detection trivial at query time.

- **[S003] Consider adding a `SemaforoColorSchema` Zod enum** — `Semaforo` and `RequisitoExtractionPayloadSchema` both reference the 3-value semáforo enum as an inline literal. A shared `SemaforoColorSchema = z.enum(['verde', 'amarillo', 'rojo'])` in `primitives.ts` would be the single source of truth. Currently duplication is minimal (2 sites) but will grow as more schemas reference the field.

## Technical Debt

- **[S004] `semaforo.ts` uses an inline `import()` type for `RequisitoCategoria`** — `byCategoria: Record<import('./primitives').RequisitoCategoria, SemaforoColor>` works but the type-only re-export at the top of the file means the import path is used twice. Could be simplified by assigning the re-export to a local alias.

## Questions for the Human

- **[S005] Should `RequisitoExtractionPayloadArraySchema` be the default export shape from the LLM?** — the LLM likely returns an array of requisitos per document chunk. Confirming this now would let `requisitos-extraction` T1 start with the right parsing entrypoint.
