# extraction-eval-harness — Verification Plan

## T1: Corpus + Ground-Truth Schema

**Test Scenarios:**
- Happy: valid 3-entry JSON array passes `GroundTruthFileSchema`
- Error: `tipo: 'general'` rejected by Zod
- Error: `quote_fuente_minima` > 200 chars rejected
- Happy: `corpus.yaml` skeleton parses without error

**Gate Criteria:** `npm run typecheck` passes; Zod schema rejects all invalid tipo values deterministically.

---

## T2: Runner

**Test Scenarios:**
- Happy: `--pliego=stub-001` on a mock corpus + mock extractor writes `predicted.json`
- Error: SHA256 mismatch → `CorpusIntegrityError`, pliego skipped, run continues
- Edge: existing `predicted.json` without `--force` → warning + no overwrite
- Edge: existing `predicted.json` with `--force` → `forced: true` in output
- Error: `ExtractorCostCeilingExceededError` → pliego recorded as `cost_exceeded`, run continues

**Gate Criteria:** `predicted.json` written correctly for valid input; all error paths produce a status record, not a crash.

---

## T3: Scorer

**Test Scenarios:**
- Happy: 4 ground-truth, 3 matched predicted + 1 hallucinated → `recall=0.75, precision=0.75, hallucination_rate=0.25`
- Happy: per-tipo breakdown with uneven distribution produces independent per-tipo values
- Edge: ground-truth has zero entries for `experiencia` → `recall_experiencia = null` + corpus-gap warning
- Happy: `cosine([1,0], [1,0]) === 1.0`; `cosine([1,0], [0,1]) === 0.0`
- Happy: `embedBatch` with 150 texts → exactly 2 API calls (batch size 100)

**Gate Criteria:** Metrics match manual calculation for known inputs; batch size respected; `results.json` is valid JSON after smoke run.

---

## T4: Report Generator

**Test Scenarios:**
- Happy: given valid `results.json`, `report.md` contains all sections (aggregate, per-tipo, per-pliego, missed, hallucinated)
- Edge: `forced: true` in results → "Forced: yes (reason: ...)" in report header
- Edge: `recall_tecnico: null` → "n/a" + corpus-gap note in per-tipo table
- Happy: second invocation with same git hash appends exactly one new row to `index.md` (idempotent on report.md — second write overwrites same file)

**Gate Criteria:** `report.md` generated without throwing; `index.md` grows by exactly one row.

---

## T5: Inter-Labeler Agreement + CSV Import

**Test Scenarios:**
- Happy: 5-row CSV with all valid fields → valid `ground-truth/<id>.json`
- Error: `tipo: 'general'` in CSV → exit non-zero, row number in error
- Happy: `is_habilitante: 'si'` parsed as `true`
- Happy: kappa = 1.0 for perfect agreement (10/10 pairs match on both dimensions)
- Edge: kappa < 0.75 → warning printed

**Gate Criteria:** Invalid CSV exits non-zero with actionable error; kappa formula matches scipy reference for known inputs.

---

## T6: CI Integration

**Test Scenarios:**
- Happy: workflow YAML passes `actionlint` with no errors
- Happy: all 5 `npm run eval:*` scripts exit 0 on smoke run
- Edge: `gate_passed: false` in `results.json` → gate check step exits non-zero
- Happy: PR comment step posts non-empty comment

**Gate Criteria:** Workflow is valid YAML; gate check correctly propagates failure.

---

## End-to-End Verification

1. Create a 1-pliego smoke corpus (use a real short pliego from SECOP II, ~30 pages).
2. Label 5 requisitos manually → `import-csv.ts` → `ground-truth/smoke-001.json`.
3. Run `npm run eval -- --pliego=smoke-001`.
4. Run `npm run eval:score`, `npm run eval:report`.
5. Verify `eval-results/<hash>/report.md` exists with correct aggregate + per-tipo tables.
6. Manually confirm ≥3 of the 5 labeled requisitos appear in "matched" (recall ≥ 0.60 on 5 entries).
7. Open a draft PR touching `lib/extraction/anthropic/config.ts` — verify CI triggers, posts comment, and gate check runs.

**Final Gate Criteria:** Smoke corpus run completes without error; CI workflow posts a valid PR comment; gate check exits 0 on passing result, non-zero on a fabricated failing result.json.
