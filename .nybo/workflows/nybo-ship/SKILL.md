---
name: nybo-ship
description: After implementation lands, ship it. Updates CHANGELOG.md, commits, pushes, opens or refreshes a PR, and monitors the GitHub Actions run — fixing failures iteratively until CI is green. Triggers on "ship this", "ship the feature", "/ship", or after `nybo-verify` confirms verified status. Pairs with the `post-push-ci-monitor` hook so CI is watched autonomously after each push.
---

Update CHANGELOG.md, commit all pending changes, push the current branch, then monitor the GitHub Actions run until it completes — fixing any errors that appear.

## Steps to follow

1. **Update CHANGELOG.md**
   - Run `git status` and `git diff` to see what changed.
   - Open `CHANGELOG.md` in the project root. It follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and has an `## [Unreleased]` section at the top.
   - If `CHANGELOG.md` is missing, create it with this skeleton:
     ```
     # Changelog

     All notable changes to this project will be documented in this file.

     The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

     ## [Unreleased]
     ```
   - Append a bullet under the right category inside `## [Unreleased]`. Create the category heading if it's not there yet:
     - `### Added` — net-new features, endpoints, screens, pages, SDK methods.
     - `### Changed` — behavior changes to existing features, UI redesigns, refactors with observable effects.
     - `### Fixed` — bug fixes.
     - `### Deprecated` — soon-to-be-removed features still working.
     - `### Removed` — deleted features, endpoints, routes.
     - `### Security` — auth / permission / sensitive-data fixes.
   - Bullet format: match the existing style — imperative, lowercase, include the scope prefix when relevant:
     ```
     - feat(<scope>): <what shipped> — <why it matters in one sentence>
     - fix(<scope>): <what was broken> — <what changed>
     - chore(<scope>): <what was refactored> — <why>
     ```
   - Summarize the **shipped outcome**, not a literal list of commits. One bullet per logical shipment, even if it spans many commits.
   - Cover every meaningful change in the current push: group into multiple bullets or multiple categories if the push touches unrelated areas.
   - Do NOT rewrite or remove existing `[Unreleased]` entries — only append.
   - Do NOT invent a version number; only the user promotes `[Unreleased]` → `[x.y.z]` when cutting a release.
   - Skip CHANGELOG only if the push is purely docs/internal tooling with zero user-visible effect (and say so in the final report).

2. **Stage & commit**
   - Re-run `git status` to confirm `CHANGELOG.md` is included.
   - Run `git log -5 --oneline` to match the repo's commit style.
   - Stage only relevant files (never `gcp-key.json`, `.env`, or other secrets).
   - Write a **Conventional Commits** subject — `<type>(<scope>): <description>`. Allowed types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `build`, `ci`, `style`. Map `status.yaml.action_type` (`ADD`/`UPD`/`FIX`) → commit type per the table in `.nybo/memory/domains/git.md`. Do NOT use the legacy `[TICKET][ACTION]` shape — release-please cannot parse it and silently skips the version bump.
   - If a `ticket:` is set in `status.yaml`, add a `Refs: <TICKET>` footer.
   - Use a heredoc to pass the message, appending the Co-Authored-By trailer:
     ```
     feat(<scope>): <imperative one-liner>

     <optional body explaining why>

     Refs: <TICKET>          # only when status.yaml.ticket is set
     Co-Authored-By: Claude Opus 4.7  <noreply@anthropic.com>
     ```

3. **Push**
   - Push to the current branch: `git push origin <branch>`.

