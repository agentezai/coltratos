# T3: Scorer

## Scope

- `eval/scorer/score.ts` — main scorer: load ground truth + predicted, match, compute metrics, write results.json
- `eval/scorer/embeddings.ts` — OpenAI `text-embedding-3-small` calls with batching
- `eval/scorer/metrics.ts` — recall, precision, F1, hallucination rate, per-tipo breakdown

## Changes

### Embedding module (`eval/scorer/embeddings.ts`)

```typescript
import OpenAI from 'openai'

const EMBED_MODEL = 'text-embedding-3-small'
const BATCH_SIZE = 100  // OpenAI limit per request

export async function embedBatch(texts: string[], client: OpenAI): Promise<number[][]> {
  // Split texts into batches of BATCH_SIZE
  // Call client.embeddings.create({ model: EMBED_MODEL, input: batch }) per batch
  // Concatenate and return embedding vectors
}

export function cosine(a: number[], b: number[]): number {
  // Standard cosine similarity, returns [-1, 1]
}
```

### Calibration step (`eval/scorer/score.ts`, runs before main eval)

Before the main eval run, scorer validates its matching quality:
1. Load the 5 dual-labeled pliegos (those with `eval/corpus/ground-truth/labeler-b/<id>.json`).
2. Treat labeler-b annotations as "predicted", labeler-a as "ground truth".
3. Run the full embed + greedy-match pipeline with the current model + threshold.
4. Compute calibration agreement: `matched_b / total_b` (fraction of labeler-b entries that found a match in labeler-a at MATCH_THRESHOLD).
5. If agreement ≥ 0.80: proceed with `text-embedding-3-small`.
6. If agreement < 0.80: log `scorer_calibration_warning`, retry calibration with `text-embedding-3-large`. If `text-embedding-3-large` agreement ≥ 0.80: use it for the main run. If neither reaches 0.80: throw `ScorerCalibrationFailedError` with `{ model_small_agreement, model_large_agreement }` — abort eval.
7. Record `{ scorer_embedding_model, scorer_calibration_agreement }` in `results.json`.

Rationale: calibration catches the case where prompt changes make extraction produce descriptions that diverge stylistically from `texto_canonical`, causing the matcher to silently undercount matches and inflate `missed` — the eval would show a recall drop that is actually scorer drift, not extraction degradation.

### Matching algorithm (`eval/scorer/score.ts`, main eval)

For each pliego:
1. Load `eval/corpus/ground-truth/<id>.json` (validated via `GroundTruthFileSchema`).
2. Load `eval-results/<git_hash>/<id>/predicted.json`.
3. Embed all `texto_canonical` strings and all `Requisito.descripcion` strings using the model chosen by calibration.
4. Build cosine similarity matrix (ground_truth × predicted).
5. **Greedy matching**: for each ground-truth entry, find the highest-cosine predicted entry above `MATCH_THRESHOLD` that has not already been assigned. Tiebreak: prefer predicted whose `citation_segment_id` resolves to a page closest to `pagina_fuente`.
6. Unmatched ground-truth entries → `missed`. Unmatched predicted entries → `hallucinated` (only if `corpus_entry.ground_truth_exhaustive === true`; otherwise `hallucinated = []` and `hallucination_rate = null`).

### Metrics module (`eval/scorer/metrics.ts`)

```typescript
export function computeMetrics(
  groundTruth: GroundTruthRequisito[],
  predicted: Requisito[],
  matches: Map<number, number>,  // gt_idx → pred_idx
): PliEgoMetrics
```

Returns: `recall`, `precision`, `f1`, `hallucination_rate`, and per-tipo breakdown:
- Filter ground truth by tipo → compute recall per tipo
- Filter predicted by tipo → compute precision per tipo
- `null` if no ground-truth entries for that tipo (triggers corpus-gap warning, not gate failure)

Aggregate across all pliegos: macro-average (equal weight per pliego, not per requisito count). This avoids large pliegos dominating the aggregate score.

### `EvalRunResult` assembly

After scoring all pliegos, `score.ts` assembles the full `EvalRunResult` and writes to `eval-results/<git_hash>/results.json`. Includes `cost_usd` summed from all `predicted.json` `output.costUsd` fields.

Gate check: reads `recall_aggregate`, all per-tipo recalls; sets `gate_passed = recall_aggregate >= 0.85 && all_tipo_recall >= 0.80`.

### Design Rationale (SRP)

Scorer owns only measurement — no pipeline calls, no file writes except `results.json`. Embedding calls are isolated in `embeddings.ts` so they can be mocked in unit tests.

## Dependencies

Requires T1 (types) and T2 (runner writes `predicted.json` that scorer reads).

## Done When

- [ ] Unit test for `computeMetrics` with known inputs produces correct `recall`, `precision`, `hallucination_rate`
- [ ] Unit test for per-tipo breakdown: two tipos with different recall → per-tipo values differ from aggregate
- [ ] `cosine` function returns 1.0 for identical vectors, ~0.0 for orthogonal
- [ ] `embedBatch` respects `BATCH_SIZE=100`; a 150-text input produces exactly 2 API calls (integration test, mock OpenAI client)
- [ ] Calibration step: mock calibration with agreement=0.70 for small model + 0.85 for large → `scorer_embedding_model = 'text-embedding-3-large'` in output
- [ ] Calibration step: mock calibration with agreement=0.70 for both models → `ScorerCalibrationFailedError` thrown
- [ ] Pliego with `ground_truth_exhaustive: false` → `hallucination_rate = null` in `PliEgoResult`
- [ ] `score.ts` writes valid `EvalRunResult` JSON parseable by TypeScript after a real scorer run on a 1-pliego smoke corpus
- [ ] `npm run typecheck` passes for all files under `eval/scorer/`
