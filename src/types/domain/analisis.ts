import { z } from 'zod'
import { type AnalisisId, type ProcesoId, type EmpresaId, branded } from './primitives'

export const AnalisisSchema = z.object({
  id: z.string().uuid().transform(v => branded<AnalisisId>(v)),
  proceso_id: z.string().uuid().transform(v => branded<ProcesoId>(v)),
  empresa_id: z.string().uuid().transform(v => branded<EmpresaId>(v)),
  pliego_ids: z.array(z.string().uuid()),
  estado: z.enum(['pending', 'extracting', 'analyzing', 'completed', 'failed']),
  semaforo: z.enum(['verde', 'amarillo', 'rojo']).nullable().default(null),
  error_message: z.string().nullable().default(null),
  cost_usd: z.number().nonnegative().nullable().default(null),
  model_metadata: z.object({
    implementation_id: z.string(),
    model_name: z.string(),
    prompt_version: z.string(),
  }).nullable().default(null),
  prompt_version: z.string().nullable().default(null),
  semaforo_rules_version: z.string().nullable().default(null),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable().default(null),
})

export type Analisis = z.infer<typeof AnalisisSchema>
