---
name: nybo-verify
description: >-
  Phase 3 verification: gather evidence (build, tests, coverage, diff),
  present findings for human confirmation, and produce an evidence report.
  Triggers on "verify", "check spec", or after implementation is complete.
---

# nybo-verify

Gather objective evidence about the current state of the implementation
and present it for human evaluation. This skill does NOT make judgments —
it collects facts and lets the human decide.

---

## 1. Gather evidence

Run the following checks and capture output:

### Build
- Run the project's build command (from CORE.md `## Key Commands`).
- Capture stdout/stderr to `docs/<feature>/evidence/build.log`.
- Record: pass/fail, error count, warning count.

### Tests
- Run the project's test command.
- Capture results to `docs/<feature>/evidence/test-results.txt`.
- Record: total tests, passed, failed, skipped.

### Coverage
- If the test command produces coverage output, capture it.
- Write summary to `docs/<feature>/evidence/coverage-summary.txt`.
- Record: line coverage %, branch coverage %, uncovered files.

### Diff analysis
- Run `git diff` against the base branch (or main/master).
- Write summary to `docs/<feature>/evidence/diff-summary.txt`.
- Record: files changed, lines added, lines removed.
- List new files and deleted files.

---

## 2. Present findings

Compile a checklist from the evidence:

```
## Verification Checklist — <feature-name>

- [ ] Build: <pass/fail> (<N> warnings)
- [ ] Tests: <passed>/<total> passing (<N> failed)
- [ ] Coverage: <N>% lines, <N>% branches
- [ ] Diff: <N> files changed, +<N>/-<N> lines
- [ ] Security: (reference security-scan.txt if nybo-verify ran)
- [ ] Design principles: (check against design-principles.yaml)
- [ ] Wiki alignment: if this spec changed user-visible capabilities, are they reflected in `wiki/` and pushed via `nybo wiki-sync push`? Otherwise `nybo doctor` will flag "Wiki Drift" post-merge.
```

Present this checklist to the human. Do not pre-check any boxes —
the human marks each item as acceptable or flags concerns.

---

## 3. Human confirmation

- Wait for the human to review each finding.
- If the human flags a concern, note it and suggest next steps
  (e.g. "fix failing tests", "increase coverage for X module").
- If all items are accepted, update the `<feature>` entry in **`docs/status.yaml`**:
  `status: confirmed`, `verified_at: <ISO date>`.
- **Record the outcome via the CLI (preferred):**
  - **Pass** → run `nybo verify --record pass --feature <feature>` (emits `verify_passed` + `curate_needed` in one call).
  - **Fail** → run `nybo verify --record fail --feature <feature> --reason "<short reason>"` (emits `verify_failed`; no `curate_needed`).
  - The CLI auto-detects the feature from the current branch (`feat/<feature>` or `fix/<feature>`) — `--feature` is only needed when the branch doesn't follow the convention.
- Do NOT hand-write `verify_passed` / `verify_failed` / `curate_needed` to events.jsonl any more — the CLI is the single source of truth for these three event types.

---

## 4. Generate report

Write `docs/<feature>/evidence/verification-report.md` with:
- Date and feature name
- All evidence summaries
- Human's decisions on each checklist item
- Overall verdict: verified / needs-work

---

## Trust Behavior

- **All levels:** Evidence gathering is autonomous — the skill runs
  build, tests, and diff without asking.
- **All levels:** The confirmation step is always interactive.
  Verification requires human sign-off regardless of trust level.

---

## File Locations

- **Evidence directory:** `docs/<feature>/evidence/`
- **Status file:** `docs/status.yaml` (root-level, keyed by feature name)
- **Event log:** `.nybo/events.jsonl`

---

## Capturing observations as you review

If something surprising shows up while reviewing the checklist — a convention that held up under load, a violation that was unrelated to the feature, a reusable pattern worth extracting — capture it immediately via the feedback CLI so `/nybo-curate` can pick it up later:

```
nybo feedback capture <feature> --tag CONFIRMS "rate-limit convention held under load"
nybo feedback capture <feature> --tag VIOLATES "auth helper was duplicated in /api/foo"
nybo feedback capture <feature> --tag "NEW CONVENTION candidate" "always wrap fetch in retry-with-backoff"
nybo feedback capture <feature> --tag "SKILL candidate" "JSONL parser worth extracting"
```

Valid tags: `CONFIRMS`, `VIOLATES`, `NEW CONVENTION candidate`, `SKILL candidate`, `DOMAIN candidate`, `NOTE` (default). The command appends to `docs/<feature>/feedback.md` and emits a `feedback_started` event so the next curate run sees the signal.

---

## Next Steps

- `/nybo-run` — Create or update the pull request once verification passes.
- `/nybo-curate` — Process suggestions and feedback into project knowledge.
- `/nybo-plan` — Create a fix spec if blockers were found.

---

## What This Skill Does NOT Do

- **Fix issues** — it reports them. Use nybo-run or nybo-plan
  to address findings.
- **Make pass/fail decisions** — the human decides. The skill presents
  objective evidence only.
- **Run security scans** — that is nybo-verify's responsibility.
  This skill references security scan results if available.
