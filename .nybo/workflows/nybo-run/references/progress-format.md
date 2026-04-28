# progress.md format

**Location:** `docs/<feature-name>/feat/99-progress.md`

**Purpose:** Task checklist for the spec. One line per task; checkboxes show done vs pending.

**Format:**

- Use Markdown checkboxes: `- [ ]` for not done, `- [x]` for done.
- One task per line. Optional short note after the task text (e.g. `- [x] Add auth middleware (auth.middleware.ts)`).
- You may group tasks under headings (e.g. `## Backend`, `## Frontend`, `## Tests`).
- For blocked tasks, append a note: `— BLOCKED: <reason>` and keep the checkbox unchecked.

**Example:**

```markdown
# Progress: user-auth

## Backend
- [x] Add login endpoint and validation (auth.controller.ts)
- [x] Add token refresh (auth.service.ts)
- [ ] Add rate limiting — BLOCKED: waiting on config

## Frontend
- [ ] Login form and error handling
- [ ] Store token and attach to API client
```

Update this file after each task during nybo-run execution.
