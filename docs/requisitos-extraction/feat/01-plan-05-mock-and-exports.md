# T5: MockRequisitosExtractor + Public Barrels

## Scope

- `lib/extraction/mock/extractor.ts` — NEW. `MockRequisitosExtractor` implementing the same interface with canned outputs.
- `lib/extraction/mock/index.ts` — NEW. Barrel.
- `lib/extraction/anthropic/index.ts` — NEW. Barrel re-exporting the public surface of the Anthropic implementation.
- `lib/extraction/index.ts` — NEW. Top-level barrel re-exporting the interface and BOTH implementations.

## Changes

### `lib/extraction/mock/extractor.ts`

- Import only `RequisitosExtractor`, `ExtractorInput`, `ExtractorOutput` from `'../types'` AND `Requisito`, `ModelMetadata` from `@/types`.
- **Forbidden**: `@anthropic-ai/sdk`, `process.env`, any `node:` import. The provider-isolation grep (REQ-017, T6) enforces this.
- Export `class MockRequisitosExtractor implements RequisitosExtractor`:
  - Constructor: `constructor(opts?: { cannedOutputs?: Map<string, ExtractorOutput>; defaultOutput?: ExtractorOutput; throwOn?: ExtractorError })`.
  - Cache key for `cannedOutputs` lookup: `${input.pliego.file_hash}:${input.empresa.id}` (the same idempotency key the orchestrator uses, sans `implementation_id`).
  - `async extract(input)`:
    1. If `throwOn` is set, reject with that error.
    2. If `cannedOutputs` has the key, return that.
    3. If `defaultOutput` is set, return it (with `modelMetadata.implementation_id = 'mock'` regardless of what the canned default says).
    4. Otherwise return a deterministic empty `ExtractorOutput`: `{ requisitos: [], costUsd: 0, modelMetadata: { implementation_id: 'mock', model_name: 'mock', prompt_version: 'mock' } }`.

### `lib/extraction/mock/index.ts`

- Re-export `MockRequisitosExtractor` only.

### `lib/extraction/anthropic/index.ts`

- Re-export `AnthropicRequisitosExtractor` (from `./extractor`).
- Re-export `EXTRACTION_MODEL`, `PROMPT_VERSION`, `IMPLEMENTATION_ID`, `COST_CEILING_USD` from `./config` — composition-root code may need to log or display these.
- **Do NOT** re-export internal helpers (prompt assembly, validation, cost). Those stay implementation-private.

### `lib/extraction/index.ts`

- Re-export the interface module: `export * from './types'`.
- Re-export `AnthropicRequisitosExtractor` and config constants from `./anthropic`.
- Re-export `MockRequisitosExtractor` from `./mock`.
- Consumers should import from `@/lib/extraction` (or whatever the project's import alias is) — single import surface.

### Design Rationale (Liskov, OCP)

The mock satisfying the interface provides **type-level proof** that the interface has not leaked implementation concepts: if the interface ever pulls in an Anthropic-specific shape (a stray `cache_control`, a model string union, etc.), `MockRequisitosExtractor` would fail to compile. This is cheaper than runtime tests and catches the regression at the PR diff level. Putting the mock under `lib/` (not `tests/__mocks__/`) means the same provider-isolation grep applies — it can't accidentally accumulate Anthropic dependencies through a less-watched test directory.

The split barrels (`anthropic/index.ts`, `mock/index.ts`, top-level `index.ts`) let composition roots opt into the implementations they need without forcing the mock to bundle into production code if a build tool tree-shakes by entry point.

## Dependencies

Requires **T4** (the Anthropic implementation).

## Done When

- [ ] `lib/extraction/mock/extractor.ts` exports `MockRequisitosExtractor`.
- [ ] Type-check confirms `MockRequisitosExtractor` satisfies `RequisitosExtractor` using ONLY domain types.
- [ ] Grep for `@anthropic-ai/sdk` under `lib/extraction/mock/` returns zero matches.
- [ ] `lib/extraction/anthropic/index.ts` re-exports the public Anthropic surface (no internal helpers).
- [ ] `lib/extraction/index.ts` re-exports interface + both implementations.
- [ ] A consumer file `lib/extraction/__import_check__.ts` (gitignored or removed before merge) imports `RequisitosExtractor`, `AnthropicRequisitosExtractor`, `MockRequisitosExtractor` from `lib/extraction` and confirms all three resolve.
- [ ] `npm run typecheck` passes.
- [ ] Unit tests cover: canned-output lookup hits, default-output fallback, `throwOn` behavior, cache-key construction.