4. **PR (feature branches only)**
   - Check current branch: `git rev-parse --abbrev-ref HEAD`.
   - Determine the repo slug: `git remote get-url origin` and parse `owner/repo`.
   - If the branch is NOT one of `main`, `master`, `develop`, `staging`:
     - Check for an existing PR: `gh pr list --head <branch> --repo <owner/repo> --json number,url`.
     - **Collect Quality Report metrics** (see step 4a below) — compute before writing the body so the report is embedded in the PR.
     - Build the PR body from the actual diff — fill every section with real content, not placeholders:
       - **Summary**: 3–5 bullets on what was built and why (outcome-focused, one line each).
       - **Backend Changes**: new/modified services, endpoints, data logic, config. Omit section if no backend changes.
       - **Frontend Changes**: UI components, interactions, visual behavior. Omit section if no frontend/mobile changes.
       - **Automated Testing**: ONLY what the test suite programmatically verified — test counts, suites run, regression status. If no tests were run or changed, write `- No automated test changes in this PR.` Do NOT include manual observations here.
       - **Suggestions**: brief follow-up improvements spotted during implementation (optional).
       - **Quality**: compact gauge table from step 4a. Always last, just above the Claude Code trailer.
     - If no PR exists, create one:
       ```
       gh pr create --base main --title "<concise title from latest commit>" --body "$(cat <<'EOF'
       ## Summary
       - <real bullet>
       - <real bullet>

       ## Backend Changes
       - <real content or omit section>

       ## Frontend Changes
       - <real content or omit section>

       ## Automated Testing
       - <test suite results or "No automated test changes in this PR.">

       ## Suggestions
       - <optional follow-ups>

       <!-- quality-report:start -->
       ## Quality
       <gauge table from step 4a>
       <!-- quality-report:end -->

       ---
       🤖 Generated with [Claude Code](https://claude.com/claude-code)
       EOF
       )"
       ```
     - If a PR already exists, fetch its current body (`gh pr view <n> --json body -q .body`), replace the block between `<!-- quality-report:start -->` and `<!-- quality-report:end -->` with the fresh report (or insert the block immediately before the trailing `---` / Claude Code trailer if markers absent), then `gh pr edit <number> --body "..."`. Quality must always be the last content section.
     - Print the PR URL.
   - If the branch IS a main branch, skip PR creation.

4a. **Quality Report — generic gauge block**

   Compute once per ship, inject between `<!-- quality-report:start -->` and `<!-- quality-report:end -->` markers so re-runs replace cleanly. Keep it compact.

   **Base ref**: `$(gh pr view <n> --json baseRefName -q .baseRefName 2>/dev/null || echo main)`. Call it `BASE`.

   **Changed files**: `git diff --name-only origin/$BASE...HEAD`. Filter to source files (skip lockfiles, generated files, fixtures, snapshots).

   **Metrics** — collect each. If a tool isn't available, gauge is `—` and value is `n/a`. Never block the ship on a missing tool.

   | Metric | How to compute |
   |--------|----------------|
   | Coverage | Run project's coverage tool scoped to changed files only. JS/TS: `jest --coverage --changedSince=origin/$BASE --coverageReporters=json-summary` then average `lines.pct`. Python: `pytest --cov --cov-report=json`. Go: `go test -cover ./... -coverprofile` + `go tool cover`. Report overall % and Δ vs `BASE` if computable. |
   | Size | `git diff --shortstat origin/$BASE...HEAD` → files, +lines, -lines. Label S/M/L/XL by total changed LOC (<200 / 200–600 / 600–1500 / >1500). |
   | Complexity | Run `eslint --rule '{complexity:[error,10]}' <changed .js/.ts>` (JS/TS), `radon cc -s <files>` (Py), `gocyclo` (Go). Report max complexity + location. |
   | Duplication | `npx jscpd --pattern '<changed files>' --threshold 0 --reporters json` if available. Count duplicated blocks. |
   | Security | `npm audit --json` delta (new high/critical only) + `gitleaks detect --no-banner --redact --staged` (or `--log-opts origin/$BASE..HEAD`). Report new vulns + secrets found. |
   | Type safety | On the diff: count new occurrences of `\bany\b` (type position), `@ts-ignore`, `@ts-expect-error`, `# type: ignore`, `eslint-disable`. Use `git diff origin/$BASE...HEAD -- <lang files>` and grep added lines only. |
   | Lint | Run project lint on changed files; count warning delta vs baseline (0 is the expected floor). |
   | Tests | Count new/modified test files (`*.test.*`, `*.spec.*`, `test_*.py`, `*_test.go`). Compute test-to-code ratio: test LOC added / non-test LOC added. |

   **Thresholds** (generic, apply regardless of stack):

   | Metric | 🟢 | 🟡 | 🔴 |
   |--------|----|----|----|
   | Coverage (changed files) | ≥80% | 60–79% | <60% |
   | Coverage Δ vs base | ≥0% | -3 to 0% | <-3% |
   | Size (LOC changed) | <200 | 200–600 | >600 |
   | Complexity (max) | ≤10 | 11–15 | >15 |
   | Duplication blocks | 0 | 1–2 | ≥3 |
   | Security | 0 issues | low-sev only | any high/critical or secrets |
   | Type safety (new escapes) | 0 | 1–3 | >3 |
   | Lint warnings Δ | ≤0 | 1–5 | >5 |
   | Test/code ratio | ≥0.5 | 0.2–0.5 | <0.2 |

   **Output template** (emit verbatim, fill values):

   ```markdown
   <!-- quality-report:start -->
   ## Quality

   | | Metric | Value |
   |--|--|--|
   | <gauge> | Coverage | <pct>% (Δ <+/->%) |
   | <gauge> | Size | +<add> / -<del> (<S/M/L/XL>) |
   | <gauge> | Complexity | max <n><, location if 🟡/🔴> |
   | <gauge> | Duplication | <n> block(s) |
   | <gauge> | Security | <audit summary> • <n> secret(s) |
   | <gauge> | Type safety | <n> new escape(s) |
   | <gauge> | Lint | <n> new warning(s) |
   | <gauge> | Tests | +<n> tests, ratio <r> |

   **Verdict** <overall gauge> <one-line summary: reds block, yellows flag, all green = ship-ready>.

   <details><summary>Per-file coverage</summary>

   | File | Lines | Δ |
   |--|--|--|
   | <path> | <pct>% | <+/->% |

   </details>
   <!-- quality-report:end -->
   ```

   **Verdict rule**: 🔴 if any metric red (block ship, surface to user). 🟡 if any yellow, otherwise 🟢. One sentence max.

   **Skip metric** when its tool is absent: gauge `—`, value `n/a — <tool> not installed`. Do not fabricate numbers.

