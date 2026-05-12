/**
 * T20 — REQ-028
 *
 * ExtractionStage type + display map. Mirrors the four stages used by the
 * Upload progress step (T5) so the visual primitive can be reused.
 *
 * Stage order: extraccion → analisis → evaluacion → validacion
 * Pct derived from stage index (0 / 25 / 50 / 75) for the progress ring.
 */

export type ExtractionStage =
  | 'extraccion'   // PDF text extraction in progress
  | 'analisis'     // requisito segmentation
  | 'evaluacion'   // verdict computation (semaforo aggregation)
  | 'validacion'   // schema validation + persistence

export const STAGE_ORDER: ExtractionStage[] = [
  'extraccion',
  'analisis',
  'evaluacion',
  'validacion',
]

export const STAGE_DISPLAY: Record<
  ExtractionStage,
  { label: string; description: string }
> = {
  extraccion: { label: 'Extracción', description: 'Leyendo el pliego' },
  analisis:   { label: 'Análisis',   description: 'Identificando requisitos' },
  evaluacion: { label: 'Evaluación', description: 'Comparando con tu perfil' },
  validacion: { label: 'Validación', description: 'Confirmando resultados' },
}

/** Percentage (0–100) for the progress ring at each stage. */
export function stageToPct(stage: ExtractionStage | null | undefined): number {
  if (!stage) return 0
  const idx = STAGE_ORDER.indexOf(stage as ExtractionStage)
  if (idx === -1) return 0
  // 0 → 0%, 1 → 25%, 2 → 50%, 3 → 75% (100% only when completed)
  return idx * 25
}
