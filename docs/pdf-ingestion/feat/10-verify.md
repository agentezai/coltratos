# Verification Plan

## T1: Types and Error Hierarchy

### Test Scenarios
- `instanceof PdfIngestionError` is true for `NoTextLayerError`, `EncryptedPdfError`, `EmptyPdfError`, `MalformedPdfError`.
- Each subclass exposes the correct `code` literal.
- `Segment` is structurally `Omit<SegmentoInsert, 'id'|'pliego_id'|'created_at'|'page_range_start'|'page_range_end'> & { pageRange: [number, number] }` with `headingNormalized`, `headingOriginal` (both `string | null`), and `isSynthetic: boolean`.
- ADR files (004, 005, 006, 007) exist with `status: accepted` frontmatter.

### Gate Criteria
`npm run typecheck` passes. Error-hierarchy unit test passes. All four ADR files present.

---

## T2: PDF Text Extractor

### Test Scenarios
- Happy path: 3-page PDF returns 3 entries with non-empty `text` and `page` `[1,2,3]`.
- Encrypted, scan-only (sub-threshold), empty, malformed → correct `PdfIngestionError` subclass with `cause` set.
- Empty pages preserved (text: '').

### Gate Criteria
All five failure modes throw the correct subclass. Per-page preservation asserted. No forbidden imports.

---

## T3: Heuristic Categorizer

### Test Scenarios
- `normalizeForMatch('JURÍDICA') === 'juridica'` (the mandatory formula works as specified).
- Each header family matches three accent/case variants (15 cases minimum).
- Lines that don't match any pattern return `null`.
- Pattern priority test: when a line could match multiple families, first declared family wins.
- Source grep test: no `/...../i` (case-insensitive flag) regex literals appear in `lib/ingestion/categorize.ts` — patterns must operate on normalized text only.

### Gate Criteria
Table-driven tests pass. Priority test passes. Grep test confirms no case-insensitive regex flags.

---

## T4: Segment Assembler

### Test Scenarios
- Front-matter (content before first header) emits a synthetic `general` segment with `orden: 0`, `isSynthetic: true`, both heading fields `null`.
- 3-page synthetic input with one header per page yields 3 ordered segments with correct `pageRange`, categorías, and heading fields populated for header segments (`isSynthetic: false`, both heading fields non-null).
- No-header document yields exactly one synthetic segment spanning all pages.
- Empty header-only line at end-of-document does not emit an empty segment.
- Property-based fuzz (50 randomized inputs): all six output invariants hold, including the RN-011 triple-equivalence (`isSynthetic === true ⇔ headingNormalized === null ⇔ headingOriginal === null`).
- Determinism: identical input produces deeply-equal output across 100 invocations.
- `headingNormalized` for a header segment exactly equals `normalizeForMatch(headingOriginal)` — guarantees the persisted normalized form is the one the categorizer matched against.

### Gate Criteria
All invariants asserted. Property-based fuzz passes. Determinism confirmed. Heading-formula equivalence asserted.

---

## T5: Public API Entry Point

### Test Scenarios
- Smoke test: `parsePliegoPdf` on a fixture buffer resolves to a non-empty `Segment[]`.
- Empty-buffer guard throws `EmptyPdfError` without invoking pdf-parse (verified via spy).
- Determinism on a fixture buffer.
- Barrel re-exports: all 4 error classes importable from `lib/ingestion`.
- **Purity scan (NFR-03):** scans `lib/ingestion/**` excluding `__tests__/` and `*.test.*` within that path; treats `tests/**` as out-of-scope; zero matches for forbidden imports.
- **Purity self-test:** the scan correctly fails when a temporary file with a forbidden import is added (and removes the file afterward).

### Gate Criteria
All tests pass. Purity scan returns zero matches in scope and demonstrates working detection via self-test. `npm run typecheck` passes; no `any` in public surface.

---

## T6: Validation Corpus, Acceptance Test, Benchmark

### Test Scenarios
- **Corpus quality:** aggregate category-match rate across 5 real pliegos ≥ 0.80.
- **Encrypted/scan-only fixtures** throw the correct typed errors.
- **`corpus.yaml` schema** validation: every entry has `source_entity`, `modalidad`, `year`, `manual_labels`, `date_added`; `manual_labels` resolves to an existing JSON file; `date_added` is ISO-8601.
- **Performance:** vitest bench p95 across the corpus < 3000ms.
- **Synthetic/heading invariant on real outputs:** every produced segment satisfies the RN-011 triple-equivalence — asserted as part of the acceptance test, not just unit tests.
- **Determinism at corpus level:** re-running the acceptance test produces identical results.

### Gate Criteria
Both `npm run test` and `npm run test:bench` pass on CI. Match rate, p95, and manifest gates green.

---

## End-to-End Verification

**Final acceptance test:**

1. Confirm T0 (domain-model edit) has shipped — `general` enum value, `page_range_*` columns, dual heading columns, `is_synthetic` column, and both CHECK constraints exist in the database.
2. Run `npm run test` after a clean install — T1–T5 unit tests pass; T6 acceptance test runs against all 5 corpus pliegos.
3. Match rate ≥ 0.80; manifest schema valid; RN-011 triple-equivalence holds on every produced segment.
4. Run `npm run test:bench` — p95 < 3000ms.
5. Manually inspect one produced `Segment[]` and confirm: ordering, page-range correctness, `headingOriginal` matches the source PDF visually, `headingNormalized === normalizeForMatch(headingOriginal)`, `isSynthetic` correlates with heading nullability.
6. `npm run typecheck` — zero errors.
7. Grep `lib/ingestion/` for `supabase`, `node:fs`, `logger` (excluding test files); zero matches.

**Gate Criteria:** All seven steps pass. Match rate ≥ 0.80, p95 < 3000ms, RN-011 triple-equivalence universally holds, zero typecheck errors, zero in-scope purity violations. Spec is shippable.
