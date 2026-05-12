---
name: nybo-plan
description: >-
  Consolidated planning skill. Supports five modes:
  create (new feature spec), edit (revise an existing spec),
  design (capture design context), fix (post-ship bug spec),
  and audit (retroactive spec for shipped code).
  Activate with the desired mode:
  "/nybo-plan create", "/nybo-plan edit", "/nybo-plan design",
  "/nybo-plan fix", or "/nybo-plan audit".
---

> **Agent:** nybo-planning · **Model:** Opus 4.7 (`claude-opus-4-7`)
> Switch now: `/model claude-opus-4-7`

# nybo-plan

A single planning skill with five modes. Each mode contains the complete workflow from its corresponding full-edition skill.

---

## Mode dispatch

Determine the mode from the user's invocation or intent:

| Mode | Trigger phrases | What it does |
|------|----------------|--------------|
| `create` | "spec", "feature", "plan a feature", "let's build", "new feature" | Create a new feature specification |
| `edit` | "edit spec", "revise spec", "change spec", "update the plan for", "scope changed" | Revise an existing in-progress spec |
| `design` | "design context", "Figma", "wireframe", "acceptance criteria" | Capture and structure design context |
| `fix` | "fix", "bug", "regression", "broken after merge", "something broke in" | Create a minimal fix spec for a post-ship bug |
| `audit` | "audit", "document existing", "retroactive spec", "spec shipped feature", "spec what's built" | Document an already-shipped feature with improvement suggestions |

If the mode is ambiguous, ask: "Which planning mode? create / edit / design / fix / audit"

Then execute the corresponding section below in full.

**Persona:** resolve `--persona=<id>` → invoking agent's `persona:` frontmatter → catalog default at `.nybo/foundation/personas.yaml`. Apply the knobs (interview depth, spec sections, diagrams, task granularity, verbosity, tone) to every step below — full table at `.claude/rules/nybo-personas.md`.

---

## Agent Role

nybo-plan is the **Planning Agent** in the AI-First SDLC:

| Agent | Phase | What they do |
|---|---|---|
| Planning Agent (you) | Define | Co-create quality contextual specs ready for Executor Agents |
| Executor Agent | Implement | Execute plans task-by-task via nybo-run |
| Guardian Agent | Verify | Guarantee delivery quality via nybo-verify |
| Curator Agent | Curate | Learn from each cycle via nybo-curate |

**Key SDLC rules:**
- SDDs are immutable once approved — changes create a new version, not edits
- Every requirement traces: `F-xx (requirement.md) → AC-xxx (requirement.md) → TC-xxx (spec.md)`
- Performance goals are gate criteria — measurable and verified during the Guardian phase
- Specs must be complete enough for an Executor Agent to pick up without asking questions

---

## Mode: create

Create a feature specification: load context, run discovery, generate the spec with diagrams and contracts, then checkpoint before marking approved.

### create / 1. Read project context

- Read **`.nybo/nybo.config.yaml`** for adapter settings and project config.
- Read **`.nybo/memory/CORE.md`** (always) for project summary, stack, and design principles.
- Check for **`.nybo/foundation/design-principles.yaml`**, **`.nybo/foundation/security.yaml`**, and note any gaps to the user.

### create / 2. Search prior context

- List **`docs/`** (create if missing). Scan feature subdirs for same or related domains.
- Read relevant domain memory under **`.nybo/memory/domains/`** (use `.nybo/foundation/domains.yaml` for names/paths).
- Flag staleness: if conventions or domain docs are >90 days old, warn the user.
- Identify applicable **workflow skills** (`.nybo/workflows/`) and **project pattern skills** (`.nybo/skills/`). Reference both in the spec.
- Read `.nybo/foundation/integrations.yaml` if it exists. For each MCP entry relevant to this feature's domain, list it in the spec's Dependencies under a `- **MCPs**:` bullet. Omit the bullet if no relevant MCPs exist.
- **Check ADRs:** Read ACCEPTED ADRs from `.nybo/foundation/adrs/` (if the directory exists and contains files). Flag any ADR whose decision or context is relevant to the feature being planned. If an ADR might constrain the technical approach, surface it to the user before proceeding with design.

### create / 2b. Scan for project-level requirement doc

