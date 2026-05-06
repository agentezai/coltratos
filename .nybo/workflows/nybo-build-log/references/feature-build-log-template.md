# Feature Build Log — {{feature_title}}

A chronological record of every decision and implementation step taken to build this feature. Written so another developer can replicate the work or understand the reasoning behind each choice.

---

## 1. Feature Goal

{{goal_paragraph — 1-3 sentences: what changed and why. Replace generic verbs with what the feature actually does.}}

When the feature is exercised end-to-end:

- {{outcome bullet 1 — observable behavior or state change}}
- {{outcome bullet 2}}
- {{outcome bullet 3}}

---

## 2. Codebase Discovery (before writing a line of code)

Before planning, the codebase was read to understand what already existed.

**Key findings:**

| Finding | Detail |
|---------|--------|
| {{finding 1 — e.g., "No schema migration needed"}} | {{evidence — file path and what was already there}} |
| {{finding 2 — e.g., "Reusable connector"}} | {{evidence with file:line reference}} |
| {{finding 3}} | {{evidence}} |
| {{finding 4}} | {{evidence}} |

> Source: spec discovery section, brownfield scan results, or notes captured during `/nybo-plan`. Omit rows that were not captured — leave the table small rather than padded.

---

## 3. Architecture Decisions

One subsection per non-trivial decision made during planning or implementation. Each decision states the option chosen and the reason it was preferred over the alternatives.

### 3.1 {{decision title — e.g., "Server-side filtering, not client-side"}}

**Decision:** {{what was chosen, in one sentence}}

**Why:** {{reason — constraint, performance, consistency, prior incident, etc.}}

### 3.2 {{decision title}}

**Decision:** {{...}}

**Why:** {{...}}

### 3.3 {{decision title}}

**Decision:** {{...}}

**Why:** {{...}}

> Add or remove subsections to match the actual decisions taken. Skip this section entirely only when the implementation was mechanical (no architectural choice). When a decision was reversed mid-build, include the original draft and the corrected approach with the reason for the switch.

---

## 4. Files Created or Modified

### New files

| File | Purpose |
|------|---------|
| `{{path}}` | {{one-line purpose}} |
| `{{path}}` | {{one-line purpose}} |

### Modified files

| File | Change |
|------|--------|
| `{{path}}` | {{summary of the change — not a diff}} |
| `{{path}}` | {{summary}} |

> Source: `evidence/diff-summary.md`. Group by surface (backend / frontend / config / tests) only if the diff is large enough to justify it.

---

## 5. Step-by-Step Implementation

The order in which the work was actually executed. One step per logical unit (usually one task plan from `feat/01-plan-NN-*.md`).

### Step 1 — {{step title}}

{{1–3 sentences describing what was added and why this came first.}}

```{{language}}
{{minimal code excerpt that captures the shape of the change — type signature, schema, key constant, or 5–10-line implementation snippet}}
```

{{1–2 follow-up bullets if needed — caveats, dependencies on later steps, etc.}}

---

### Step 2 — {{step title}}

{{prose}}

```{{language}}
{{snippet}}
```

---

### Step 3 — {{step title}}

{{prose}}

> Continue numbering for as many steps as the build had. Each step should be runnable in isolation — if step 3 depends on step 2's exports, say so.

---

## 6. Tests Written

### Unit tests — `{{test file path}}`

| Test | What it checks |
|------|----------------|
| {{test name}} | {{1-line assertion summary}} |
| {{test name}} | {{...}} |

### Integration tests — `{{test file path}}`

| Test | What it checks |
|------|----------------|
| {{test name}} | {{...}} |
| {{test name}} | {{...}} |

> Add an E2E table only if E2E tests were written. Skip a section when no tests of that kind were added — do not invent rows.

---

## 7. What to Watch Out For

Operational and edge-case warnings for the next person who touches this code.

- **{{env var or runtime dep}}** — {{what happens if it's missing or wrong}}
- **{{external service or feature flag}}** — {{prerequisite for the feature to work}}
- **{{cache or eventual-consistency caveat}}** — {{TTL, invalidation rule, expected staleness}}
- **{{edge case the implementation does not handle}}** — {{degraded behavior the user will see}}

> Source: spec `Risks` section, `evidence/code-review.txt`, plus anything surprising discovered during `/nybo-verify`. Keep it concrete — no generic "test before deploying" filler.

---

## 8. Final Test Count

```
{{verbatim summary line(s) from evidence/test-results.txt — e.g.:
Test Suites: NN passed, NN total
Tests:       NNN passed, NNN total}}
```

{{N}} new tests added ({{N_unit}} unit + {{N_integration}} integration), {{regressions_summary — e.g. "zero pre-existing tests broken" or "1 flaky test quarantined, see TODO-####"}}.
