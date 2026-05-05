import { z } from 'zod'
import { type ProcesoId, branded } from './primitives'

export const ProcesoSchema = z.object({
  id: z.string().uuid().transform(v => branded<ProcesoId>(v)),
  secop_process_number: z.string().min(1).max(100),
  entidad_contratante: z.string().min(1).max(500),
  objeto: z.string().min(1),
  modalidad: z.enum([
    'licitacion_publica',
    'seleccion_abreviada',
    'minima_cuantia',
    'concurso_meritos',
    'contratacion_directa',
  ]),
  valor_estimado: z.number().nonnegative().nullable().default(null),
  cronograma: z.record(z.string(), z.unknown()).nullable().default(null),
  created_at: z.coerce.date(),
})

export type Proceso = z.infer<typeof ProcesoSchema>