Glob repo root (case-insensitive) for `requirement.md`, `requirements.md`, `prd.md`, `PRD.md`, or `requirements/requirement.md`. If found: read it, extract features from `##` sections or `F-xx` entries (each = one candidate), present ordered list — *"Found `<file>`. I see N features: [slug — summary …]. Plan in this order? Adjust or exclude before we start."* — wait for confirmation, store the queue, **set multi-feature mode: active**. If not found: skip to step 3.

### create / 3. Discovery interview

**If multi-feature mode is active** (step 2b): skip this interview — use the requirement doc section as source, jump to step 3b.

Ask the human (concise; can be one message with bullets):

- **Business outcome**: What is the business outcome we're enabling?
- **Who benefits**: Who benefits, and what does success look like?
- **Constraints and edge cases**: What are the constraints (performance, compliance, integrations) and important edge cases?
- **Design references**: Are there Figma designs, user journeys, or other references to align with?
- **Atomic increments**: Can any part ship independently? Are there distinct phases (e.g. data model first, then UI)?

Incorporate their answers into the spec. If they skip a question, infer where reasonable and call out assumptions.

### create / 3b. Atomic spec design

**A feature can and should have multiple specs.** Each spec must be atomic: small, independently reviewable, implementable, and verifiable in isolation. Before generating files, ask: Do distinct parts ship independently? Are there phases (foundation → UI)? Different actors? Default to splitting when: feature count > 2, estimated tasks > 6, scope spans independent actors/axes, or > 2 screens. Show proposed splits with dependency order: "I see N atomic specs — [list]. Proceed or adjust?"

**On split**: full directory per spec (spec/, feat/, contract/, status.yaml — step 11). Wire `dependencies.blocking`/`dependencies.blocks` across specs.
**On single spec**: confirm it's genuinely atomic. Note reason in `status.yaml` `notes`.

### create / 3c. Compact spec principle

Each spec is one atomic increment — small enough to review in one sitting. Skip requirement.md sections unless clearly needed: S2 only if ≥ 2 features; Gantt only if parallel delivery constraints; state/flow diagrams only if ≥ 3 states or ≥ 4-step automation; exception scenarios only for security/financial/compliance; S5 only if UI exists; S6 only if blockers exist. Target: requirement.md ≤ 120 lines · spec.md ≤ 80 lines. Delete empty sections.

### create / 3d. Multi-feature sequencing (one at a time)

Active only when multi-feature mode is on (step 2b). For each feature in the confirmed queue: (1) announce *"Planning N of total: `{slug}` — {summary}"*; (2) run steps 4–13 in full using the requirement doc section as source (step 3 Q&A skipped); (3) after step 12 approval, if more remain ask *"`{slug}` approved. Next: `{next-slug}` — {summary}. Continue? (yes / stop)"* — loop on yes, exit on stop; (4) after the last feature (or on stop) present a summary table: slug · `docs/<slug>/spec/spec.md` · status · task count. Close with: *"All specs approved. Say 'implement' to start with `{first-slug}`."*

### create / 4. Generate `docs/<feature>/spec/requirement.md`

Follow the template at **`.nybo/workflows/nybo-plan/references/requirement-template.md`**. This is the source of truth for all product/business information; spec.md points to it.

- **S1 — Overview** — *(required)* 2-3 sentence summary + axes table (what/for whom).
- **S2 — Dependency Map** — *(only if ≥ 2 features)* Mermaid flowchart (color-coded) + Gantt only if parallel delivery time constraints exist + critical path table.
- **S3 — Features** — *(required)* per F-xx: description, actor, priority, screen ref, BR-xxx table, AC-xxx table, optional diagrams.
- **S4 — NFRs** — *(only if non-obvious constraints)* product NFRs with measurable thresholds. Skip if covered by global standards.
- **S5 — Screens** — *(only if UI exists)* Mermaid wireframe + visual description. Skip entirely for backend/API-only features.
- **S6 — Flags** — *(only if blocking items exist)* open decisions blocking dev. Skip if none.

### create / 5. Generate `docs/<feature>/spec/spec.md`

Follow the template at **`.nybo/templates/spec/spec.md`**. This is a lean SDD — it references requirement.md; do not repeat business rules, acceptance criteria, or screen descriptions.

- **Source** — link to `requirement.md`.
- **Intention** — 1-2 sentences: what it does, who uses it, business outcome.
- **Use Cases** — table linking to `use-cases.md` (UC-XX format), referencing AC-xxx from requirement.md.
- **Technical Requirements** — implementation constraints not in requirement.md (bundle size, coverage, compatibility). Omit if all constraints are in requirement.md.
- **Test Cases** — numbered `TC-XXX` in Given/When/Then format, referencing AC-xxx.
- **Architecture** — four subsections (omit if not applicable): ADRs, Tradeoffs, Data Model (Mermaid ER), API / Data Contracts, Service Integrations (Mermaid flowchart).

