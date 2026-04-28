---
name: nybo-curate
description: >-
  Consolidated curation skill with four modes: curate (feedback-to-knowledge
  pipeline), extract (capture reusable patterns as project skills), conventions
  (add/verify/retire/audit/promote conventions), and domains (create/split/merge/audit
  domain knowledge files, ADRs, and changelogs). Replaces nybo-curate-feedback
  and nybo-curate from the full edition.
  Triggers on "curate", "extract skill", "add convention", "create domain",
  "create ADR", "generate changelog", or any related operation.
---

# nybo-curate

Unified curation skill for the nybble-lite edition. All knowledge management
operations are accessible through **modes**.

---

## Mode Dispatch

Determine which mode to activate based on the user's request:

| Mode | Trigger phrases | Replaces (full edition) |
|---|---|---|
| **curate** | "curate", "process feedback", "curate feedback" | nybo-curate-feedback |
| **extract** | "extract skill", "capture pattern", "create skill from", "what patterns can we reuse" | nybo-curate |
| **conventions** | "add convention", "verify convention", "retire convention", "audit conventions", "promote to CORE" | nybo-curate |
| **domains** | "create domain", "split domain", "merge domains", "audit domains" | nybo-curate |
| **adr** | "create ADR", "update ADR", "list ADRs", "audit ADRs", "architectural decision" | — (new) |
| **changelog** | "generate changelog", "sprint changelog", "what shipped" | — (new) |

If the mode is ambiguous, ask: "Which mode? curate / extract / conventions / domains / adr / changelog"

---

## Mode: curate

Transform raw feedback and suggestions from the execution phase into
structured project knowledge: conventions, CLAUDE.md patches, skills,
and deprecation notices.

---

### curate — Pre-check: Pending curation signals

**If invoked without a `<feature>` argument**, scan `.nybo/events.jsonl` for unresolved `curate_needed` events (any `curate_needed` event whose `spec` has no later `curate_run` event referencing the same spec). Present the backlog:

```
Pending curate_needed signals (N spec(s)):
  - <feature-a>    source=verify_passed    <relative time>
  - <feature-b>    source=verify_passed    <relative time>
  - <feature-c>    source=manual           <relative time>

Which do you want to curate? (name, or `all` to walk through each, or `skip`)
```

If `all`, iterate per spec. If a specific name is given, proceed with that feature. If the backlog is empty, ask the human for a feature name as before.

**If invoked WITH `<feature>`**, still check `.nybo/events.jsonl` for `curate_needed` entries matching that spec. If found, surface them as context:
```
Pending memory inputs for <feature> (from curate_needed events):
  - suggestions.md: exists / missing
  - deltas.md: exists (N entries) / missing
  - feedback.md: exists / missing
  - Last curate_needed notes: "<event.details.notes>"
```

After the curation run completes successfully, emit a `curate_run` event with `{ spec: <feature> }` — subsequent scans treat the `curate_needed` signal as resolved.

---

### curate — 1. Read feedback sources

- Read `docs/<feature>/suggestions.md` from the recently completed feature (includes `## Testing Patterns` from nybo-tdd if present).
- Read `docs/<feature>/feedback.md` if present (produced by human review). Look for inline tags: `[CONFIRMS: ...]`, `[VIOLATES: ...]`, `[NEW CONVENTION candidate: ...]` — these are pre-classified and should be routed directly to Step 2 without re-asking.
- Read any files under `docs/<feature>/evidence/` for additional context.
- **Check for `docs/<feature>/deltas.md`**: If present, read it. For each delta entry:
  - Note rationale and affected domains as context for why the spec changed.
  - Surface any "Impact on memory" flags as priority review items in Step 2.
  - For fix-mode entries, note the root cause — it may reveal a missing convention that would have prevented the bug.

---

### curate — 2. Classify each finding

For each item in suggestions.md, feedback.md, and deltas.md, classify it as:

| Classification | Action |
|---|---|
| **New convention** | Add to the appropriate domain file in `.nybo/memory/domains/` |
| **CLAUDE.md patch** | Update CLAUDE.md or AGENTS.md with the new guidance |
| **Skill candidate** | Propose extracting a reusable skill to `.nybo/skills/` |
| **Deprecated pattern** | Mark an existing convention as deprecated in its domain file |
| **Delta finding** | Review stale convention flags from `deltas.md` "Impact on memory" sections; propose updates or deprecations |
| **No action** | Informational only — acknowledge and skip |

