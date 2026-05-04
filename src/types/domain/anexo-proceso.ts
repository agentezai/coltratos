import { z } from 'zod'
import { type AnexoProcesoId, type ProcesoId, type EmpresaId, branded } from './primitives'

export const AnexoProcesoSchema = z.object({
  id: z.string().uuid().transform(v => branded<AnexoProcesoId>(v)),
  proceso_id: z.string().uuid().transform(v => branded<ProcesoId>(v)),
  tipo: z.enum(['anexo_tecnico', 'estudio_previo', 'resolucion', 'otro']),
  file_path: z.string().min(1),
  file_hash: z.string().length(64),
  uploaded_by_empresa_id: z.string().uuid().transform(v => branded<EmpresaId>(v)).nullable().default(null),
  page_count: z.number().int().nonnegative().nullable().default(null),
  deleted_at: z.coerce.date().nullable().default(null),
  created_at: z.coerce.date(),
})

export type AnexoProceso = z.infer<typeof AnexoProcesoSchema>
