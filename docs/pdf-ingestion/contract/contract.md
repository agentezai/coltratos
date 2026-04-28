# TDD Contract: pdf-ingestion

This is the Markdown TDD guide for `nybo-run`. The Executor Agent reads each behavior, writes a failing test (Red), implements (Green), then refactors. Framework is **vitest**.

---

## Task T1: Types and Error Hierarchy

### Behavior: PdfIngestionError subclasses are discriminable (REQ-010, RN-006)

**Given** the four error subclasses imported from `lib/ingestion/errors`
**When** an instance of each is created
**Then** each `instanceof PdfIngestionError` returns `true` AND each has a unique `code` literal (`NO_TEXT_LAYER`, `ENCRYPTED`, `EMPTY`, `MALFORMED`)

**Test file:** `lib/ingestion/__tests__/errors.test.ts`
**Framework:** vitest

---

### Behavior: Segment type matches domain-model insert shape with heading and synthetic fields (REQ-012, RN-008, RN-011)

**Given** the `Segment` type re-exported from `@/types`
**When** a value is constructed with `categoria`, `contenido`, `orden`, `pageRange: [number, number]`, `headingNormalized: string | null`, `headingOriginal: string | null`, `isSynthetic: boolean`
**Then** TypeScript accepts it AND the type-test asserts the RN-011 triple-equivalence at the type level (e.g. via discriminated-union narrowing where `isSynthetic: true` forbids non-null heading fields)

**Test file:** `src/types/__tests__/segment.test-d.ts`
**Framework:** vitest (`expectTypeOf`)

---

## Task T2: PDF Text Extractor

### Behavior: Per-page text preserved (REQ-001, RN-003)

**Given** a 3-page PDF buffer where each page has distinct content
**When** `extractText(buffer)` resolves
**Then** the result is an array of length 3 with `page` values `[1, 2, 3]` and corresponding `text`

**Test file:** `lib/ingestion/__tests__/extract-text.test.ts`
**Framework:** vitest

---

### Behavior: Encrypted PDF maps to EncryptedPdfError (REQ-007, RN-006)

**Given** a password-protected PDF buffer
**When** `extractText(buffer)` is awaited
**Then** it rejects with `EncryptedPdfError` whose `code === 'ENCRYPTED'` and `cause` is the original pdf-parse error

**Test file:** `lib/ingestion/__tests__/extract-text.test.ts`
**Framework:** vitest

---

### Behavior: Sub-threshold text → NoTextLayerError (REQ-008, RN-009)

**Given** a PDF whose total extracted text is < `MIN_TEXT_THRESHOLD` (200 chars)
**When** `extractText(buffer)` is awaited
**Then** it rejects with `NoTextLayerError` whose `code === 'NO_TEXT_LAYER'`

**Test file:** `lib/ingestion/__tests__/extract-text.test.ts`
**Framework:** vitest

---

### Behavior: Malformed bytes → MalformedPdfError (REQ-009, REQ-010)

**Given** `Buffer.from('not a pdf')`
**When** `extractText(buffer)` is awaited
**Then** it rejects with `MalformedPdfError` (NOT a raw pdf-parse exception)

**Test file:** `lib/ingestion/__tests__/extract-text.test.ts`
**Framework:** vitest

---

## Task T3: Heuristic Categorizer

### Behavior: Mandatory NFD normalization formula (REQ-005, RN-005)

**Given** the string `'JURÍDICA'`
**When** `normalizeForMatch(s)` is called
**Then** the result is exactly `'juridica'` (NFD-decomposed, combining marks stripped, lowercased)

**Test file:** `lib/ingestion/__tests__/categorize.test.ts`
**Framework:** vitest

---

### Behavior: Each header family matches all accent/case variants (REQ-006, RN-005)

**Given** the strings `"CAPACIDAD FINANCIERA"`, `"capacidad financiera"`, `"Capacidad Financiera"`
**When** `matchSection(line)` is called for each
**Then** all three return `'financiero'`. Same parametric assertion holds for `juridico`/`tecnico`/`experiencia`/`requisitos habilitantes` patterns

**Test file:** `lib/ingestion/__tests__/categorize.test.ts`
**Framework:** vitest (table-driven)

---

