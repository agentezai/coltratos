# T1: Types and Error Hierarchy

## Scope

- `lib/ingestion/errors.ts` - new file: `PdfIngestionError` base + 4 typed subclasses
- `src/types/segment.ts` - new file: `Segment` type alias derived from the (post-T0) `Segmento` Zod schema
- `src/types/index.ts` - barrel: re-export `Segment` (and any new heading-related re-exports if needed)
- `.nybo/foundation/adrs/ADR-004-pdf-parse.md` - new ADR documenting pdf-parse choice
- `.nybo/foundation/adrs/ADR-005-pure-function-ingestion.md` - new ADR documenting the purity contract
- `.nybo/foundation/adrs/ADR-006-heuristic-segmentation.md` - new ADR documenting regex-over-LLM choice
- `.nybo/foundation/adrs/ADR-007-corpus-growth.md` - new ADR documenting validation corpus size and quality gates over time

## Changes

### Error Hierarchy

- `PdfIngestionError extends Error` with `readonly code: 'NO_TEXT_LAYER' | 'ENCRYPTED' | 'EMPTY' | 'MALFORMED'` and a `cause?: unknown` property.
- Subclasses set `code` in their constructor and carry the original error (when wrapping pdf-parse) via `cause`.
- All subclasses set `name = this.constructor.name` so stack traces are readable.
- Export both the base class and each subclass from `errors.ts`.

### Segment Type

- `Segment` is `Omit<SegmentoInsert, 'id' | 'pliego_id' | 'created_at' | 'page_range_start' | 'page_range_end'> & { pageRange: [number, number] }`, where `SegmentoInsert` is the Zod-inferred insert type from the post-T0 `domain-model` (rev 3 — `pliego_id` FK, not `documento_id`).
- `SegmentoInsert` already contains `heading_normalized: string | null`, `heading_original: string | null`, `is_synthetic: boolean` after T0; map these to `headingNormalized`, `headingOriginal`, `isSynthetic` at the persistence boundary (in the future orchestration spec). The TS shape exposed by this feature uses camelCase: `headingNormalized`, `headingOriginal`, `isSynthetic`.
- Export `Segment` and re-export `SegmentoCategoria` from `src/types/index.ts` so consumers import from a single barrel.

### ADRs

- **ADR-004** — pdf-parse chosen for Node-native, zero-config text extraction; alternatives (pdfjs-dist, pdf2json) considered but deferred.
- **ADR-005** — ingestion is a pure function; orchestration owns persistence, dedup, observability — keeps the parser deterministic and cacheable.
- **ADR-006** — regex heuristics over LLM segmentation — bounds Claude cost, keeps determinism, falls back to synthetic `general` rather than escalating.
- **ADR-007** — Validation corpus size and quality gates over time. v1 launch: N=5, ≥80% match. First paying user: N≥20, ≥85% match, ≥4 entity types. Pricing >$50/empresa/month: N≥50, ≥90% match, ≥6 entity types. Corpus stored under `tests/fixtures/pliegos/` with `corpus.yaml` manifest. Manual labeling required per addition (deliberate friction). The v1 ship gate is unchanged by this ADR — it adds product-level gates only.

### Design Rationale (Single Responsibility)

T1 owns nothing but type declarations and error class definitions — no runtime logic. This isolates the foundation so T2/T3 can be built and tested independently against stable contracts. Splitting `errors.ts` and `segment.ts` follows SRP at the file level.

## Dependencies

Requires **T0** (domain-model edits, revs 2 + 3) — `general` enum value, `page_range_*` columns, dual heading columns, `is_synthetic` column, three CHECK constraints, the `Documento` → `Pliego` rename (incl. `pliego_id` FK on segmento), and the narrow `pliego_tipo` enum must all exist before this task can author `Segment`. AnexoProceso must also be schema-defined (it does not block ingestion functionality but T0 is a unit).

## Done When

- [ ] `lib/ingestion/errors.ts` exists with `PdfIngestionError` base + 4 subclasses; each has a unique `code`.
- [ ] `instanceof PdfIngestionError` returns true for all four subclasses (verified by a unit test).
- [ ] `Segment` is exported from `src/types/index.ts` with the documented shape (incl. `headingNormalized`, `headingOriginal`, `isSynthetic`, `pageRange`).
- [ ] `npm run typecheck` passes in strict mode.
- [ ] All four ADR files (004, 005, 006, 007) exist under `.nybo/foundation/adrs/` with status `accepted`.
- [ ] No file in this task exceeds 200 lines.
