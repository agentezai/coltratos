# T3: Heuristic Categorizer

## Scope

- `lib/ingestion/categorize.ts` - new file: `matchSection(line)` + `normalizeForMatch(s)` + the regex pattern table
- `lib/ingestion/__tests__/categorize.test.ts` - new file: unit tests for header detection, the mandatory normalization formula, and fallback behavior

## Changes

### Mandatory normalization formula (REQ-005, RN-005)

```typescript
export function normalizeForMatch(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
```

This formula is **fixed**. Patterns are authored against the normalized form; raw patterns like `/CAPACIDAD\s+JURÍDICA/i` are forbidden. The categorizer applies `normalizeForMatch` to every input line **before** regex testing.

### Public functions

- `matchSection(line: string): SegmentoCategoria | null` — returns the categoría when the normalized line matches a header family, `null` otherwise. `null` means "this is body content, not a header". Internally calls `normalizeForMatch` first.
- `normalizeForMatch(s: string): string` — exported so the segmenter (T4) can reuse the same formula when computing `headingNormalized` for output, guaranteeing the persisted normalized form matches what was tested against.

### Pattern table

Single declarative table with priority order. First match wins; this priority is documented in source comments.

| Priority | Family | Regex (against `normalizeForMatch(line)`) | Categoria |
|----|----|----|----|
| 1 | Capacidad jurídica | `/\bcapacidad\s+juridica\b/` | `juridico` |
| 2 | Capacidad financiera | `/\bcapacidad\s+financiera\b/` | `financiero` |
| 3 | Capacidad técnica | `/\bcapacidad\s+tecnica\b/` | `tecnico` |
| 4 | Experiencia | `/\bexperiencia\b/` | `experiencia` |
| 5 | Requisitos habilitantes | `/\brequisitos\s+habilitantes\b/` | `general` (umbrella header — content under it is general until a sub-category header is matched) |

### Design notes

- Patterns are **word-boundary-anchored** so phrases like "experiencia mínima" still match `experiencia` but only when the line is header-like; T4 owns the "is this line a header?" gate (≤80 chars, etc.).
- T3 does NOT decide whether a line is "header-shaped" — only which categoría a line maps to **if** it's a header. T4 owns shape detection. This separation keeps T3 trivially testable.
- Returning `null` is distinct from emitting a `general` segment: `null` from `matchSection` means "not a header"; a `general` segment is the segmenter's fallback when content lives under no recognized header (and is paired with `isSynthetic: true`).

### Design Rationale (Single Responsibility)

The categorizer is a pure mapping function — input string, output enum or null. It owns no state and emits no segments. Replacing regex with a small classifier later is one file's worth of work.

## Dependencies

Requires T1 — imports `SegmentoCategoria` from `@/types`. Independent of T2; can run in parallel.

## Done When

- [ ] `matchSection` and `normalizeForMatch` exported from `lib/ingestion/categorize.ts`.
- [ ] `normalizeForMatch('JURÍDICA') === 'juridica'` (asserted by unit test).
- [ ] Table-driven test covers each pattern with three accent/case variants and asserts the correct categoría.
- [ ] Lines that don't match any pattern return `null` (not `'general'`).
- [ ] No raw `/...../i` (case-insensitive flag) patterns in the source — patterns operate on normalized text only (asserted by a grep test).
- [ ] No imports from `@supabase/*`, `node:fs`, `node:net`, `node:http`, or any logger.
- [ ] File stays under 200 lines.
