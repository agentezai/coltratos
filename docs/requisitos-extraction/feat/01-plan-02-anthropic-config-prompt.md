# T2: Anthropic Config + Cache-Aware Prompt Assembly

## Scope

- `lib/extraction/anthropic/config.ts` — NEW. Pinned model, prompt version, per-million-token prices, cost ceiling constant, REVIEW BY date, SDK_MAJOR comment.
- `lib/extraction/anthropic/prompt.ts` — NEW. Cache-aware `MessageCreateParams` assembly per categoría.

## Changes

### `config.ts`

- Export `EXTRACTION_MODEL: string` — the pinned Claude Sonnet model name at execute time. Implementer chooses the latest Sonnet **at the moment of T2 execution** (do not hardcode in this spec). Initial guidance: `claude-sonnet-4-6`.
- Export `PROMPT_VERSION: string` — semver-shaped string (e.g., `'v1.0.0'`). Bumping invalidates **all** Anthropic prompt caches globally per RN-009.
- Export `IMPLEMENTATION_ID = 'anthropic' as const` — populates `ModelMetadata.implementation_id`.
- Export `COST_CEILING_USD = 0.05 as const` (REQ-012, RN-004).
- Export `PRICES_PER_MTOK`: `{ input: number, cacheCreation: number, cacheRead: number, output: number }` — populated from the Anthropic pricing page at T2 execution time. Per RN-011 these prices change with model releases; the implementer MUST snapshot them at execution and revisit on the REVIEW BY date.
- File header comment block:
  ```
  // REVIEW BY 2026-10-26 — re-evaluate EXTRACTION_MODEL and PRICES_PER_MTOK against
  //                       the latest Anthropic releases. A cheaper or faster Sonnet
  //                       directly improves unit economics.
  // SDK_MAJOR=<n>      — Anthropic SDK major version this file was authored against.
  //                       Update on SDK upgrades.
  ```
- Prohibit any `process.env` read in this file. Prohibit any string literal matching `/^claude-/` outside `EXTRACTION_MODEL`.

### `prompt.ts`

- Export `buildCategoryRequest(args): Anthropic.Messages.MessageCreateParams` where `args = { categoria: SegmentoCategoria, segments: Segment[], empresa: Empresa, validationErrorFromPriorAttempt?: string }`.
- The function constructs a `messages.create` payload with this structure (REQ-007, RN-008):
  - `model: EXTRACTION_MODEL` from config.
  - `max_tokens`: a constant from config (target ≤4096 for v1).
  - `system`: an array of two blocks:
    1. Block 1 — extraction instructions + `RequisitoExtractionPayloadSchema` JSON-Schema rendering. Carries `cache_control: { type: 'ephemeral' }`. Stable across calls.
    2. Block 2 — empresa profile rendering. Embeds `empresa.profile_updated_at` as ISO string in the cached prefix so empresa edits invalidate the cache automatically (RN-008, RN-009). Carries `cache_control: { type: 'ephemeral' }`.
  - `messages`: a single `user` message with the categoría label + concatenated segment texts. **Not cached** (varies per call).
  - When `validationErrorFromPriorAttempt` is present, append a final user-message paragraph: `"Your previous response failed schema validation with: <error>. Re-emit the response strictly conforming to the schema above."` (REQ-009, RN-013).
- Export `assembleEmpresaBlock(empresa: Empresa): string` — pure helper rendering the empresa profile in deterministic field order. Tested in isolation in T3.
- The function MUST NOT call the SDK; it only assembles the params object. Caller (T4 extractor) makes the actual `client.messages.create(...)` call.

### Design Rationale (Single Responsibility)

`config.ts` owns version/cost/model knobs — the things that change on a different cadence than code. `prompt.ts` owns prompt structure — changes whenever extraction quality is iterated. Splitting them means a prompt iteration PR doesn't touch the cost-ceiling constant (and vice versa), and the REVIEW BY review is a focused PR against `config.ts` only.

## Dependencies

Requires **T1** — `prompt.ts` references `RequisitoExtractionPayloadSchema` from `@/types` (added in T0). The interface module doesn't need to be touched, but the Zod schema must exist.

## Done When

- [ ] `lib/extraction/anthropic/config.ts` exists with all exports above and the REVIEW BY + SDK_MAJOR header comments.
- [ ] `lib/extraction/anthropic/prompt.ts` exports `buildCategoryRequest` and `assembleEmpresaBlock`, both pure (no SDK calls).
- [ ] Both system blocks in the assembled payload carry `cache_control: { type: 'ephemeral' }`.
- [ ] The empresa block textually contains `empresa.profile_updated_at` (verifiable via grep on the assembled string).
- [ ] Grep for `'claude-'` literal under `lib/extraction/anthropic/` returns matches ONLY in `config.ts`.
- [ ] `npm run typecheck` passes.
- [ ] Unit tests cover: cache_control placement, empresa block contains `profile_updated_at`, validation-error-injection branch produces the expected user-message suffix.