Keep spec.md under **120 lines** — move excess detail to requirement.md or task plan files. Add Mermaid diagrams only when architecture changes.

**Also generate** `docs/<feature>/spec/use-cases.md` (template: `.nybo/templates/spec/use-cases.md`): Actors table, `US-XX` user stories, `UC-XX` scenarios (Main / Alternative / Error).

### create / 6. Generate `docs/<feature>/feat/00-overview.md`

Follow the template at **`.nybo/templates/feature-plan/00-overview.md`**: spec ref link, problem + solution (2-4 bullets), architecture diagram, data model (if new entities), task index table, dependency graph.

### create / 7. Generate `docs/<feature>/feat/01-plan-NN-<task>.md` (one per task)

Follow the template at **`.nybo/templates/feature-plan/01-plan-XX-task.md`**. For each task:

- **Scope** — list of affected files with one-line descriptions.
- **Changes** — grouped by concern (e.g., "Data Layer", "Service Logic", "API Route").
- **Design Rationale** — reference SRP, OCP, or other principle that justifies this task's scope.
- **Dependencies** — which prior tasks must complete first, and why.
- **Done When** — verifiable checklist: tests pass, types compile, exports importable, build succeeds.

Keep each task file under 160 lines. Split if it exceeds this. Task dependency order: **Schema → Services → API Routes → UI → End-to-End**.

### create / 8. Generate `docs/<feature>/feat/10-verify.md`

Follow the template at **`.nybo/templates/feature-plan/10-verify.md`**: per task — Test Scenarios (happy path, edges, errors) and Gate Criteria. End with an End-to-End Verification section (numbered acceptance steps + final gate).

### create / 9. Generate `docs/<feature>/feat/99-progress.md`

Follow the template at **`.nybo/templates/feature-plan/99-progress.md`**. For each task include two sub-items:

```
### TN: {Task Title}
- [ ] Implement Task N: {brief description}
- [ ] Verify Task N: {brief description of verification}
```

### create / 10. Generate `docs/<feature>/contract/contracts.md`

Write a **Markdown TDD guide** — not actual test files. `nybo-run` reads this to write failing tests before implementing each task.

For each behavior that must be tested, write a section with:
- Task reference and behavior name
- Given/When/Then format
- Suggested test file path and framework

```markdown
# TDD Contract: <feature>

## Task T1: <task title>

### Behavior: <behavior name> (REQ-XXX)

**Given** <precondition>
**When** <action>
**Then** <expected result>

**Test file:** `<suggested path, e.g. src/__tests__/feature.test.ts>`
**Framework:** <vitest | jest | etc — from .nybo/memory/CORE.md stack>
```

Respect `.nybo/foundation/security.yaml`: no sensitive data in contracts.

### create / 11. Write to disk

```
docs/<feature>/
    ├── status.yaml                      ← { feature: <feature>, status: draft, profile: code, action_type: ADD, created_at: <ISO date> }
    ├── spec/
    │   ├── requirement.md               ← Product requirement (F-xx, BR-xxx, AC-xxx, SCR-xxx)
    │   ├── spec.md                      ← Lean SDD referencing requirement.md
    │   └── use-cases.md
    ├── feat/
    │   ├── 00-overview.md
    │   ├── 01-plan-01-<task>.md
    │   ├── 10-verify.md
    │   └── 99-progress.md
    └── contract/
        └── contracts.md                 ← Markdown TDD guide for nybo-run
```

Use a feature name that is URL/filesystem-safe (lowercase, hyphens, no spaces). Create directories as needed. The per-feature `docs/<feature>/status.yaml` is a flat YAML (no nesting) — the dashboard reads this file directly. **There is no aggregator `docs/status.yaml`**: lifecycle state lives only in the per-feature file.

### create / 12. Checkpoint

- Present the spec to the human (summary + link to `docs/<feature>/spec/spec.md` and key diagrams).
- Ask: **"Does this spec look right? Say 'approved' to proceed or tell me what to change."**
- If they request changes: update the relevant files, then ask again.
- When approved: update `docs/<feature>/status.yaml` to `status: approved`, `approved_at: <ISO date>`.

