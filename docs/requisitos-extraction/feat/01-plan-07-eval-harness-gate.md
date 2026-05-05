# T7: extraction-eval-harness Verified Gate

## Scope

- `.github/workflows/extraction-eval.yml` — CI job triggering the eval harness on PRs to `lib/extraction/**`.
- `docs/requisitos-extraction/feat/10-verify.md` — Verified step updated to require a passing harness run.
- Coordination with `extraction-eval-harness` T6 (CI integration spec).

## Changes

### CI gate

The `extraction-eval.yml` workflow MUST trigger on:
- Pull requests that touch any file under `lib/extraction/**`.
- Manual dispatch (`workflow_dispatch`).

The workflow runs `extraction-eval-harness` against the current commit and writes a pass/fail summary to `eval-results/index.md` keyed by git hash.

### Verified gate

`nybo-verify` for `requisitos-extraction` MUST confirm before marking `Verified`:
1. `eval-results/index.md` contains an entry for the **current git hash**.
2. That entry shows `aggregate_recall >= 0.85` AND `per_tipo_recall.juridico >= 0.80`, `per_tipo_recall.financiero >= 0.80`, `per_tipo_recall.tecnico >= 0.80`, `per_tipo_recall.experiencia >= 0.80`.
3. The entry is dated within 7 days of the Verified request (stale runs do not count).

If any of the above fails, the Verified step blocks with: `"extraction-eval-harness gate not satisfied — run /nybo-verify after a passing eval run."`

### Partial result scoring

Per RN-019: if the harness runs against a commit where `failed_categories` is non-empty for a pliego, those categories count as recall = 0 for that pliego in the per-tipo aggregate. They are NOT excluded from the denominator.

### Design Rationale

The quality gate must be external to the extractor's own tests — the acceptance test in T6 confirms the happy path, but the eval harness runs against a curated reference set with expert scoring. Making Verified contingent on the harness prevents shipping extraction improvements that look good on internal tests but degrade on the broader reference set.

## Dependencies

Requires **T6** (corpus + acceptance tests exist).
Requires **extraction-eval-harness** spec approved and T6 of that spec shipped (CI eval workflow).

## Done When

- [ ] Implement Task 7: `.github/workflows/extraction-eval.yml` exists and triggers on `lib/extraction/**` PRs; on completion, writes a summary entry to `eval-results/index.md` with the git hash, aggregate recall, and per-tipo recall.
- [ ] Verify Task 7: `nybo-verify` for `requisitos-extraction` checks `eval-results/index.md` for a current-hash passing entry before allowing `Verified`. CI eval workflow passes on a clean extraction run.
