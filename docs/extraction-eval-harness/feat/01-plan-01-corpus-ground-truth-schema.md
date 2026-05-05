# T1: Corpus + Ground-Truth Schema

## Scope

- `eval/types.ts` — `GroundTruthRequisito`, `CorpusEntry`, `CorpusManifest`, `PliEgoResult`, `EvalRunResult` types + Zod schemas
- `eval/corpus/corpus.yaml` — manifest of 20 pliegos (skeleton — engineer populates during corpus assembly)
- `eval/corpus/labeling-protocol.md` — instructions for human labelers
- `eval/corpus/labeling-template.csv` — CSV template for labeler input
- `eval/corpus/ground-truth/` — empty directory + `.gitkeep` (ground-truth JSON files added per pliego)
- `eval/corpus/ground-truth/labeler-b/` — empty directory + `.gitkeep` (second labeler annotations)

## Changes

### Type Definitions (`eval/types.ts`)

```typescript
import { z } from 'zod'
import { RequisitoCategoria } from '@/types'

export const GroundTruthRequisitoSchema = z.object({
  tipo: z.enum(['juridico', 'tecnico', 'financiero', 'experiencia']),
  texto_canonical: z.string().min(1).max(2000),
  pagina_fuente: z.number().int().positive(),
  quote_fuente_minima: z.string().max(200),
  is_habilitante: z.boolean(),
})
export type GroundTruthRequisito = z.infer<typeof GroundTruthRequisitoSchema>

export const GroundTruthFileSchema = z.array(GroundTruthRequisitoSchema).min(1)
export type GroundTruthFile = z.infer<typeof GroundTruthFileSchema>

export const CorpusEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  storage_key: z.string(),
  sha256: z.string().length(64),
  modalidad: z.enum(['licitacion_publica', 'concurso_de_meritos', 'contratacion_directa', 'minima_cuantia', 'seleccion_abreviada']),
  entidad: z.string(),
  year: z.number().int().min(2018).max(2030),
  tipo_pliego: z.literal('pliego_definitivo'),
  labeler_primary: z.string(),
  labeler_secondary: z.string().optional(),
  date_labeled: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // true = labeler annotated every requisito habilitante; hallucination metric is only valid for these
  ground_truth_exhaustive: z.boolean(),
})
export type CorpusEntry = z.infer<typeof CorpusEntrySchema>

export const CorpusManifestSchema = z.object({
  pliegos: z.array(CorpusEntrySchema).min(20),
})
export type CorpusManifest = z.infer<typeof CorpusManifestSchema>

export type HallucinatedEntry = {
  descripcion: string
  tipo: RequisitoCategoria
  citation_segment_id: string  // SegmentoId — opaque at this layer
  max_cosine_to_gt: number     // closest GT entry's cosine — for near-miss inspection
}

export type PliEgoResult = {
  pliego_id: string
  status: 'ok' | 'cost_exceeded' | 'fetch_failed' | 'ingestion_failed'
  recall?: number
  precision?: number
  f1?: number
  matched_count?: number
  missed: GroundTruthRequisito[]
  hallucinated: HallucinatedEntry[]  // empty array for non-exhaustive pliegos
  hallucination_rate: number | null  // null when ground_truth_exhaustive === false
}

export type EvalRunResult = {
  git_hash: string
  date: string
  recall_aggregate: number
  recall_stddev: number          // stddev of per-pliego recall across corpus
  recall_min: number
  recall_max: number
  precision_aggregate: number
  f1_aggregate: number
  hallucination_rate: number | null  // macro-avg over exhaustive pliegos; null if none are exhaustive
  exhaustive_pliego_count: number    // how many pliegos contributed to hallucination_rate
  recall_juridico: number | null
  recall_tecnico: number | null
  recall_financiero: number | null
  recall_experiencia: number | null
  cost_usd: number
  scorer_embedding_model: 'text-embedding-3-small' | 'text-embedding-3-large'
  scorer_calibration_agreement: number
  forced?: boolean
  forced_reason?: string
  gate_passed: boolean
  pliego_results: PliEgoResult[]
}
```

### Corpus manifest skeleton (`eval/corpus/corpus.yaml`)

Header block with selection criteria comment. Two sample entries with placeholder values to illustrate the schema. Engineers add real entries as corpus is assembled.

### Labeling protocol (`eval/corpus/labeling-protocol.md`)

Cover: scope (`pliego_definitivo` only), what counts as a requisito habilitante, how to fill each CSV field, edge cases (requisitos embedded in tables, multi-page requisitos, financiero vs experiencia distinction), and the dual-labeling process for the 5 overlap pliegos.

### Labeling template (`eval/corpus/labeling-template.csv`)

Header row: `tipo,texto_canonical,pagina_fuente,quote_fuente_minima,is_habilitante`. One example row per tipo to illustrate format. Labelers copy the template, fill it, return the CSV.

### Design Rationale (SRP)

T1 owns only the contracts — types, corpus manifest, and human labeling docs. No runtime logic. T2–T6 import from `eval/types.ts`; none redeclare these types.

## Dependencies

None — foundational task.

## Done When

- [ ] `eval/types.ts` compiles under `npm run typecheck` with no errors; `GroundTruthFileSchema` validates a sample 3-entry JSON array
- [ ] `corpus.yaml` parses against `CorpusManifestSchema` (skeleton with 2 sample entries passes schema, missing 20-entry minimum is expected at skeleton stage — annotate spec intent clearly)
- [ ] `labeling-protocol.md` covers all 4 tipos with at least one example each
- [ ] `labeling-template.csv` has correct header + at least one example row
- [ ] `eval/corpus/ground-truth/.gitkeep` and `eval/corpus/ground-truth/labeler-b/.gitkeep` committed