Log a `spec_created` event to `.nybo/events.jsonl` with: `spec` = `<feature>`, `task_count`, `domains_referenced` (array of domain file names read in Step 2).

**If multi-feature mode is active:** after logging the event, proceed to step 3d (offer next feature).

### create / 13. Optional: push tasks to Jira

If `.nybo/foundation/integrations.yaml` configures an Atlassian MCP whose `config.jira_project_key` is set, offer to create one Jira issue per task in the Feature Plan. **Opt-in only** — if the human declines, log nothing and continue.

When the human accepts:

1. Read each `docs/<feature>/feat/01-plan-NN-<task>.md` file. The title is the H1; the body is the rendered task content (Scope / Changes / Done When sections).
2. Build a `PlanTask[]` with `{ ordinal, title, body, dependencies }` for each task.
3. Call `recordIssueCreationIntents(rootDir, { specName, actionType, epicKey, tasks }, appendLine)` from `src/services/integrations/jira-issue-creator.ts`. Pass `epicKey` if the spec mentions a parent epic in its frontmatter or summary; otherwise omit.
4. The service writes one `jira_issue_create_attempted` intent line per task into `.nybo/events.jsonl`. Each intent carries: `taskOrdinal`, `projectKey`, `issueType`, `summary`, `labels`, `parentEpicKey`, `mcp`.
5. For each intent, invoke `mcp__atlassian__createJiraIssue` with the prepared payload. Use the summary, description (the task body), `projectKey`, `issueType`, and `labels` from the intent. If the MCP call returns the new issue key, append a follow-up note to the task file: `<!-- Jira: <ISSUE-KEY> -->`.
6. If the MCP call fails for a task, leave the intent in events.jsonl as the durable record and warn the human; do not retry inside this step.

If the Atlassian MCP is absent, the project key is unset, or `recordIssueCreationIntents` returns an empty array, this step is a silent no-op — no events emitted, no warnings.

Required Atlassian token scopes: `read:jira-work`, `write:jira-work`, `create:jira-work`. Document this once in `wiki/agents-and-skills.md` under the Planning agent.

### create / Next Steps

`/nybo-plan edit` — Refine the spec if requirements change. `/nybo-plan design` — Capture design context. `/nybo-run` — Begin implementation.

---

## Mode: edit

Revise an in-progress spec without losing completed work.

### edit / 1. Load the current spec

Read:
- `docs/<feature>/spec/spec.md` — current requirements
- `docs/<feature>/feat/99-progress.md` — done vs pending tasks
- `docs/<feature>/status.yaml` — current status and lifecycle metadata

If not found, tell the user to list `docs/` for the feature. Completed specs cannot be edited — use `/nybo-plan fix` instead.

### edit / 2. Collect the change request

Ask: "What needs to change and why?" Accept free-form description. Do not ask follow-ups unless two reasonable interpretations exist. State assumptions explicitly.

### edit / 3. Classify completed vs pending work

From `docs/<feature>/feat/99-progress.md`, build two lists:
- **Completed tasks** (`[x]`) — immutable.
- **Pending tasks** (`[ ]`) — can be modified, reordered, or removed.

Never modify, remove, or reorder completed tasks.

### edit / 4. Apply the revision

Update `docs/<feature>/spec/spec.md`:
- **Completed tasks**: keep exactly as-is.
- **Pending tasks**: modify, reorder, add, or remove as needed.
- **Dependency graph**: update if task ordering changed.

Updates may also touch `docs/<feature>/feat/` task files and `docs/<feature>/contract/contracts.md`.

Add/append a revision log row:

```markdown
## Revision log
| Date | Change | Reason |
|------|--------|--------|
| <YYYY-MM-DD> | <summary of what changed> | <user's stated reason> |
```

### edit / 5. Update metadata

Update `docs/<feature>/status.yaml`:

```yaml
updated: <ISO date>
revision_count: <previous + 1>
last_revision: <short summary>
```
Do not change `status` — the spec stays in its current state.

### edit / 5b. Write to `docs/<feature>/deltas.md`

Append a new delta entry to `docs/<feature>/deltas.md` (create if absent). Use this append-only format:

