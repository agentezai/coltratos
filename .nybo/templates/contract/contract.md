# TDD Contract: {Feature Name}

Markdown TDD guide for nybo-run. The Executor Agent reads this file and writes failing tests
before implementing each task (Red phase), then implements (Green), then refactors (Refactor).

---

## Task T1: {Task Title}

### Behavior: {Behavior name} (REQ-001)

**Given** {precondition}
**When** {action}
**Then** {expected result}

**Test file:** `{suggested path, e.g. src/__tests__/feature.test.ts}`
**Framework:** {vitest | jest | etc — from .nybo/memory/CORE.md stack}

---

### Behavior: {Behavior name} (REQ-002, RN-001)

**Given** {precondition}
**When** {action}
**Then** {expected result}

**Test file:** `{suggested path}`
**Framework:** {framework}

---

## Task T2: {Task Title}

### Behavior: {Behavior name} (REQ-003)

**Given** {precondition}
**When** {action}
**Then** {expected result}

**Test file:** `{suggested path}`
**Framework:** {framework}

---

{Repeat for each task and behavior that must be verified.}
