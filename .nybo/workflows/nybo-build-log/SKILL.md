---
name: nybo-build-log
description: Compose the per-feature build log after a spec ships. Reads the spec, feat task plans, and evidence artifacts on disk, renders `docs/<feature>/feat/11-build-log.md` from the standard 8-section template, and logs the `spec_shipped` event. Triggers on "build log", "feature log", "/nybo-build-log", or as the final step of `/nybo-ship`.
---

Render the durable narrative record of how a feature was built. The build log is the artifact a future engineer reads when they need to reconstruct the work or understand the reasoning behind a decision — it sits next to the spec, not inside the wiki.

## When this skill runs

- **Auto** — invoked by `/nybo-ship` as its final step, immediately before the success report.
- **Manual** — `nybo build-log <feature>` from the shell, or `/nybo-build-log <feature>` as a slash skill, to (re)generate the log on an already-shipped feature without re-running the ship pipeline.

## Inputs

Read these files. Each is optional — populate the template with whatever exists; do not block on a missing one.

| Input | Path | What it gives you |
|-------|------|-------------------|
| Spec | `docs/<feature>/spec/spec.md` | Goal, requirements, risks, gotchas |
| Use cases | `docs/<feature>/spec/use-cases.md` | Outcome bullets for §1 |
| Overview | `docs/<feature>/feat/00-overview.md` | High-level approach narrative |
| Task plans | `docs/<feature>/feat/01-plan-NN-*.md` | One step per file in §5 |
| Verify gate | `docs/<feature>/feat/10-verify.md` | Test scenarios for §6 |
| Progress | `docs/<feature>/feat/99-progress.md` | Confirms which tasks actually shipped |
| Diff summary | `docs/<feature>/evidence/diff-summary.md` | New/modified file tables for §4 |
| Test results | `docs/<feature>/evidence/test-results.txt` | Counts and verbatim summary for §6 + §8 |
| Code review | `docs/<feature>/evidence/code-review.txt` | Watch-out items for §7 |
| Status | `docs/<feature>/status.yaml` | `feature`, `branch`, `pr_url`, `shipped_at`, domains touched |

## Output

Write `docs/<feature>/feat/11-build-log.md`. Overwrite if it exists — the build log is regenerated, not appended.

Use the template at `references/feature-build-log-template.md` (emitted alongside this skill). All eight sections must appear in the output, in order. Within a section:

- If the source data is empty, keep the section heading but write a one-line "No notable {{thing}} for this feature." sentence rather than placeholder text. **Do not invent content.**
- Tables: include only rows you can support with evidence. A 2-row table is fine; a 6-row padded table is not.
- Code excerpts: lift verbatim from the diff or task plan, and pick the **smallest** snippet that captures the shape of the change (type signature, schema, key constant, 5–10-line implementation).
- Step-by-Step (§5) order: follow the numeric ordering of `01-plan-NN-*.md`, not the order tasks were completed.

## Steps to follow

1. **Resolve the feature**
   - If a positional `<feature>` argument was given, use it.
   - Otherwise read `git rev-parse --abbrev-ref HEAD`, match `^(feat|fix)/(.+)$`, take the slug.
   - Confirm `docs/<feature>/status.yaml` exists. If not, fail with a clear message — the skill cannot run without a spec on disk.

2. **Load all inputs**
   - Read the files in the table above. Track which were present.
   - Parse `status.yaml` for `feature`, `branch`, `pr_url`, `pr_number`, `shipped_at`, `domains_referenced`, `task_count`.

3. **Render the template**
   - Open `references/feature-build-log-template.md` (or fall back to the constant `FEATURE_BUILD_LOG_TEMPLATE_MD` if running outside an adapter context).
   - Replace each `{{placeholder}}` with content sourced from the inputs. Do not leave any placeholder in the output.
   - Section-by-section guidance:
     - **§1 Feature Goal** — paraphrase spec Intention; outcome bullets from use-cases acceptance criteria. Use `status.yaml.action_type` (`ADD`/`UPD`/`FIX`) for narrative framing only — it does not appear in commit subjects (those use Conventional Commits per `git.md`).
     - **§2 Codebase Discovery** — reuse the spec's discovery / brownfield-scan findings table. If the spec did not capture one, write "No discovery notes captured for this feature." and skip the table.
     - **§3 Architecture Decisions** — one subsection per ADR or non-trivial design choice in the spec. Pull from `spec.md` Design section and any `foundation/sdlc/adrs/<feature>-*.md`.
     - **§4 Files Created / Modified** — derive from `evidence/diff-summary.md`. Bucket: new vs modified.
     - **§5 Step-by-Step** — one step per `feat/01-plan-NN-*.md`, in numeric order. Title from the task plan H1; prose from its Intent paragraph; snippet from the smallest code block in the task.
     - **§6 Tests Written** — group by `*.test.*` vs integration / e2e directory. Source rows from each test file's `it()` / `test()` titles. Numbers from `evidence/test-results.txt`.
     - **§7 What to Watch Out For** — pull from spec Risks / Gotchas, plus any `WARN`/`TODO` lines in `evidence/code-review.txt`.
     - **§8 Final Test Count** — last summary block in `evidence/test-results.txt` verbatim, then a one-line totals sentence.

4. **Write the file**
   - Path: `docs/<feature>/feat/11-build-log.md` (use `featDirFor()` resolver — the file goes under the `feat/` dir for code profile, under the spec root for research profile).
   - Atomic write: write to a temp sibling, then rename.
   - Do not add the `AUTO_GENERATED` banner. The build log is **prose-derived** but lives **outside `.nybo/`**, so foundation format checks do not apply. Hand-edits between regenerations are tolerated (the next ship run rewrites the file).

5. **Log the `spec_shipped` event**
   - Append to `.nybo/events.jsonl` via `logEvent(rootDir, { type: "spec_shipped", actor: "agent", details: { spec, build_log_path, shipped_at, pr_url, pr_number } })`.
   - This closes the gap that `spec_shipped` was declared in `event.model.ts` but never written. Trust criteria checks that key off ship cadence will start working once features go through this skill.

6. **Report**
   - Print the build-log path and the shipped event timestamp.
   - If any input was missing, list which ones — surface the gap so the user can backfill before relying on the log.

## Integration with `/nybo-ship`

`nybo-ship` calls this skill as its final step (`Step 8 — Build log + ship event`). The ship skill provides:

- The feature slug (from current branch).
- A guarantee that `evidence/diff-summary.md` and `evidence/test-results.txt` are fresh (regenerated during verify).
- The PR url + number to embed in the `spec_shipped` event.

When invoked manually on an already-shipped feature, the skill regenerates the log from whatever evidence is currently on disk — useful when the spec or evidence was edited after the original ship.

## Failure modes

| Symptom | Cause | Resolution |
|---------|-------|------------|
| `No spec found at docs/<feature>/status.yaml` | Wrong slug or spec not committed yet | Check `git branch --show-current`; pass `--feature` explicitly |
| Template renders with literal `{{placeholders}}` | Source data missing for that section | Backfill the source file (spec discovery, diff-summary, etc.) and re-run |
| `spec_shipped` event written but build log missing | Renderer threw between rename and event log | Re-run `nybo build-log <feature>` — both writes are idempotent |

## Why this exists

Without this skill, the only durable record of a feature's build is the diff itself. Diffs answer *what* changed — they do not answer *why this approach* or *what was tried first*. The build log captures the parts of the build that would otherwise live only in the chat transcript and disappear at session end.
