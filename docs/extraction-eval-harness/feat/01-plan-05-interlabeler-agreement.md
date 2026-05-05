# T5: Inter-Labeler Agreement + CSV Import

## Scope

- `eval/labeling/import-csv.ts` — converts labeler CSV to ground-truth JSON
- `eval/labeling/compute-agreement.ts` — Cohen's kappa on dual-labeled pliegos

## Changes

### CSV import (`eval/labeling/import-csv.ts`)

Flags: `--input=<path.csv> --id=<pliego-id> [--labeler=b]`

Sequence:
1. Parse CSV with a streaming CSV library (e.g. `csv-parse`).
2. Map each row to `GroundTruthRequisito` shape.
3. Validate full array with `GroundTruthFileSchema` (Zod).
4. On validation failure: print all Zod errors with row number, exit non-zero.
5. On success: write to `eval/corpus/ground-truth/<id>.json` (or `labeler-b/<id>.json` if `--labeler=b`).

CSV columns (case-insensitive, trimmed):
```
tipo | texto_canonical | pagina_fuente | quote_fuente_minima | is_habilitante
```

`is_habilitante` column accepts: `true`/`false`, `si`/`no`, `1`/`0` (case-insensitive).

### Cohen's kappa (`eval/labeling/compute-agreement.ts`)

Flags: `--git-hash=<hash>` (to append result to that run's report)

For each of the 5 dual-labeled pliegos (identified by presence of `labeler-b/<id>.json`):
1. Load primary `ground-truth/<id>.json` and `ground-truth/labeler-b/<id>.json`.
2. Embed both sets, cosine-match primary ↔ secondary (threshold 0.80) — same matching logic as scorer.
3. For each matched pair, collect `(primary.is_habilitante, secondary.is_habilitante)` and `(primary.tipo, secondary.tipo)`.
4. Compute Cohen's kappa for binary (`is_habilitante`) and 4-class (`tipo`) independently.
5. Macro-average kappa across the 5 pliegos.

Cohen's kappa formula:
```
κ = (P_o - P_e) / (1 - P_e)
```
where `P_o` = observed agreement rate, `P_e` = expected agreement by chance.

Output:
- Appends kappa table to `eval-results/<git_hash>/report.md` (or prints to stdout if no hash given).
- **Tiered gate** applied independently to `kappa_habilitante` and `kappa_tipo`:
  - `kappa < 0.60`: exits non-zero with message `KAPPA_BELOW_FLOOR — labels are noise, eval results unreliable`
  - `0.60 ≤ kappa < 0.75`: prints warning, exits 0
  - `kappa ≥ 0.75`: passes silently

### Design Rationale (SRP)

CSV import owns labeler input validation only. Kappa computation owns inter-labeler measurement. Both are standalone scripts, not part of the main runner/scorer pipeline.

## Dependencies

Requires T1 (types + `GroundTruthFileSchema`). Independent of T2–T4.

## Done When

- [ ] `import-csv.ts` converts a 5-row CSV correctly to valid JSON (unit test with fixture CSV)
- [ ] `import-csv.ts` exits non-zero with row-number error when `tipo = 'general'` in CSV
- [ ] `import-csv.ts` accepts `si`/`no` as valid `is_habilitante` values
- [ ] `compute-agreement.ts` computes correct kappa for a known 2×2 contingency matrix (unit test)
- [ ] `kappa < 0.60` → exits non-zero with `KAPPA_BELOW_FLOOR` message
- [ ] `0.60 ≤ kappa < 0.75` → warns, exits 0
- [ ] `kappa ≥ 0.75` → silent pass, exits 0
- [ ] Both `kappa_habilitante` and `kappa_tipo` evaluated independently (one dimension failing < 0.60 fails even if other passes)
- [ ] `npm run typecheck` passes for both files
