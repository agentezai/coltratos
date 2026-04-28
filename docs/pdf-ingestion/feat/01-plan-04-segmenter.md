# T4: Segment Assembler

## Scope

- `lib/ingestion/segment.ts` - new file: `buildSegments(pages): Segment[]` plus internal helpers
- `lib/ingestion/__tests__/segment.test.ts` - new file: unit tests for ordering, page-range tracking, dual heading capture, `isSynthetic` correlation, fallback behavior

## Changes

### Public function

- `buildSegments(pages: { page: number; text: string }[]): Segment[]`.
- Walks pages in order. For each line in each page:
  1. Apply the header-shape gate (≤80 chars, non-empty trimmed line).
  2. If shape-eligible, run `matchSection(line)` (T3).
  3. If categoría returned: **close** any open segment (set `pageRange[1]` to current page); **open** a new segment with:
     - `categoria` from T3
     - `isSynthetic: false`
     - `headingOriginal`: trimmed source line (case + accents preserved)
     - `headingNormalized`: `normalizeForMatch(line)` (the same formula T3 used to match — guarantees consistency)
     - `pageRange[0] = currentPage`
  4. If `null` or shape-ineligible, append the line to the open segment's `contenido`.

### Synthetic segment emission (REQ-014, RN-011)

A **synthetic** segment is opened in two cases:
- **Front-matter:** content appears before any header is matched. The segmenter opens an implicit synthetic segment at `orden: 0` with `categoria: 'general'`, `isSynthetic: true`, both heading fields `null`, `pageRange[0] = 1`.
- **No headers in document:** if the entire document yields zero header matches, return a single synthetic segment spanning all pages: `categoria: 'general'`, `isSynthetic: true`, both heading fields `null`, `pageRange: [1, lastPage]`.

The two database CHECK constraints from T0 are mirrored as a runtime invariant in this file: every emitted segment is asserted to satisfy `(isSynthetic === true && headingNormalized === null && headingOriginal === null) || (isSynthetic === false && headingNormalized !== null && headingOriginal !== null)`. A failed assertion is a programmer error and throws `MalformedPdfError` (cause = the offending segment) — we'd rather fail closed than emit invariant-violating data downstream.

### Header-shape gate

`matchSection` only fires on lines that look header-like:
- `line.trim().length <= 80` (heuristic to avoid matching mid-paragraph occurrences).
- Trimmed line is non-empty.

This logic lives in `segment.ts` because it's an assembly-time decision. Revising the 80-char threshold requires a spec edit.

### Output invariants (enforced by tests)

- `result[i].orden === i` for all `i`.
- `result[i].pageRange[0] <= result[i].pageRange[1]`.
- `result[i].pageRange[1] <= result[i+1].pageRange[0]` — non-overlapping, monotonically advancing.
- `result.every(s => s.contenido.length > 0)` — empty segments are not emitted.
- `result.length >= 1` — never empty (no-text PDFs are caught upstream by T2).
- For every segment: `(isSynthetic === true) === (headingNormalized === null) === (headingOriginal === null)` (RN-011 triple-equivalence).

### Determinism

No randomness, no `Date.now()`, no environment lookups. Same `pages` input always produces deeply-equal output (RN-007).

### Design Rationale (Single Responsibility)

T4 is the only place that knows about *assembly* — page ordering, section boundaries, content concatenation, fallback policy, and the synthetic/heading correlation. T2 produces page text; T3 maps a line to a categoría. T4 stitches these into segments. Three-way split keeps each piece small.

## Dependencies

Requires T2 (`PageText` shape) and T3 (`matchSection`, `normalizeForMatch`).

## Done When

- [ ] `buildSegments` exported from `lib/ingestion/segment.ts`.
- [ ] All six output invariants above are covered by unit tests.
- [ ] A 3-page synthetic input where page 1 is front-matter, page 2 starts "CAPACIDAD JURÍDICA", page 3 starts "CAPACIDAD FINANCIERA" produces exactly 3 segments with `orden [0,1,2]`, categorías `[general, juridico, financiero]`, `isSynthetic [true, false, false]`, `headingOriginal [null, 'CAPACIDAD JURÍDICA', 'CAPACIDAD FINANCIERA']`, `headingNormalized [null, 'capacidad juridica', 'capacidad financiera']`.
- [ ] A no-header input produces exactly one synthetic segment (`isSynthetic: true`, both heading fields `null`) spanning all pages.
- [ ] No imports from `@supabase/*`, `node:fs`, `node:net`, `node:http`, or any logger.
- [ ] File stays under 350 lines.
