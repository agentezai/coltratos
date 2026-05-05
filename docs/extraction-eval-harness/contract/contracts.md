# TDD Contract: extraction-eval-harness

Framework: **vitest**
Test runner: `npm run test`
Location prefix: `eval/__tests__/`

---

## Task T1: Corpus + Ground-Truth Schema

### Behavior: GroundTruthRequisitoSchema validates clean input (REQ-001)

**Given** `{ tipo: 'juridico', texto_canonical: 'Estar inscrito en el RUP', pagina_fuente: 12, quote_fuente_minima: 'inscrito en el RUP', is_habilitante: true }`
**When** parsed with `GroundTruthRequisitoSchema.parse(...)`
**Then** returns typed object with no errors

**Test file:** `eval/__tests__/types.test.ts`
**Framework:** vitest

---

### Behavior: GroundTruthRequisitoSchema rejects tipo 'general' (REQ-001, TC-002)

**Given** the same object with `tipo: 'general'`
**When** `GroundTruthRequisitoSchema.safeParse(...)` is called
**Then** `success === false` and `error.issues[0].path` includes `'tipo'`

**Test file:** `eval/__tests__/types.test.ts`

---

### Behavior: GroundTruthRequisitoSchema rejects quote > 200 chars (REQ-001)

**Given** an object with `quote_fuente_minima` of 201 characters
**When** `GroundTruthRequisitoSchema.safeParse(...)`
**Then** `success === false`, issue on `quote_fuente_minima`

**Test file:** `eval/__tests__/types.test.ts`

---

## Task T2: Runner

### Behavior: runner skips existing result without --force (REQ-006, TC-006)

**Given** `eval-results/<hash>/<id>/predicted.json` exists (seeded in temp dir)
**When** runner `checkShouldSkip(gitHash, pliegoId, false)` is called
**Then** returns `{ skip: true }` without reading or writing any file

**Test file:** `eval/__tests__/runner.test.ts`

---

### Behavior: SHA256 mismatch throws CorpusIntegrityError (RN-002, TC-012)

**Given** a buffer whose SHA256 does not match `entry.sha256`
**When** `verifyIntegrity(buffer, entry)` is called
**Then** throws `CorpusIntegrityError` with `code === 'CORPUS_INTEGRITY_FAILURE'` and `pliego_id` set

**Test file:** `eval/__tests__/runner.test.ts`

---

## Task T3: Scorer

### Behavior: computeMetrics returns correct recall/precision/hallucination (REQ-008, TC-007)

**Given** 4 ground-truth entries and 4 predicted entries where 3 are correctly matched and 1 predicted has no match
**When** `computeMetrics(groundTruth, predicted, matchMap)` is called (matchMap covers 3 pairs)
**Then** `recall === 0.75`, `precision === 0.75`, `hallucination_rate === 0.25`, `f1 ≈ 0.75`

**Test file:** `eval/__tests__/scorer.test.ts`

---

### Behavior: per-tipo recall computed independently (REQ-008, TC-008)

**Given** 2 `juridico` + 2 `tecnico` ground truth; predicted matches both juridico, misses both tecnico
**When** `computeMetrics(...)` called
**Then** `result.recall_juridico === 1.0`, `result.recall_tecnico === 0.0`, `result.recall_aggregate === 0.5`

**Test file:** `eval/__tests__/scorer.test.ts`

---

### Behavior: cosine returns 1.0 for identical vectors (REQ-007)

**Given** `a = [1, 0, 0]`, `b = [1, 0, 0]`
**When** `cosine(a, b)`
**Then** returns `1.0` (within floating-point tolerance)

**Given** `a = [1, 0]`, `b = [0, 1]`
**When** `cosine(a, b)`
**Then** returns `0.0`

**Test file:** `eval/__tests__/embeddings.test.ts`

---

### Behavior: embedBatch respects BATCH_SIZE (REQ-007, NFR-01)

**Given** 150 texts and a mock OpenAI client that records call count
**When** `embedBatch(texts, mockClient)` is called
**Then** `mockClient.embeddings.create` was called exactly 2 times (batches of 100 + 50)

**Test file:** `eval/__tests__/embeddings.test.ts`

---

### Behavior: calibration uses large model when small model fails (REQ-007, RN-012)

