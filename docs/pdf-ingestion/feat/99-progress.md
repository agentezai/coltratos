# Progress Tracker

**Status:** Not Started

**Current Task:** None — awaiting T0 (domain-model edit) and spec approval.

---

## Task Checklist

### T0 (PREREQUISITE — blocks T1): domain-model edits (revs 2 + 3)
- [ ] Confirm domain-model rev 2 is applied — `general` enum value, `page_range_*`, heading columns (nullable), `is_synthetic`, 3 CHECK constraints, Zod `.refine()` validators
- [ ] Confirm domain-model rev 3 is applied — `Documento` → `Pliego` rename (table, FKs `pliego_id`/`pliego_ids`); narrow `pliego_tipo` enum (2 values); `AnexoProceso` sibling entity defined; barrel exports `Pliego*` and `AnexoProceso*`; legacy `Documento*` removed
- [ ] Verify domain-model end-to-end: typecheck and migration apply succeed; CHECK constraints reject invalid rows; `pliego_tipo` enum rejects anexo values; AnexoProceso public-read parity verified

### T1: Types and Error Hierarchy
- [ ] Implement Task 1: Author `lib/ingestion/errors.ts` (PdfIngestionError + 4 subclasses), `Segment` type alias in `src/types/` (incl. `headingNormalized`/`headingOriginal`/`isSynthetic`), and ADRs 004/005/006/007
- [ ] Verify Task 1: instanceof checks, structural type assertion, all four ADR files present, typecheck passes

### T2: PDF Text Extractor
- [ ] Implement Task 2: `extractText(buffer)` wrapping pdf-parse with per-page output and typed-error mapping
- [ ] Verify Task 2: happy path + 4 failure-mode unit tests pass; per-page preservation asserted; no forbidden imports

### T3: Heuristic Categorizer
- [ ] Implement Task 3: `matchSection(line)` + `normalizeForMatch(s)` (mandatory NFD formula) with 5-family pattern table; patterns authored against normalized form (no `/.../i` flag)
- [ ] Verify Task 3: table-driven tests for the formula + 15+ accent/case cases pass; grep test confirms no case-insensitive regex flags in source

### T4: Segment Assembler
- [ ] Implement Task 4: `buildSegments(pages)` — page walk, header-shape gate, dual heading capture, `isSynthetic` correlation, fallback policy, RN-011 triple-equivalence as a runtime invariant
- [ ] Verify Task 4: six output invariants tested; property-based fuzz pass; determinism across 100 invocations; `headingNormalized === normalizeForMatch(headingOriginal)` asserted

### T5: Public API Entry Point
- [ ] Implement Task 5: `parsePliegoPdf(buffer)` composition + barrel re-exports + scoped purity scan test (NFR-03 wording: scans `lib/ingestion/**`, excludes `__tests__/` and `*.test.*`, treats `tests/**` as out-of-scope)
- [ ] Verify Task 5: smoke test, empty-buffer guard, determinism, purity scan, purity self-test all pass

### T6: Validation Corpus, Acceptance Test, Benchmark
- [ ] Implement Task 6: 5 real pliegos + `corpus.yaml` manifest (source_entity, modalidad, year, manual_labels, date_added) + golden outputs + acceptance test + vitest bench + corpus README
- [ ] Verify Task 6: match rate ≥ 0.80, p95 < 3000ms, manifest schema valid, RN-011 triple-equivalence holds on every produced segment — all gates green on CI

---

## Completion Summary

_Updated when all tasks are done._
