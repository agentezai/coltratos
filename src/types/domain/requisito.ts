import { z } from 'zod'
import { type RequisitoId, type AnalisisId, type SegmentoId, branded } from './primitives'

export const RequisitoSchema = z.object({
  id: z.string().uuid().transform(v => branded<RequisitoId>(v)),
  analisis_id: z.string().uuid().transform(v => branded<AnalisisId>(v)),
  segmento_id: z.string().uuid().transform(v => branded<SegmentoId>(v)),
  categoria: z.enum(['juridico', 'financiero', 'tecnico', 'experiencia']),
  descripcion: z.string().min(1),
  cumple: z.boolean().nullable(),
  semaforo: z.enum(['verde', 'amarillo', 'rojo']),
  justificacion: z.string().nullable().default(null),
  is_habilitante: z.boolean(),
  is_habilitante_source: z.enum(['structural', 'llm', 'manual']),
  citation_segment_id: z.string().uuid().transform(v => branded<SegmentoId>(v)),
  citation_quote: z.string().min(1).max(200),
  citation_verified: z.boolean(),
  created_at: z.coerce.date(),
})

export type Requisito = z.infer<typeof RequisitoSchema>
