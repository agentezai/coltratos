# T3: Output Validation + Citation Verification

## Scope

- `lib/extraction/anthropic/validation.ts` — NEW. Zod parsing of the model's raw JSON output against `RequisitoExtractionPayloadSchema`, plus the NFD-normalized substring citation verifier.

## Changes

### `validation.ts`

- Export `parseAndValidatePayload(rawText: string): RequisitoExtractionPayload`:
  - Strip any leading/trailing markdown code fences (`'\`\`\`json' ... '\`\`\`'`) the model may emit despite instructions.
  - `JSON.parse` the result. On parse error, throw `ExtractorSchemaValidationError` with the JSON parse error in `validationErrors`.
  - Run `RequisitoExtractionPayloadSchema.safeParse`. On failure, throw `ExtractorSchemaValidationError` with `result.error.issues` in `validationErrors`.
  - Return the typed `RequisitoExtractionPayload`.
- Export `verifyCitation(args): { verified: boolean }` where `args = { quote: string, segment: Segment }` (REQ-010, RN-012):
  - Apply the **same NFD-normalization formula** specified in [pdf-ingestion REQ-005](../../../pdf-ingestion/spec/spec.md): `text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()`. Use a shared utility if one exists in `@/types` or `lib/`; otherwise import `normalizeText` from `lib/text/` (create if needed — but prefer reuse).
  - Trim whitespace on both quote and segment text.
  - Return `{ verified: true }` if the normalized quote is a substring of the normalized segment text, else `{ verified: false }`.
  - **Must NOT throw** on mismatch (RN-012).
  - Reject quotes longer than 200 chars by returning `{ verified: false }` (cheaper than letting bad data flow through to citation_quote which has a CHECK constraint on length ≤ 200 in the DB per T0 item 2).
- Export `assembleRequisitos(payload: RequisitoExtractionPayload, segments: Segment[]): Requisito[]`:
  - For each requisito in the payload, look up `segment = segments.find(s => s.id === requisito.citation_segment_id)`. If not found, mark `citation_verified: false` and use the original quote anyway (the orchestrator may filter unverified citations).
  - If found, run `verifyCitation`; set `citation_verified` accordingly.
  - Return a `Requisito[]` ready for the orchestrator to persist.

### Design Rationale (Single Responsibility)

Validation and citation verification are both **pure transforms over LLM output** — no SDK involvement, no logger calls, no state. They share enough conceptual surface (both reduce raw output to validated domain shapes) to live in one file but are exported as separate functions so T4 can compose them and tests can unit-test each in isolation. Keeping these out of `extractor.ts` keeps that file focused on orchestration (parallelism, cost reduction, retry, abort).

## Dependencies

Requires **T1** — pulls `ExtractorSchemaValidationError` from `lib/extraction/types.ts`.
Requires **T0** — `RequisitoExtractionPayloadSchema` and `RequisitoExtractionPayload` from `@/types`.

Independent of T2 (can be implemented in parallel).

## Done When

- [ ] `lib/extraction/anthropic/validation.ts` exists with the three exports above.
- [ ] All exports are pure functions (no SDK calls, no logger calls, no I/O).
- [ ] Grep for `@anthropic-ai/sdk` in this file returns zero matches.
- [ ] Unit tests cover:
  - Valid JSON parses successfully.
  - Markdown-fenced JSON parses successfully (the model sometimes wraps responses).
  - Malformed JSON throws `ExtractorSchemaValidationError` with parse error in `validationErrors`.
  - Schema-invalid JSON throws `ExtractorSchemaValidationError` with Zod issues in `validationErrors`.
  - Verbatim NFD-normalized substring match → `verified: true`.
  - Paraphrased / non-substring quote → `verified: false`, no throw.
  - Quote >200 chars → `verified: false`, no throw.
  - Cited segment not in `segments` array → requisito returned with `citation_verified: false`.
- [ ] `npm run typecheck` passes.
