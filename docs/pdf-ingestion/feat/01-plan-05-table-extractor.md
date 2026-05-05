# T5: Table Extractor (pdfplumber via subprocess)

## Scope

- `lib/ingestion/tables.ts` — new file: `extractTables(buffer, page_number)` invokes pdfplumber via subprocess
- `scripts/python/extract_tables.py` — new file: Python helper invoked as a subprocess; reads PDF bytes from stdin (or a temp path), writes JSON to stdout
- `lib/ingestion/__tests__/tables.test.ts` — new file: unit tests against synthetic 2-col and 3-col fixtures with stubbed subprocess

## Changes

### Public function

`extractTables(buffer: Buffer, page_number: number): Promise<TableJson[]>`

Invokes the pdfplumber subprocess with the buffer and page number, parses the JSON output, returns `TableJson[]` (one entry per detected table; each `TableJson.rows` is `string[][]`).

### Subprocess invocation

- The Python helper is at `scripts/python/extract_tables.py`. The Node side spawns a `python3` (or `python`) subprocess with the script path; passes the PDF bytes via stdin (or via a temp file path on disk if stdin proves unreliable for large PDFs — the helper accepts either).
- The helper outputs JSON-lines: one line per table, each `{ "page": N, "rows": [[...], [...]] }`.
- ADR-008 sub-decision: subprocess vs Lambda vs sidecar — **subprocess wins** for MVP.

### Per-page failure handling (REQ-016)

- If pdfplumber throws on a particular page (rare — usually due to malformed table structure), the per-page failure is caught and the page surfaces with `flags` including `'table_parse_failed'`, `tables: []`. **The whole ingestion does not fail on a per-page table issue.**
- Tests: subprocess returns non-zero exit → catch + flag, do not throw.
- Whole-PDF subprocess failures (Python not installed, script missing) → `TableParseFailedError(cause)` — this is a configuration error, not a per-page table issue.

### Why subprocess and not in-process Python

This file (`tables.ts`) is under `lib/ingestion/` and is bound by NFR-03 (no `node:fs`, no logger, etc.). The subprocess invocation goes through `child_process` which IS allowed (no NFR-03 prohibition on `child_process`). The Python helper itself is bundled with the worker container at deploy time (Railway/Fly.io); it is not part of the Vercel build.

### Caveat re. NFR-03

Spawning a subprocess uses `node:child_process`, not `node:fs` directly — but if temp-file fallback is used (instead of stdin) it would touch the filesystem. **Decision: prefer stdin to keep `node:fs` out of `lib/ingestion/`**. If stdin proves unreliable on large PDFs, a follow-up adds a temp-file fallback under `src/services/ingestion-worker/` (NOT `lib/`), and `lib/ingestion/tables.ts` calls into the worker's I/O helper through a port. Document this as a v1.1 candidate in `suggestions.md` if it materializes.

### Design Rationale

T5 isolates the Python integration so the rest of the codebase never imports pdfplumber directly. Swapping pdfplumber for camelot or tabula later means changing one file + one Python script.

## Dependencies

Requires T1 (uses `TableJson`, `TableParseFailedError`).

## Done When

- [ ] `extractTables(buffer, page_number)` exported from `lib/ingestion/tables.ts`.
- [ ] `scripts/python/extract_tables.py` exists and is invoked via subprocess.
- [ ] 2-column synthetic fixture produces a TableJson with `rows[0].length === 2`.
- [ ] 3-column synthetic fixture produces a TableJson with `rows[0].length === 3`.
- [ ] Per-page subprocess failure → caller (T6) sets `'table_parse_failed'` flag (asserted in T6 tests).
- [ ] Whole-script failure → `TableParseFailedError`.
- [ ] No `node:fs` import in `lib/ingestion/tables.ts` (stdin only); subprocess invocation via `node:child_process` is acceptable per NFR-03.
- [ ] File `tables.ts` stays under 250 lines; Python script under 150 lines.