---

### curate — 3. Present patches interactively

For each classified finding:
1. Show the proposed change:
   - For conventions: the exact line to add and which domain file.
   - For CLAUDE.md patches: the section and content to add/modify.
   - For skill candidates: the skill name and brief description.
   - For deprecations: which convention and the retirement reason.
2. Ask the human: "Apply this patch? (yes / no / edit)"
3. If "edit": accept the human's modified version and apply that.
4. If "no": skip and move to the next finding.

---

### curate — 4. Apply approved patches

For each approved patch:
- **Convention:** Append to `## Conventions` in the target domain
  file with full metadata:
  `<!-- added: YYYY-MM-DD | feature: <feature> | confidence: <level> | verified: YYYY-MM-DD -->`
- **CLAUDE.md patch:** Edit `CLAUDE.md` or `AGENTS.md` as specified.
  Ensure the auto-generated header is preserved.
- **Skill candidate:** Log it for later extraction by the
  extract mode. Do not create the skill file directly.
- **Deprecation:** Move the convention to `## Deprecated` in its
  domain file with retirement metadata.

---

### curate — 5. Log events

After all patches are applied:
- Log `memory_patched` event for each convention or deprecation change.
- Log `skill_extracted` event for each skill candidate identified.
- Include the feature name and patch count in event details.
- Confirm: "Curated <N> findings: <N> conventions, <N> patches,
  <N> skill candidates, <N> deprecations."

---

### curate — 6. Advance spec status

After events are logged, advance the spec out of the Verified column so
the dashboard reflects "knowledge extracted, ready to PR":