5. **Poll the GitHub Actions run — no streaming watchers**
   - Never use `--watch` or `gh run watch` — they stream continuously and waste tokens.
   - **First wait: use `ScheduleWakeup` with `delaySeconds: 120`** (2 minutes) so the session suspends instead of blocking. Pass the current /ship prompt as the `prompt` field so it resumes here. Note in the reason: "waiting for CI to start after push".
   - On wake-up, determine `<owner/repo>` from `git remote get-url origin`, then start polling:
   - For **feature branches**:
     - Poll: `gh pr checks <pr-number> --repo <owner/repo>`
     - If any check is still `pending` or `in_progress`, call `ScheduleWakeup` with `delaySeconds: 60` to suspend again. Resume and poll again.
     - Repeat until all checks show `pass` or `fail`.
   - For **main branches**:
     - Get the run ID: `gh run list --limit 2 --repo <owner/repo>`
     - Poll: `gh run view <run-id> --repo <owner/repo> --json status,conclusion`
     - If `status` is not `completed`, call `ScheduleWakeup` with `delaySeconds: 60` and resume.
     - Repeat until `status == completed`. Read `conclusion` to determine pass/fail.

6. **Fix failures**
   - If any job failed, fetch the logs: `gh run view <run-id> --repo <owner/repo> --log-failed`.
   - Diagnose the root cause, apply the fix, then go back to step 1 and repeat until the run is fully green.
   - When fixing and re-shipping, append a new bullet to `[Unreleased]` only if the fix is a user-visible change from what the earlier push shipped; otherwise amend the existing bullet's description.
   - Do **not** retry the same failing command without changing something.

7. **Log `pr_created`**
   - Append a `pr_created` event to `.nybo/events.jsonl` so the dashboard's PR Ready column updates.

8. **Build log + ship event** (final step — do not skip)
   - Invoke the `/nybo-build-log` skill for this feature, or run `nybo build-log <feature>` directly.
   - The skill renders `docs/<feature>/feat/11-build-log.md` from the spec, feat task plans, and evidence artifacts, then logs the `spec_shipped` event with the build-log path embedded in `details`.
   - Skipping this step leaves the feature without a durable narrative record of how it was built — diffs only answer *what*, the build log answers *why*.

9. **Done**
   - Report the final green run URL, the PR URL (if created), the build-log path, and which CHANGELOG entries were added (or that CHANGELOG was intentionally skipped for a docs-only push).

## Integration with `.nybo/`

This skill is part of the nybo workflow lifecycle stored under `.nybo/workflows/nybo-ship/`. The `post-push-ci-monitor` hook in `.claude/settings.json` (emitted by `nybo init` or `nybo sync --hooks`) fires this skill automatically after `git push` so CI watching is autonomous. Trust gating still applies — at L1 supervised, the hook prompts before firing; L2+ runs silently.

Two events land per successful ship: `pr_created` after CI passes and the PR is open, then `spec_shipped` after the build log is written. The `spec_shipped` event is the dashboard's signal that the spec is fully closed out.
