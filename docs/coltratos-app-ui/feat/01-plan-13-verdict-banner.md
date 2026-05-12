# T13: Verdict banner refinement (real data)

## Scope

| File | Change |
|------|--------|
| `app/dashboard/analisis/[id]/_components/verdict-banner.tsx` | **Refactor** — replace mock-shaped props with `AnalysisDetail` |
| `src/components/ui/sem-pill.tsx` | Extend — accept canonical (`verde`/`amarillo`/`rojo`) values per RN-002 |

## Requirements

REQ-012, RN-002, RN-006.

## Changes

### Banner contents

- **Semáforo circle (72px)** — color from `overallVerdict`: `verde` → green, `amarillo` → amber, `rojo` → red. `null` → loading skeleton (REQ-028 loader takes over upstream so this branch should not normally render).
- **State title** — `verde` → "Cumple", `amarillo` → "Cumple con observaciones", `rojo` → "No cumple".
- **One-sentence narrative** — derived deterministically from counts (no LLM):
  - `verde` and 100% counts → "Cumples con todos los requisitos extraídos."
  - `amarillo` → "Cumples con la mayoría; algunos requisitos requieren verificación."
  - `rojo` → "No cumples con N requisitos críticos."
- **Counts table** — `verde / amarillo / rojo / total`, computed by reducing `verdicts`.
- **Recommendation panel** — three preset copies keyed by `overallVerdict`. The panel includes the export button (T19), re-run button (T16), and feedback control (T18).

### SemPill canonical mapping (RN-002)

`SemPill` accepts either canonical (`verde`/`amarillo`/`rojo`) or legacy (`eligible`/`conditional`/`not-eligible`) status. Internal mapping:

```ts
const CANONICAL: Record<Status, { label: string; variant: ChipVariant }> = {
  verde: { label: 'Cumple', variant: 'green' },
  amarillo: { label: 'Con observaciones', variant: 'amber' },
  rojo: { label: 'No cumple', variant: 'red' },
  // legacy:
  eligible: { label: 'Elegible', variant: 'green' },
  conditional: { label: 'Con observaciones', variant: 'amber' },
  'not-eligible': { label: 'No elegible', variant: 'red' },
};
```

### Immutability (RN-006)

The component **MUST NOT** render any control that emits a verdict-edit event. The only writable affordances on the banner are: re-run (T16), export (T19), feedback (T18).

## Done When

- [ ] Banner renders all three verdict branches with correct color, title, narrative
- [ ] Counts derive from `verdicts` array (deterministic reducer, unit-tested)
- [ ] `SemPill` accepts both canonical and legacy values; tests cover all 6 inputs
- [ ] No verdict-edit affordance present in DOM (assert via test)

## Dependencies

T11.
