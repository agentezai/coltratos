import { z } from 'zod'
import { type PliegoId, type ProcesoId, type EmpresaId, branded } from './primitives'

export const PliegoSchema = z.object({
  id: z.string().uuid().transform(v => branded<PliegoId>(v)),
  proceso_id: z.string().uuid().transform(v => branded<ProcesoId>(v)),
  tipo: z.enum(['pliego_condiciones', 'pliego_definitivo']),
  file_path: z.string().min(1),
  file_hash: z.string().length(64),
  uploaded_by_empresa_id: z.string().uuid().transform(v => branded<EmpresaId>(v)).nullable().default(null),
  page_count: z.number().int().nonnegative().nullable().default(null),
  deleted_at: z.coerce.date().nullable().default(null),
  created_at: z.coerce.date(),
})

export type Pliego = z.infer<typeof PliegoSchema>
