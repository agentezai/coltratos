# T6: CI Integration

## Scope

- `.github/workflows/extraction-eval.yml` — GitHub Actions workflow
- `package.json` — add `eval`, `eval:score`, `eval:report`, `eval:agreement`, `eval:import-csv` scripts

## Changes

### GitHub Actions workflow (`.github/workflows/extraction-eval.yml`)

```yaml
name: Extraction Eval

on:
  pull_request:
    paths:
      - 'lib/extraction/**'
      - 'eval/**'
      - '.github/workflows/extraction-eval.yml'

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run eval
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.EVAL_SUPABASE_SERVICE_ROLE_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        run: npm run eval -- --all --concurrency=4

      - name: Score
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: npm run eval:score

      - name: Generate report
        run: npm run eval:report

      - name: Post PR comment
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          REPORT=$(cat eval-results/$(git rev-parse --short HEAD)/report.md)
          gh pr comment ${{ github.event.pull_request.number }} --body "$REPORT"

      - name: Gate check
        run: |
          GATE=$(node -e "
            const r = require('./eval-results/$(git rev-parse --short HEAD)/results.json');
            process.exit(r.gate_passed ? 0 : 1);
          ")

      - name: Commit results
        run: |
          git config user.email "ci@coltratos.dev"
          git config user.name "CI"
          git add eval-results/
          git diff --staged --quiet || git commit -m "eval: $(git rev-parse --short HEAD) results"
          git push
```

**Secrets required** (document in `wiki/agents-and-skills.md`):
- `ANTHROPIC_API_KEY` — extraction calls
- `OPENAI_API_KEY` — embedding calls
- `EVAL_SUPABASE_SERVICE_ROLE_KEY` — corpus PDF download (separate from prod service role key)
- `SUPABASE_URL` — Supabase project URL

### package.json scripts

```json
{
  "scripts": {
    "eval": "tsx eval/runner/run-eval.ts",
    "eval:score": "tsx eval/scorer/score.ts",
    "eval:report": "tsx eval/report/generate-report.ts",
    "eval:agreement": "tsx eval/labeling/compute-agreement.ts",
    "eval:import-csv": "tsx eval/labeling/import-csv.ts"
  }
}
```

### Design Rationale (OCP)

Workflow is open for extension (add steps, change trigger paths) without touching eval scripts. Scripts are standalone CLI tools; CI just orchestrates them.

## Dependencies

Requires T2 (runner), T3 (scorer), T4 (report generator). T5 (agreement) is optional in CI — include if `eval/corpus/ground-truth/labeler-b/` has any files.

## Done When

- [ ] `package.json` scripts are present and each exits 0 on a smoke run (e.g. `--pliego=stub-001`)
- [ ] Workflow YAML is valid (checked with `actionlint` or `yamllint`)
- [ ] `EVAL_SUPABASE_SERVICE_ROLE_KEY` secret documented in `wiki/agents-and-skills.md` under "CI Secrets"
- [ ] Gate check step exits non-zero when `gate_passed: false` in `results.json`
- [ ] Workflow PR comment step posts a non-empty comment (integration tested with `act` locally or manual PR trigger)