- Read `docs/<feature>/status.yaml`.
- If the current `status` is `verified` or `confirmed`:
  - Set `status: pr-ready`
  - Set `curated_at: <YYYY-MM-DD>` (today's date)
  - Write the file back.
  - Log a `status_advanced` event to `.nybo/events.jsonl` with
    `{ spec: <feature>, from: <previous status>, to: "pr-ready" }`.
- If the current `status` is anything else (e.g., `pr-ready`, `shipped`,
  `draft`): skip silently — curate is idempotent and must not regress
  the state of already-shipped or not-yet-verified specs.
- If `docs/<feature>/status.yaml` is missing: emit a single warning line
  ("no status.yaml found for <feature> — skipping status advance") and
  continue; do not fail the curate run.

Once this step lands, the `nybo dashboard` `gh`-based PR detector
(in `src/services/dashboard/data.ts`) will query the spec's `branch:`
field on the next render and move the card to **Shipped** automatically
when the PR merges.

---

### curate — File Locations

- **Input:** `docs/<feature>/suggestions.md`, `feedback.md`, `docs/<feature>/evidence/`
- **Domain files:** `.nybo/memory/domains/<name>.md`
- **Config files:** `CLAUDE.md`, `AGENTS.md`
- **Event log:** `.nybo/events.jsonl`

---

### curate — What This Mode Does NOT Do

- **Generate feedback** — feedback comes from human review or the
  execution agent's suggestions.md output.
- **Create skills directly** — it identifies candidates; use the
  extract mode to create the actual skill files.
- **Auto-apply patches** — every change requires human approval.

---

## Mode: extract

Analyze a completed implementation to identify reusable patterns and capture them as **project skills** in `.nybo/skills/`.

---

### extract — 1. Load context

- Resolve the **feature name** `<n>` from the user.
- Read **`docs/<n>/spec/spec.md`**. If not found, check `docs/status.yaml` for the feature and warn.
- Read **`feedback.md`** in `docs/<n>/feat/` for lessons captured.
- Read all files under **`docs/<n>/evidence/`**.
- Read **`docs/<n>/suggestions.md`** for follow-up items.
- Read **`.nybo/memory/CORE.md`** and **`.nybo/foundation/conventions.yaml`**.
- List existing skills in **`.nybo/skills/`** to avoid duplicates.

---

### extract — 2. Analyze the implementation

Examine source code files touched by the spec (from evidence diffs or `progress.md`). Look for:

| Category              | What to look for                                                    |
| --------------------- | ------------------------------------------------------------------- |
| **Service creation**  | Repeated service class structure, dependency injection, lifecycle    |
| **API routes**        | Route definition pattern, middleware chain, request/response shape   |
| **Component structure** | Reusable component layout, props pattern, state management        |
| **Data models**       | Entity definition style, validation approach, relation patterns     |
| **Error handling**    | Error class hierarchy, error boundary patterns, retry logic         |
| **Testing**           | Test file structure, fixture setup, mock patterns                   |

Discard patterns that appear only once and are feature-specific.

---

### extract — 3. Draft skill proposals

For each reusable pattern, draft a proposal:

\`\`\`
Pattern: <short name>
Description: <one sentence>
Files: <source files that exemplify the pattern>
Template: <the generalised structure>
Validation: <how to verify correct use>
\`\`\`

Aim for 2–6 proposals — quality over quantity.

---

### extract — 4. Present proposals

\`\`\`
Extracted patterns:
1. [Service creation] singleton-service — Singleton with DI and health check (y/n)
2. [API routes] crud-route — Standard CRUD route with validation (y/n)
\`\`\`

**CHECKPOINT:** "Which should become project skills? (y/n per item)"

---

### extract — 5. Generate approved skills

For each approved pattern, write a file to **`.nybo/skills/<skill-name>.md`** using this **exact format**:

\`\`\`markdown
# <skill-name>
> Added: <YYYY-MM-DD> | Feature: <feature-name> | Usage count: 0
> Last updated: <YYYY-MM-DD>

## When to Apply
<!-- Conditions under which this skill should be used -->

## Pattern
<!-- Description of the pattern -->

## Reference Implementation
<!-- Path to an existing file that demonstrates this pattern -->
file: <path/to/reference-file>

## Template
<!-- Code template with {{placeholders}} -->

## Validation Steps
<!-- How to verify the pattern was applied correctly -->
1. ...
2. ...
\`\`\`

#### Required sections

- **`## When to Apply`** — conditions for using the skill
- **`## Pattern`** — description of the reusable pattern
- **`## Reference Implementation`** — path to an exemplar file (see below)
- **`## Validation Steps`** — numbered steps to verify correct application

#### Optional sections

- **`## Template`** — code template with `{{placeholders}}`

#### Reference Implementation (Required)

Every skill **must** include a `## Reference Implementation` section with a valid `file:` path.
The `file:` value must point to an actual file in the codebase. Verify it exists before writing the skill. If it does not, ask the user to confirm the correct path.

#### Header format

The first `>` line MUST follow this format exactly:
\`\`\`
> Added: YYYY-MM-DD | Feature: <name> | Usage count: <number>
> Last updated: YYYY-MM-DD
\`\`\`

---

### extract — 6. Write extraction log

Write **`docs/<n>/feat/extraction.md`** containing:

- List of patterns analysed (including rejected ones with reason).
- Skills created (names and paths).
- Date and feature name.

---

### extract — 7. Confirm

Tell the user how many skills were created and where. Skills will be
picked up automatically by `nybo-run` and `nybo-plan` in
future features.

---

## Mode: conventions

Manage project conventions in `.nybo/memory/domains/` with metadata tracking (added date, feature, confidence, verification date).

**Sub-commands:**

- **add** — Input: convention text, domain name, feature, confidence. Append as bullet under `## Conventions` in the domain file. Stamp metadata: `<!-- added: YYYY-MM-DD | feature: <name> | confidence: high|medium|low | verified: YYYY-MM-DD -->`. Create domain file from template if missing.
- **verify** — Input: domain, convention. Update `verified:` date to today. Optionally update confidence level.
- **retire** — Input: domain, convention, reason. Move to `## Deprecated` section with `<!-- retired: YYYY-MM-DD | reason: <reason> -->`.
- **audit** — Scan all domains. Report: total conventions, stale (>90d red), warning (60-90d yellow), fresh (<60d green). Flag contradictions across domains. Per-domain breakdown.
- **promote** — Move a convention to `## Universal Conventions` in CORE.md. Warn if at line limit (`core_max_lines` from config, default 50).

**Staleness thresholds:** green <60d, yellow 60-90d, red >90d.
**Does NOT:** auto-retire (requires human judgment), edit patterns/gotchas (managed manually).

---

## Mode: domains

Manage domain knowledge files in `.nybo/memory/domains/`.

**Sub-commands:**

- **create** — Input: name, description. Create domain file with `# Domain:`, `## Conventions`, `## Patterns`, `## Gotchas` sections. Add to `domains.yaml` and `CORE.md`.
- **split** — Input: source, new name, items to move. Move selected conventions/patterns (preserving metadata) to a new domain file. Update registry.
- **merge** — Input: source, target. Move all items from source into target. Delete source file. Update `domains.yaml` and `CORE.md`.
- **audit** — Scan all domains. Report convention count, staleness (green <60d, yellow 60-90d, red >90d), line count. Flag oversized domains as split candidates.

**Does NOT:** rename domains (use split/merge), edit individual conventions (use conventions mode), or auto-split.

---

## Mode: adr

Manage Architectural Decision Records in `.nybo/foundation/adrs/` with YAML frontmatter.

**Lifecycle:** `PROPOSED → IN REVIEW → ACCEPTED → DEPRECATED → SUPERSEDED`. ADRs are never deleted — supersede with a reference to the replacement.

**Sub-commands:**

- **create** — Input: title, context, decision, consequences. Auto-numbers as ADR-NNN. Creates `.nybo/foundation/adrs/ADR-<NNN>-<slug>.md` with frontmatter (`id`, `title`, `status: proposed`, `date`, `superseded_by: null`) and sections (Status, Context, Decision, Consequences). Log `adr_created` event.
- **transition** — Input: ADR id, target status. Validates allowed transitions. If superseding, updates the old ADR's `superseded_by` field. Log `adr_transitioned` event.
- **list** — Display summary table of all ADRs (id, status, date, title). Flag ADRs >6 months in ACCEPTED as candidates for review.
- **check** — Used by `nybo-plan`: read ACCEPTED ADRs, compare against feature description, flag relevant or potentially violated ADRs.

---

## Mode: changelog

Generate a changelog from completed specs and events.

**Input:** date range (default: last 30 days), optional sprint name.

**Steps:**
1. Read `.nybo/events.jsonl`, filter by date range, group by spec.
2. For each spec: extract title, action type (ADD/FIX/UPD), PR URL.
3. Read `docs/status.yaml` and check for `release_version` fields on shipped specs. If release versions are present, group changelog entries by version (e.g. "## v1.2.3"). If no release versions are set, fall back to date-range grouping.
4. Include deployment status (`deployed_to`) as a badge next to each entry when available.
5. Format as changelog grouped by Features / Fixes / Updates with stats (specs completed, PRs merged, conventions added).
6. On approval, write to `docs/changelog/<date-range>.md`. Log `changelog_generated` event.

---

## Trust Level Behavior

Read the current trust level from **`.nybo/nybo.config.yaml`** (field `trust.level`) or **`.nybo/trust.yaml`** (field `level`). Adjust checkpoint frequency based on the level:

### Lite edition (supervised/autonomous)

| Mode | curate | extract | conventions | domains | adr | changelog |
|---|---|---|---|---|---|---|
| **supervised** | Always interactive — every patch requires approval. | Present all proposals, wait for explicit selection. | Pause for confirmation before every write. | Pause for confirmation before every write. | Pause for confirmation before every write. | Present changelog for review before writing. |
| **autonomous** | Always interactive — curation is never fully automated. | Auto-extract and save all qualifying patterns. | Batch changes, confirm once at end. | Batch changes, confirm once at end. | Batch changes, confirm once at end. | Auto-generate and write changelog. |

**Note:** The curate mode is always interactive regardless of trust level — knowledge curation is too important to automate.

If the trust level is not set or unrecognised, default to **supervised** behavior (most conservative).

---

## Next Steps

- Use different modes within this skill to manage the full knowledge lifecycle:
  - `curate` to process feedback after a feature ships.
  - `extract` to capture reusable patterns as project skills.
  - `conventions` to add, verify, retire, or audit conventions.
  - `domains` to organize domain knowledge files.
  - `adr` to manage architectural decision records.
  - `changelog` to generate changelogs from completed work.
- Start a new feature with `/nybo-plan`.
