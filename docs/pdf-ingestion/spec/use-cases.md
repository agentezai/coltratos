# pdf-ingestion — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Orchestrator | Server-side caller (future `upload-flow` spec) that owns persistence, dedup via `pliego.file_hash`, observability, and entity-typed routing (Pliego only in v1; AnexoProceso uploads are stored but not parsed). |
| pdf-ingestion | The pure function under spec. Stateless, deterministic, side-effect-free. |
| Test runner | CI process executing the corpus acceptance test and the vitest benchmark. |

---

## User Stories

### US-01 — Predictable, cacheable segmentation

**As an** Orchestrator
**I want** a pure async function that converts a PDF buffer into ordered, categorized `Segment[]`
**So that** I can persist segments once per `Pliego` and reuse them across every empresa that analyzes the same proceso

### US-02 — Typed, recoverable failure modes

**As an** Orchestrator
**I want** unparseable PDFs to throw discriminated typed errors (encrypted / no-text-layer / empty / malformed)
**So that** I can surface user-actionable messages and skip irrecoverable inputs without wrapping every call in `try/catch` for unknown error shapes

### US-03 — Resilient parsing of non-standard pliegos

**As an** Orchestrator
**I want** pliegos with unconventional headers to still produce a usable `Segment[]` (with `general`-categorized fallback content)
**So that** the extraction stage gets *something* to work with rather than failing the whole pipeline

### US-04 — Verifiable correctness on real pliegos

**As a** Maintainer
**I want** CI to validate segmentation against a labeled corpus of real pliegos
**So that** algorithm changes can't silently regress category accuracy below 80%

---

## Use Case Scenarios

### UC-01 — Parse a clean SECOP-II pliego (US-01)

**Preconditions:** A `Buffer` containing a valid SECOP-II Pliego PDF (`pliego_condiciones` or `pliego_definitivo`) with extractable text and standard section headers ("CAPACIDAD JURÍDICA", "CAPACIDAD FINANCIERA", "CAPACIDAD TÉCNICA", "EXPERIENCIA"). The orchestrator has already determined this is a Pliego (not an AnexoProceso) and routed accordingly.

#### Main Scenario

1. Orchestrator computes the file hash, confirms no `pliego` row exists with that `file_hash`, and resolves to invoke `parsePliegoPdf`.
2. Orchestrator calls `await parsePliegoPdf(buffer)`.
3. pdf-ingestion extracts per-page text via `pdf-parse`.
4. pdf-ingestion identifies header lines (case- and accent-insensitive), splits content per header, and assigns categorías.
5. pdf-ingestion returns `Segment[]` ordered by `orden` `[0, 1, ..., n-1]`. Each detected-header segment carries `isSynthetic: false`, `headingOriginal` (raw line, trimmed), and `headingNormalized` (NFD-normalized + diacritic-stripped + lowercased per REQ-005).
6. Orchestrator persists each `Segment` as a `segmento` row keyed by `pliego_id`. Synthetic segments (front-matter, no-header fallback) persist with `is_synthetic = true` and NULL heading columns; the database CHECK constraints (see spec.md § Architecture Dependencies) enforce the synthetic ⇔ null-heading invariant.

#### Alternative Scenarios

**4a. Header line ambiguous (matches multiple families)**
The first matching family wins, in declared regex order. Document this priority in the categorizer source so it's not surprising.

**5a. Pliego has front-matter before the first header**
Front-matter (cover page, table of contents) is emitted as a leading `general` segment so no content is dropped.

#### Error Scenarios

**3e. Buffer cannot be decoded by `pdf-parse`**
See UC-02.

**Postconditions:** Orchestrator holds a `Segment[]` whose `pageRange` values are 1-indexed and inclusive, ready for persistence and downstream extraction.

---

### UC-02 — Reject unparseable PDFs with typed errors (US-02)

**Preconditions:** A `Buffer` is passed that is one of: encrypted, scan-only (no text layer), zero-page, or non-PDF bytes.

#### Main Scenario