```
## Delta YYYY-MM-DD — edit | <short summary>
**Mode:** edit
**Rationale:** <user's stated reason from Step 2, verbatim or faithfully paraphrased>
**Affected domains:** <comma-separated domain names inferred from changed task file paths vs .nybo/foundation/domains.yaml>
### Tasks added
- TN: <title>  (omit section if none)
### Tasks modified
- TN: <what changed>  (omit section if none)
### Tasks removed
- TN: <reason>  (omit section if none)
### Impact on memory
<!-- Flag if a previously-curated convention in the affected domains might be stale given this change -->
- None identified
```

### edit / 6. Update progress file

If tasks were added or removed, update `docs/<feature>/feat/99-progress.md`: new tasks get `[ ]`, removed pending tasks are deleted, completed tasks remain as-is.

### edit / 7. Checkpoint

Present a diff summary (tasks added/modified/removed, scope changes).

**CHECKPOINT:** "Here are the proposed spec changes. Approve to save, or tell me what to adjust."

Wait for approval before writing files.

After writing files, log a `spec_edited` event to `.nybo/events.jsonl` with: `spec` = `<feature>`, `revision_count`, `tasks_added` (count), `tasks_removed` (count), `tasks_modified` (count), `rationale` (short), `affected_domains` (array).

---

## Mode: design

Capture and structure design context so specs are grounded in actual UX.

### design / 1. Load the spec

Read `docs/<feature>/spec/spec.md` and existing design context if any.

### design / 2. Collect design references

Ask the user to provide:
- Figma link or screenshot paths
- User journey or wireframe descriptions
- Component mappings to the existing design system
- Specific acceptance criteria that should be reflected in contracts

### design / 3. Update the spec

Add a `## Design Context` section to `docs/<feature>/spec/spec.md` with:
- Figma/wireframe references (links or file paths)
- Component mappings
- Acceptance criteria per screen or flow

Update `docs/<feature>/contract/contracts.md` if new acceptance criteria imply new behaviors.

### design / 4. Checkpoint

Present the design additions. Ask for confirmation before saving.

---

## Mode: fix

Create a lightweight fix spec for a post-ship bug.

### fix / 1. Identify the bug

**If a Jira issue ID is provided** (e.g. `/nybo-plan fix auth-login PROJ-456`):
- Fetch the issue via `mcp__atlassian__getJiraIssue` (or skip gracefully if Atlassian MCP is not configured)
- Extract: summary, description, reproduction steps, priority, and any attached logs or stack traces
- Present the extracted details to the user: "I found this bug report — confirm or adjust:"
- Use the Jira data to pre-fill the fields below

**Otherwise**, ask the user (one message):
- What is the observed behavior?
- What is the expected behavior?
- Which feature or area is affected?
- Is there a reproduction path?

### fix / 2. Load context

Read the original feature's spec at `docs/<original>/spec/spec.md` if it exists. Read relevant domain memory.
Read any relevant ADRs from `.nybo/foundation/adrs/` that might constrain the fix approach.

### fix / 3. Generate a fix spec (≤3 tasks)

Create files under one nested per-feature directory (use `fix-<feature>-<date>` as the feature name):
- `docs/fix-<feature>-<date>/spec/spec.md` — must include:
  - **Bug description** (observed vs expected behavior)
  - **Root cause** section (diagnosis of why it happened)
  - **Fix approach** (max 3 tasks)
  - **Regression test requirement** (at least one test that would have caught this bug)
  - **Jira reference** (if sourced from a ticket: key, link, priority)
- `docs/fix-<feature>-<date>/feat/99-progress.md` — task checklist with implement+verify per task
- `docs/fix-<feature>-<date>/contract/contracts.md` — TDD guide for the fix tasks (include the regression test)
- `docs/fix-<feature>-<date>/status.yaml` — `status: approved, action_type: FIX, profile: code, created: <ISO date>` (fix specs are pre-approved)

Fix specs skip the discovery interview and approval checkpoint — they go straight to approved.

Also append a fix-mode delta entry to `docs/<original-feature>/deltas.md` (create if absent):

```
## Delta YYYY-MM-DD — fix | fix-<feature>-<date>

**Mode:** fix
**Original feature:** <original-feature>
**Root cause hypothesis:** <one sentence from Step 1>
**Fix approach:** <brief description>
**Affected domains:** <inferred from which domain areas the fix touches>
```

### fix / 4. Confirm

Log a `fix_spec_created` event to `.nybo/events.jsonl` with: `spec` = `fix-<feature>-<date>`, `original_feature`, `root_cause_hypothesis`, `task_count`.

"Fix spec created. Run `/nybo-run fix-<feature>-<date>` to implement the fix."

---

