# T4: Report Generator

## Scope

- `eval/report/generate-report.ts` — reads `results.json`, produces `report.md`, appends to `eval-results/index.md`

## Changes

### Report sections (`eval/report/generate-report.ts`)

Accepts `--git-hash=<hash>` (defaults to `git rev-parse --short HEAD`).

Reads `eval-results/<git_hash>/results.json`, validates against `EvalRunResult` shape.

Produces `eval-results/<git_hash>/report.md` with:

```markdown
# Extraction Eval Report — <git_hash>

**Date:** <date>
**Gate:** PASS / FAIL
**Forced:** yes (reason: ...) / no
**Scorer model:** text-embedding-3-small (calibration agreement: 0.84)

## Aggregate Metrics

| Metric              | Value | Gate      |
|---------------------|-------|-----------|
| Recall              | 0.87  | ≥0.85 ✅  |
| Recall stddev       | ±0.06 | —         |
| Precision           | 0.84  | —         |
| F1                  | 0.85  | —         |
| Hallucination rate  | 0.08  | — (exhaustive pliegos only: 12/20) |
| Cost (USD)          | $1.82 | —         |

> ⚠️ N=20 corpus: recall CI ≈ ±0.05. Gates are not L3-trust-ready until N≥50.

## Per-Tipo Recall

| Tipo        | Recall | Gate (≥0.80) |
|-------------|--------|-------------|
| juridico    | 0.91   | ✅ PASS      |
| tecnico     | 0.78   | ❌ FAIL      |
| financiero  | 0.87   | ✅ PASS      |
| experiencia | 0.86   | ✅ PASS      |

## Per-Pliego Summary

| Pliego ID   | Recall | Precision | Exhaustive | Hallucination | Status |
|-------------|--------|-----------|------------|---------------|--------|
| pliego-001  | 0.90   | 0.88      | yes        | 0.04          | ok     |
| pliego-002  | 0.75   | 0.80      | no         | n/a           | ok     |

**Recall stddev across corpus: 0.06** (min: 0.62, max: 0.97)

## Missed Requisitos (first 10)

- **[pliego-001 · juridico · p.12]** "Estar inscrito en el RUP con clasificación UNSPSC 80..."

## Hallucinated Requisitos (exhaustive pliegos only — first 10)

- **[pliego-003 · tecnico]** "Tener experiencia en sistemas de información geográfica..."
  *(highest cosine to any GT entry: 0.62 — below threshold 0.80)*

## Scorer Calibration

| Model                  | Calibration Agreement |
|------------------------|-----------------------|
| text-embedding-3-small | 0.84 ✅               |

## Inter-Labeler Agreement (if computed)

| Dimension      | Kappa | Tier     |
|----------------|-------|----------|
| is_habilitante | 0.81  | ✅ PASS  |
| tipo           | 0.77  | ✅ PASS  |
```

**Hallucination entry data structure** (from `PliEgoResult.hallucinated`): each entry is a `HallucinatedEntry = { descripcion: string, tipo: RequisitoCategoria, citation_segment_id: SegmentoId, max_cosine_to_gt: number }`. The `max_cosine_to_gt` shows how close the closest ground-truth entry was — useful for spotting near-misses vs clear fabrications. Report shows this value inline.

### Index append (`eval-results/index.md`)

Creates if absent. Appends one row:
```
| <git_hash> | <date> | <recall_agg> | <precision_agg> | <F1> | <PASS/FAIL> |
```

### Design Rationale (SRP)

Report generator is read-only (reads `results.json`, writes markdown). No pipeline calls, no embedding calls.

## Dependencies

Requires T3 (scorer writes `results.json` that report generator reads).

## Done When

- [ ] Given a valid `results.json`, `report.md` is generated with all sections populated
- [ ] Per-pliego table includes `Recall stddev` row and min/max recall values
- [ ] Hallucinated requisitos section shows `max_cosine_to_gt` for each entry
- [ ] Non-exhaustive pliegos show "n/a" in Hallucination column, not 0%
- [ ] Aggregate hallucination note shows count of exhaustive pliegos vs total ("exhaustive pliegos only: 12/20")
- [ ] `eval-results/index.md` gains exactly one new row per invocation (no duplicates on re-run of same hash)
- [ ] N=20 CI-width warning appears in aggregate block
- [ ] `forced: true` in results produces "Forced: yes" in the report header
- [ ] Tipos with `null` recall (no ground-truth entries) show "n/a" in per-tipo table with a "corpus-gap" note
- [ ] `npm run typecheck` passes for `eval/report/generate-report.ts`