**Given** a mock scorer where `text-embedding-3-small` produces calibration agreement = 0.70 and `text-embedding-3-large` produces 0.85
**When** `runCalibration(dualLabeledPliegos, mockEmbedder)` is called
**Then** returns `{ model: 'text-embedding-3-large', agreement: 0.85 }` and logs `scorer_calibration_warning`

**Test file:** `eval/__tests__/scorer.test.ts`

---

### Behavior: calibration failure aborts eval (REQ-007, NFR-10)

**Given** both models produce calibration agreement < 0.80
**When** `runCalibration(...)` is called
**Then** throws `ScorerCalibrationFailedError` with `model_small_agreement` and `model_large_agreement` in the error payload

**Test file:** `eval/__tests__/scorer.test.ts`

---

### Behavior: hallucination_rate is null for non-exhaustive pliegos (REQ-008, RN-013)

**Given** a `PliEgoResult` computation where `corpus_entry.ground_truth_exhaustive === false`
**When** metrics are assembled
**Then** `pliego_result.hallucination_rate === null` and `pliego_result.hallucinated === []`

**Test file:** `eval/__tests__/scorer.test.ts`

---

## Task T4: Report Generator

### Behavior: report.md includes all required sections (REQ-009)

**Given** a valid `EvalRunResult` with 3 pliego results
**When** `generateReport(result, outDir)` is called
**Then** output `report.md` contains: "## Aggregate Metrics", "## Per-Tipo Recall", "## Per-Pliego Summary", "## Missed Requisitos", "## Hallucinated Requisitos"

**Test file:** `eval/__tests__/report.test.ts`

---

### Behavior: index.md grows by exactly one row per run (REQ-010, TC-009)

**Given** `index.md` with 2 existing rows and a new `EvalRunResult`
**When** `appendIndex(result, indexPath)` is called
**Then** `index.md` has 3 rows (header + 2 existing + 1 new); same git hash called twice produces 3 rows, not 4

**Test file:** `eval/__tests__/report.test.ts`

---

## Task T5: Inter-Labeler Agreement

### Behavior: import-csv rejects invalid tipo (REQ-013, TC-011)

**Given** a CSV with one row having `tipo = 'general'`
**When** `importCsv(csvContent)` is called
**Then** throws `CsvValidationError` listing the row number and field name

**Test file:** `eval/__tests__/import-csv.test.ts`

---

### Behavior: import-csv accepts si/no as is_habilitante (REQ-013)

**Given** a CSV row with `is_habilitante = 'si'`
**When** `importCsv(csvContent)` is called
**Then** output JSON has `is_habilitante: true`

**Test file:** `eval/__tests__/import-csv.test.ts`

---

### Behavior: Cohen's kappa = 1.0 for perfect agreement (REQ-011, TC-010)

**Given** primary and secondary annotations where every pair has identical `is_habilitante` and `tipo`
**When** `computeKappa(pairs, 'is_habilitante')` is called
**Then** returns `1.0`

**Given** pairs where agreement is at chance level
**When** `computeKappa(pairs, 'is_habilitante')`
**Then** returns approximately `0.0`

**Test file:** `eval/__tests__/agreement.test.ts`

---

### Behavior: kappa below floor fails CI (REQ-011, RN-014, NFR-06)

**Given** `kappa_habilitante = 0.55` (below 0.60 floor)
**When** `enforceKappaGate({ kappa_habilitante: 0.55, kappa_tipo: 0.80 })` is called
**Then** throws (or returns exit code 1) with message containing `KAPPA_BELOW_FLOOR`

**Given** `kappa_habilitante = 0.65` (warn tier)
**When** `enforceKappaGate({ kappa_habilitante: 0.65, kappa_tipo: 0.80 })`
**Then** returns exit code 0 and logs a warning

**Test file:** `eval/__tests__/agreement.test.ts`

---

## Task T6: CI Integration

### Behavior: gate check exits non-zero on failed result (REQ-012)

**Given** `results.json` with `gate_passed: false`
**When** the gate check node snippet runs
**Then** exits with code 1

**Test file:** `eval/__tests__/ci-gate.test.ts` (or manual verification via `act`)

---

### Behavior: package.json scripts are present (REQ-015)

**Given** the root `package.json`
**When** parsed as JSON
**Then** contains keys: `eval`, `eval:score`, `eval:report`, `eval:agreement`, `eval:import-csv`

**Test file:** `eval/__tests__/package-scripts.test.ts`