## Mode: audit

Document an already-shipped feature as a structured spec with improvement suggestions. Progressive — one feature at a time.

### audit / 1. Read project context

Same as create / 1 — read `.nybo/nybo.config.yaml`, `.nybo/memory/CORE.md`, foundation files.

### audit / 2. Search prior context

Same as create / 2 — scan `docs/`, read domain memory, check ADRs.

### audit / 3. Identify the feature scope

Ask the user:
- **Feature name**: Which shipped feature or component to document?
- **File scope**: Which files/directories? (or "I'll scan and propose")
- **Pain points**: Known issues or areas for improvement suggestions?

If no file paths given, scan `src/` and propose scope from naming and imports.

### audit / 4. Analyze existing code

- Read source files for structure, dependencies, and behavior.
- Infer data model, API contracts, and service boundaries from types, routes, and imports.
- Check `git log` for feature history. Read existing tests for implicit requirements.

### audit / 5. Generate spec artifacts

Same output as create steps 4–10, **reverse-engineered from code**:
- `docs/<feature>/spec/requirement.md` — inferred features, business rules, AC from code/tests.
- `docs/<feature>/spec/spec.md` — inferred requirements. Intention starts with: *"Retroactively documented from shipped code."*
- `docs/<feature>/spec/use-cases.md` — inferred from routes, handlers, UI flows.
- `docs/<feature>/feat/00-overview.md` — architecture as-built.
- `docs/<feature>/feat/01-plan-NN-<task>.md` — logical groupings of what was built.
- `docs/<feature>/feat/10-verify.md` — existing coverage + gaps.
- `docs/<feature>/feat/99-progress.md` — **all tasks `[x]`** (already shipped).
- `docs/<feature>/contract/contracts.md` — contracts from existing tests.
- `docs/<feature>/status.yaml` — `status: approved, action_type: AUDIT, audited_at: <ISO date>`

Use create templates. Infer from code; call out assumptions.

### audit / 6. Generate `docs/<feature>/suggestions.md`

Categorized improvement ideas: `[QUALITY]`, `[PERFORMANCE]`, `[SECURITY]`, `[REFACTOR]`, `[FEATURE]`. Omit empty categories. One-liner + rationale per suggestion.

### audit / 7. Checkpoint

**CHECKPOINT:** "Does this accurately reflect the implementation? Approve or adjust."

On approval: update `docs/<feature>/status.yaml` to `status: approved`, log `spec_audited` event with `spec`, `task_count`, `suggestion_count`, `domains_referenced`. Confirm: "Audit spec saved. Use `/nybo-plan create` or `/nybo-plan fix` to act on suggestions."

---

## Trust Level Behavior

Read the current trust level from **`.nybo/nybo.config.yaml`** (field `trust.level`) or **`.nybo/trust.yaml`** (field `level`). Adjust checkpoint frequency based on the level:

| Mode | Behavior |
|------|----------|
| supervised | Always checkpoint — present full output, wait for explicit approval before proceeding. Applies to all five modes. |
| autonomous | Auto-approve after generation for create mode. For edit, design, fix, and audit modes: still checkpoint (these are inherently collaborative and require human judgment), but use a streamlined summary rather than full output. |

If the trust level is not set or unrecognised, default to **supervised** behavior (most conservative). Legacy slugs (`observer`, `collaborator` → supervised; `architect` → semi-autonomous) are coerced on read.

---

## File Locations

- **Product requirement (PRD):** `docs/<feature>/spec/requirement.md` (F-xx, BR-xxx, AC-xxx, SCR-xxx)
- **SDD (spec + use cases):** `docs/<feature>/spec/` (spec.md, use-cases.md) — references requirement.md
- **Feature plan:** `docs/<feature>/feat/` (00-overview.md, 01-plan-NN-*.md, 10-verify.md, 99-progress.md, evidence/, suggestions.md)
- **TDD contracts:** `docs/<feature>/contract/contracts.md`
- **Status tracking:** `docs/<feature>/status.yaml` (per-feature file)
- **Templates:** `.nybo/templates/spec/`, `.nybo/templates/feature-plan/`, `.nybo/templates/contract/`
- **Requirement template:** `.nybo/workflows/nybo-plan/references/requirement-template.md`
- **Domain files:** `.nybo/memory/domains/`
- **Config:** `.nybo/nybo.config.yaml`, `.nybo/trust.yaml`
- **Foundation:** `.nybo/foundation/`
