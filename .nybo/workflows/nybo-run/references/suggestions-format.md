# suggestions.md format

**Location:** `docs/<feature-name>/suggestions.md`

**Purpose:** Post-implementation suggestions for the human: quick wins, future work, tech debt, and open questions. Use stable IDs (e.g. `[S001]`) so they can be referenced in follow-up work or verification.

**Format:**

## Quick Wins
- **[S001]** Short description of a small improvement that could be done soon.
- **[S002]** Another quick win.

## Future Enhancements
- **[S003]** Larger enhancement or feature idea for later.
- **[S004]** Another enhancement.

## Technical Debt
- **[S005]** Description of debt or shortcut taken and how to address it.
- **[S006]** Another item.

## Questions for the Human
- **[S007]** Question or decision needed from the product/tech lead.
- **[S008]** Another question.

**Rules:**

- Use sequential IDs: `[S001]`, `[S002]`, … (or `S001`, `S002` if you prefer; be consistent).
- One suggestion per bullet. Keep each line concise; add a second line only if needed for context.
- Generate this file after all tasks are complete during nybo-run; leave sections empty if there are no items.
