import { z } from 'zod'
import { type EmpresaId, branded } from './primitives'

export const EmpresaSchema = z.object({
  id: z.string().uuid().transform(v => branded<EmpresaId>(v)),
  nombre: z.string().min(1).max(255),
  nit: z.string().regex(/^\d{9,10}-\d$/),
  profile_updated_at: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
})

export type Empresa = z.infer<typeof EmpresaSchema>
