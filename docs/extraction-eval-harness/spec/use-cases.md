# extraction-eval-harness — Use Cases

## Actors

| Actor | Description |
|-------|-------------|
| Engineer | Runs eval on demand, reviews reports, interprets pass/fail |
| Human Labeler | Annotates requisitos on assigned pliegos using the CSV template |
| CI Pipeline | Automated: triggers eval on PR, posts comment, enforces gates |

## User Stories

| ID | Story |
|----|-------|
| US-01 | As an engineer, I want to run `npm run eval -- --all` and get a committed markdown report + JSON so I can measure current extraction quality against the corpus. |
| US-02 | As an engineer, I want CI to block a PR if aggregate recall drops below 85% so regressions in the extraction prompt or model config are caught before merge. |
| US-03 | As a human labeler, I want a clear CSV template and a protocol document so I can annotate requisitos on a pliego without ambiguity about schema or edge cases. |
| US-04 | As an engineer, I want per-tipo recall reported separately so I can identify which requisito category (`juridico`, `tecnico`, `financiero`, `experiencia`) is underperforming. |
| US-05 | As an engineer, I want Cohen's kappa reported on the dual-labeled pliegos so I can assess whether the ground-truth corpus is reliable before trusting the eval score. |

---

## Use Case Scenarios

### UC-01 — Run on-demand eval {#uc-01}

**Actors:** Engineer

**Main Scenario:**
1. Engineer runs `npm run eval -- --all` (or `--pliego=<id>` for a single pliego).
2. Runner reads `corpus.yaml`, resolves current git hash.
3. Runner checks: if `eval-results/<git-hash>/` already exists, prints warning and exits (no overwrite).
4. For each pliego: downloads PDF from Supabase Storage, verifies SHA256, runs inner ingestion pipeline, runs `AnthropicRequisitosExtractor`, writes `predicted.json`.
5. Engineer runs `npm run eval:score`. Scorer embeds all `texto_canonical` and `descripcion` strings via OpenAI `text-embedding-3-small`, computes cosine matches, derives metrics.
6. Engineer runs `npm run eval:report`. Generates `eval-results/<git-hash>/report.md` + `results.json`, appends to `eval-results/index.md`.
7. Engineer commits `eval-results/<git-hash>/` alongside the code change.

**Alternative Scenarios:**
- `A1 — Single pliego`: `--pliego=<id>` runs only for that corpus entry; scorer still computes metrics for that slice.
- `A2 — Force re-run`: `--force --reason="prompt update"` overwrites and marks result as `{ forced: true, reason: "..." }`.

**Error Scenarios:**
- `E1 — SHA256 mismatch`: Runner logs `corpus_integrity_failure`, skips pliego, continues with remaining.
- `E2 — Extractor cost ceiling breach`: Runner catches `ExtractorCostCeilingExceededError`, records pliego as `status: cost_exceeded`, continues.
- `E3 — Storage fetch failure`: Runner catches `StorageFetchFailedError`, records pliego as `status: fetch_failed`, continues.

---

### UC-02 — PR gate on extraction change {#uc-02}

**Actors:** CI Pipeline, Engineer

**Main Scenario:**
1. PR touches `lib/extraction/**`, `eval/**`, or the CI workflow file.
2. GitHub Actions triggers `extraction-eval.yml`.
3. Workflow runs `npm run eval -- --all` using CI secrets (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Workflow runs scorer + report generator.
5. Workflow posts PR comment with aggregate table + per-tipo table + pass/fail verdict.
6. If aggregate recall < 0.85 or any per-tipo recall < 0.80, workflow exits with non-zero status → PR blocked.
7. `eval-results/<git-hash>/` is committed back to the PR branch (or uploaded as workflow artifact if no write permission).

**Alternative Scenarios:**
- `A1 — PR doesn't touch extraction`: Workflow skips (path filter not matched).

**Error Scenarios:**
- `E1 — CI secret missing`: Workflow fails with a clear error message naming the missing secret.
- `E2 — Eval run fails mid-corpus`: Partial results are scored; failed pliegos listed in the PR comment under "incomplete run."

---

### UC-03 — Human labeling session {#uc-03}

**Actors:** Human Labeler

**Main Scenario:**
1. Labeler reads `eval/corpus/labeling-protocol.md` — criteria for what counts as a requisito habilitante, how to fill each field.
2. Labeler opens assigned pliego PDF (downloaded from SECOP II or shared via Supabase Storage link).
3. Labeler fills `labeling-template.csv` (columns: `tipo, texto_canonical, pagina_fuente, quote_fuente_minima, is_habilitante`) — one row per requisito.
4. Labeler hands CSV to engineer.
5. Engineer runs `npm run eval:import-csv -- --input=<path> --id=<pliego-id>`. Script validates CSV, writes `eval/corpus/ground-truth/<id>.json`.
6. Engineer updates `corpus.yaml` with `labeler_primary: <name>` and `date_labeled: <YYYY-MM-DD>`.

**Error Scenarios:**
- `E1 — Invalid tipo in CSV`: `import-csv.ts` prints Zod error with row number, exits non-zero.
- `E2 — Missing required field`: Same Zod validation path.

---

### UC-04 — Per-tipo recall drill-down {#uc-04}

**Actors:** Engineer

**Main Scenario:**
1. After scorer completes, `report.md` includes a table:

```
| Tipo         | Recall | Precision | F1   | Gate (≥0.80) |
|--------------|--------|-----------|------|-------------|
| juridico     | 0.91   | 0.88      | 0.89 | PASS        |
| tecnico      | 0.78   | 0.82      | 0.80 | FAIL        |
| financiero   | 0.87   | 0.84      | 0.85 | PASS        |
| experiencia  | 0.86   | 0.89      | 0.87 | PASS        |
```

2. Report also lists per-tipo missed requisitos with `texto_canonical` and `pagina_fuente`.
3. Engineer identifies which prompt section to improve for `tecnico`.

---

### UC-05 — Inter-labeler agreement {#uc-05}

**Actors:** Engineer

**Main Scenario:**
1. Engineer runs `npm run eval:agreement -- --git-hash=<hash>`.
2. Script reads primary + secondary ground-truth files for the 5 dual-labeled pliegos.
3. For each pliego: embeds both sets, cosine-matches primary ↔ secondary, computes `kappa_habilitante` and `kappa_tipo` per pliego.
4. Aggregates kappa across all 5 pliegos (macro-average).
5. Appends kappa table to `eval-results/<hash>/report.md`.
6. Prints warning if aggregate kappa < 0.75 (corpus annotation considered unreliable).