### Behavior: Body content returns null (REQ-004)

**Given** a body sentence like `"El proponente debe acreditar su experiencia mediante certificaciones."`
**When** `matchSection` is called
**Then** the result is `null` — the segmenter (T4) is the only place that emits a `general` segment, and it does so paired with `isSynthetic: true`

**Test file:** `lib/ingestion/__tests__/categorize.test.ts`
**Framework:** vitest

---

### Behavior: No case-insensitive regex flags in source (REQ-005)

**Given** the source of `lib/ingestion/categorize.ts`
**When** the file is read and scanned for regex literals
**Then** zero matches are found for the `/i` flag — patterns must operate on the normalized form, not on raw input

**Test file:** `lib/ingestion/__tests__/categorize.test.ts`
**Framework:** vitest

---

## Task T4: Segment Assembler

### Behavior: Three headers on three pages produces three ordered segments with correct heading capture (REQ-003, REQ-013, RN-002, RN-003, RN-011)

**Given** synthetic page data where page 1 = `"   CAPACIDAD JURÍDICA   \n..."`, page 2 = `"CAPACIDAD FINANCIERA\n..."`, page 3 = `"CAPACIDAD TÉCNICA\n..."`
**When** `buildSegments(pages)` is called
**Then** the result has length 3 with:
- categorías `['juridico', 'financiero', 'tecnico']`
- `orden: [0, 1, 2]`
- `pageRange: [[1,1],[2,2],[3,3]]`
- `isSynthetic: [false, false, false]`
- `headingOriginal: ['CAPACIDAD JURÍDICA', 'CAPACIDAD FINANCIERA', 'CAPACIDAD TÉCNICA']` (whitespace-trimmed, otherwise verbatim)
- `headingNormalized: ['capacidad juridica', 'capacidad financiera', 'capacidad tecnica']`
- For every segment, `headingNormalized === normalizeForMatch(headingOriginal)`

**Test file:** `lib/ingestion/__tests__/segment.test.ts`
**Framework:** vitest

---

### Behavior: Front-matter emits a synthetic 'general' segment (REQ-014, RN-011, UC-01 § 5a)

**Given** synthetic pages where page 1 contains body text only and page 2 starts `"CAPACIDAD JURÍDICA"`
**When** `buildSegments(pages)` is called
**Then** `result[0]` has `categoria: 'general'`, `isSynthetic: true`, `headingNormalized: null`, `headingOriginal: null`, `pageRange[0] === 1`. `result[1]` has `categoria: 'juridico'`, `isSynthetic: false`, both heading fields non-null

**Test file:** `lib/ingestion/__tests__/segment.test.ts`
**Framework:** vitest

---

### Behavior: No headers → single synthetic 'general' segment spanning all pages (REQ-004, REQ-014, RN-011, UC-03)

**Given** synthetic pages with no recognizable headers across 5 pages
**When** `buildSegments(pages)` is called
**Then** the result has length 1 with `categoria: 'general'`, `isSynthetic: true`, `headingNormalized: null`, `headingOriginal: null`, `orden: 0`, `pageRange: [1, 5]`

**Test file:** `lib/ingestion/__tests__/segment.test.ts`
**Framework:** vitest

---

### Behavior: RN-011 triple-equivalence holds on every emitted segment (RN-011)

**Given** 50 randomized page arrays generated by a seeded fuzzer
**When** `buildSegments(pages)` is called for each
**Then** for every segment in every output: `(isSynthetic === true) === (headingNormalized === null) === (headingOriginal === null)`

**Test file:** `lib/ingestion/__tests__/segment.test.ts`
**Framework:** vitest

---

### Behavior: Output ordering and pageRange invariants (REQ-003, RN-002)

**Given** the same fuzz inputs
**When** `buildSegments(pages)` is called
**Then** for every output: `orden[i] === i`, `pageRange[i][0] <= pageRange[i][1]`, `pageRange[i][1] <= pageRange[i+1][0]`, `contenido` non-empty

**Test file:** `lib/ingestion/__tests__/segment.test.ts`
**Framework:** vitest

---

## Task T5: Public API Entry Point

### Behavior: Empty buffer short-circuits without invoking pdf-parse (REQ-009)

