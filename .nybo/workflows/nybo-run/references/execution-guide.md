# Execution guide (TDD and progress)

## TDD workflow

1. **Write a failing test** — Add or extend a test that expresses the desired behavior. Use the project's test framework and read `docs/<feature>/contract/contract.md` as a guide. Run tests and confirm the new test fails (red).

2. **Implement the minimum code** — Write the smallest change that makes the new test pass. Do not add behavior beyond what the test requires. Run tests and confirm they pass (green).

3. **Refactor** — If the new code duplicates logic or violates conventions, refactor. Keep tests green. Respect the file size limit; split into modules if a file would exceed it.

4. **Repeat** — Move to the next behavior/contract until the task is complete.

## Blocked tasks

- If a task depends on something missing (e.g. an API, a design decision, or another team's deliverable), do not block the whole run.
- In **`docs/<feature>/feat/99-progress.md`**, mark the task with a note: `[ ] Task name — BLOCKED: <reason>`.
- Continue with other tasks. When the user unblocks, you can resume that task in a later run.

## Updating progress

- Use the format described in **`progress-format.md`**.
- After completing a task: change `[ ]` to `[x]` for that task and add a short note if useful (e.g. files touched, test count).
- Keep notes concise so the human can scan quickly.