1. Orchestrator calls `await parsePliegoPdf(buffer)`.
2. pdf-ingestion attempts text extraction.
3. The function rejects with one of:
   - `EncryptedPdfError` (`code: 'ENCRYPTED'`) — the PDF requires a password.
   - `NoTextLayerError` (`code: 'NO_TEXT_LAYER'`) — total extracted text is below `MIN_TEXT_THRESHOLD` (200 chars).
   - `EmptyPdfError` (`code: 'EMPTY'`) — pdf-parse reports zero pages or empty document.
   - `MalformedPdfError` (`code: 'MALFORMED'`) — buffer isn't a valid PDF.
4. Orchestrator catches `PdfIngestionError`, switches on `error.code`, and surfaces a localized user-actionable message.

#### Alternative Scenarios

**3a. PDF has a partial text layer (some pages OCR-able, others image-only)**
If the **total** extracted text exceeds `MIN_TEXT_THRESHOLD`, parsing proceeds. Image-only pages contribute zero text and may end up inside a `general` segment.

#### Error Scenarios

**3e. `pdf-parse` throws an unexpected error not in the discriminated set**
pdf-ingestion wraps it in `MalformedPdfError` with the original `pdf-parse` error attached as `cause`. The function never leaks raw pdf-parse exceptions.

**Postconditions:** No partial state is exposed. The orchestrator sees a typed, discriminable error.

---

### UC-03 — Fall back to `general` when headers are non-standard (US-03)

**Preconditions:** A pliego whose section headers do not match any of the known regex families (e.g., legacy template, departmental variant).

#### Main Scenario

1. Orchestrator calls `parsePliegoPdf(buffer)`.
2. pdf-ingestion extracts text but matches zero header lines to known families.
3. pdf-ingestion emits one or more **synthetic** segments with `categoria: 'general'`, `isSynthetic: true`, `headingNormalized: null`, `headingOriginal: null`, splitting on document-structure cues (e.g., page boundaries, double newlines) so segments stay reasonably bounded.
4. Function resolves with `Segment[]` (non-empty, all `general` + synthetic).
5. Orchestrator persists with `is_synthetic = true`. Per RN-012, the downstream [`requisitos-extraction`](../../requisitos-extraction/spec/spec.md) consumer **excludes** these segments from requisito extraction (synthetic AND general are both excluded; the all-general output is therefore not extracted at all and the orchestrator should surface a warning to the user).

#### Alternative Scenarios

**2a. One header family matches but others don't**
Matched sections get their categoría; unmatched content between them is `general`.

#### Error Scenarios

None unique to this use case — falls under UC-02 if the PDF is unparseable.

**Postconditions:** No silent content drop. Caller can detect "all-general" outputs by inspecting categorías if it wants to flag low-confidence ingests.

---

### UC-04 — Validate against a labeled corpus (US-04)

**Preconditions:** 5 real Colombian pliego PDFs in `tests/fixtures/pliegos/` and matching golden `Segment[]` JSON in `tests/golden/segments/`.

#### Main Scenario

1. CI runs `npm run test` (or the targeted acceptance test command).
2. The acceptance test iterates each fixture, calls `parsePliegoPdf`, and compares output against the golden file.
3. For every golden segment, the test finds the produced segment whose `pageRange` overlaps and checks `categoria` equality.
4. Aggregate match rate across the 5 pliegos is computed.
5. The test asserts match rate ≥0.80 and fails CI otherwise.
6. The vitest benchmark runs each fixture ≥10 times and asserts p95 <3s.

#### Alternative Scenarios

**2a. Golden file outdated due to algorithm improvement**
Maintainer regenerates the golden file via a documented `npm run fixtures:regen` script (out of scope for this spec — added when the first regression occurs). Regen requires a human-reviewed diff before commit.

#### Error Scenarios

**5e. Match rate drops below 0.80 after a code change**
CI fails. Maintainer either fixes the algorithm or, if the corpus is wrong, follows `/nybo-plan edit pdf-ingestion` to revise the threshold (which requires human approval).

**Postconditions:** Algorithm quality is gated by CI; regressions cannot land silently.

---

## UX/UI References

No UI in this feature. See [spec.md § UX/UI](./spec.md#uxui).
