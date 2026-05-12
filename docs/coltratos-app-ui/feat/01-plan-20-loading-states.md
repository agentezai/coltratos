# T20: Loading states tied to real progress

## Scope

| File | Change |
|------|--------|
| `app/dashboard/analisis/[id]/_components/extraction-loading.tsx` | New — RSC + 5-second polling Client child |
| `app/dashboard/analisis/[id]/_components/extraction-stages.ts` | New — `ExtractionStage` enum + display map |
| `src/app/api/analyses/[id]/status/route.ts` | New — GET: returns `{ extraction_status, extraction_stage, progress_pct }` |

## Requirements

REQ-028.

## Changes

### `ExtractionStage` enum

Mirrors the four stages used by the Upload progress step (T5) so the visual primitive can be reused:

```ts
export type ExtractionStage =
  | 'extraccion'      // PDF text extraction in progress
  | 'analisis'        // requisito segmentation
  | 'evaluacion'      // verdict computation (semaforo-aggregation)
  | 'validacion';     // schema validation + persistence

export const STAGE_DISPLAY: Record<ExtractionStage, { label: string; description: string }> = {
  extraccion: { label: 'Extracción', description: 'Leyendo el pliego' },
  analisis: { label: 'Análisis', description: 'Identificando requisitos' },
  evaluacion: { label: 'Evaluación', description: 'Comparando con tu perfil' },
  validacion: { label: 'Validación', description: 'Confirmando resultados' },
};
```

### `ExtractionLoading` (RSC)

Rendered when `extraction_status ∈ {pending, extracting}`. Layout reuses T5's progress primitives:
- Stepper showing the 4 stages, with the current stage active and earlier stages done
- Progress ring (0–100%) — pct derived from stage index (0 / 25 / 50 / 75 / 100) for now; future iteration may persist real pct
- Side card listing what is happening behind the scenes

### `<ExtractionStatusPoller>` (Client child)

Polls `GET /api/analyses/[id]/status` every 5 seconds. On status change:
- Same status, new stage → updates the step indicator
- Status moves to `partial / completed / failed` → calls `router.refresh()` so the page re-renders the verdict UI

Polling **MUST** stop when:
- Status reaches a terminal state (`completed | partial | failed`)
- Component unmounts
- 10 minutes have elapsed (safety cap; surface "El análisis está tardando más de lo esperado" message + link to support)

### Status endpoint

`GET /api/analyses/[id]/status`:
1. RLS-scoped lookup of `analyses.id`.
2. Returns `{ extraction_status, extraction_stage, pages_flagged, updated_at }`.
3. Cache-Control: `no-store` (real-time signal).

## Done When

- [ ] Stepper renders correct stage based on `extraction_stage`
- [ ] Polling fires every 5 seconds while non-terminal
- [ ] Polling stops on terminal status and triggers `router.refresh()`
- [ ] 10-minute safety cap surfaces the "tardando más" message
- [ ] No generic spinner anywhere on this surface (REQ-028 invariant — assert via test)

## Dependencies

T11. T5 progress primitives are reused (already shipped).