**Given** `Buffer.alloc(0)` and a vitest spy on the pdf-parse module
**When** `parsePliegoPdf(buffer)` is awaited
**Then** it rejects with `EmptyPdfError` AND the pdf-parse spy was never called

**Test file:** `lib/ingestion/__tests__/index.test.ts`
**Framework:** vitest

---

### Behavior: Determinism across two invocations (REQ-011, RN-007)

**Given** a fixture buffer
**When** `parsePliegoPdf(buffer)` is invoked twice
**Then** `expect(a).toEqual(b)` passes

**Test file:** `lib/ingestion/__tests__/index.test.ts`
**Framework:** vitest

---

### Behavior: Scoped purity scan (NFR-03, RN-001)

**Given** the file tree under `lib/ingestion/`, with the scan rule: include `lib/ingestion/**`, exclude any path under a `__tests__/` directory within `lib/ingestion/`, exclude any file matching `*.test.*` within `lib/ingestion/`, and treat `tests/**` as out-of-scope
**When** the test scans for forbidden imports — `@supabase/*`, `@anthropic-ai/sdk`, `node:fs`, `node:fs/promises`, `node:net`, `node:http`, `node:https`, enumerated logger modules (`pino`, `winston`, `bunyan`, `@logtape/`, plus an "in-house logger module" placeholder list maintained in the test file), or `process.env.[A-Z_]+` direct reads
**Then** zero matches in scope

**Test file:** `lib/ingestion/__tests__/purity.test.ts`
**Framework:** vitest

---

### Behavior: Purity scan self-test (NFR-03)

**Given** a temporary file `lib/ingestion/__purity_self_test__.ts` containing `import 'node:fs'`
**When** the purity scan runs
**Then** the scan reports a violation. After cleanup (file removed), a re-run reports zero violations

**Test file:** `lib/ingestion/__tests__/purity.test.ts`
**Framework:** vitest (with afterEach cleanup)

---

## Task T6: Validation Corpus, Acceptance Test, Benchmark

### Behavior: Corpus category-match rate ≥ 0.80 (REQ-016, RN-010, NFR-02)

**Given** 5 real pliegos in `tests/fixtures/pliegos/` and matching golden `Segment[]` JSON in `tests/golden/segments/`, resolved via `corpus.yaml`
**When** the acceptance test parses each pliego and computes match rate
**Then** aggregate match rate ≥ 0.80

**Test file:** `tests/acceptance/pdf-ingestion.test.ts`
**Framework:** vitest

---

### Behavior: `corpus.yaml` manifest schema (REQ-015)

**Given** `tests/fixtures/pliegos/corpus.yaml`
**When** the acceptance test loads and validates it
**Then** every entry has `source_entity`, `modalidad`, `year`, `manual_labels`, `date_added`; `manual_labels` resolves to an existing JSON file under `tests/golden/segments/`; `date_added` parses as ISO-8601

**Test file:** `tests/acceptance/pdf-ingestion.test.ts`
**Framework:** vitest

---

### Behavior: Encrypted and scan-only fixtures throw the right errors (REQ-007, REQ-008)

**Given** `tests/fixtures/pliegos/encrypted.pdf` and `tests/fixtures/pliegos/scan-only.pdf`
**When** each is passed to `parsePliegoPdf`
**Then** the encrypted one rejects with `EncryptedPdfError` and the scan-only one rejects with `NoTextLayerError`

**Test file:** `tests/acceptance/pdf-ingestion.test.ts`
**Framework:** vitest

---

### Behavior: RN-011 invariant holds on real-world outputs (RN-011)

**Given** the 5-pliego corpus
**When** parsed
**Then** every produced segment satisfies `(isSynthetic === true) === (headingNormalized === null) === (headingOriginal === null)` — asserted at the corpus level, not just unit level

**Test file:** `tests/acceptance/pdf-ingestion.test.ts`
**Framework:** vitest

---

### Behavior: Performance gate p95 < 3000ms (REQ-017, NFR-01, RN-010)

**Given** the 5-pliego corpus
**When** the vitest benchmark runs each pliego ≥10 times and aggregates durations
**Then** the global p95 across all measurements is < 3000ms

**Test file:** `tests/bench/pdf-ingestion.bench.ts`
**Framework:** vitest bench
