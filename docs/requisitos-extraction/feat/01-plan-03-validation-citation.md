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
- Export `verifyCitation(args): { unverified: boolean }` where `args = { quote: string, pagina: number, pages: Page[] }` (REQ-010, RN-018):
  - First check: `pagina` must be in range `[1, pages.length]`. If out of range, return `{ unverified: true }` immediately.
  - Apply **NFKC normalization + whitespace collapse + case-fold** to both `quote` and `pages[pagina - 1].text`:
    ```ts
    function normalizeForCitation(s: string): string {
      return s.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()
    }
    ```
  - Return `{ unverified: false }` if the normalized quote is a substring of the normalized page text, else `{ unverified: true }`.
  - **Must NOT throw** on mismatch (RN-018).
  - Reject quotes longer than 200 chars by returning `{ unverified: true }`.
  - The stored `quote_fuente` is the original (pre-normalization) string — normalization is applied here only for the check.
- Export `assembleRequisitos(payload: RequisitoExtractionPayload, pages: Page[]): Requisito[]`:
  - For each requisito in the payload, call `verifyCitation({ quote: requisito.quote_fuente, pagina: requisito.pagina_fuente, pages })`.
  - Set `citation_unverified: true` on the requisito if `unverified === true`; otherwise `citation_unverified: false`.
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
  - NFKC + whitespace-collapse + case-fold normalization: `'Capacidad   JURÍDICA'` matches `'capacidad juridica'` in page text → `unverified: false`.
  - Unicode variant: composed vs decomposed form normalized by NFKC → `unverified: false`.
  - Paraphrased / non-substring quote → `unverified: true`, no throw.
  - Quote >200 chars → `unverified: true`, no throw.
  - `pagina_fuente` out of range → `unverified: true`, no throw (TC-024).
  - Requisito with in-range `pagina_fuente` and matching quote → `citation_unverified: false` on assembled requisito.
- [ ] `npm run typecheck` passes.
