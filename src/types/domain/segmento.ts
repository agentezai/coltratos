import { z } from 'zod'
import { type SegmentoId, type PliegoId, branded } from './primitives'

export const SegmentoSchema = z.object({
  id: z.string().uuid().transform(v => branded<SegmentoId>(v)),
  pliego_id: z.string().uuid().transform(v => branded<PliegoId>(v)),
  categoria: z.enum(['juridico', 'financiero', 'tecnico', 'experiencia', 'general']),
  contenido: z.string().min(1),
  orden: z.number().int().nonnegative(),
  page_range_start: z.number().int().min(1),
  page_range_end: z.number().int().min(1),
  heading_normalized: z.string().nullable(),
  heading_original: z.string().nullable(),
  is_synthetic: z.boolean(),
  created_at: z.coerce.date(),
})
  .refine(s => s.page_range_start <= s.page_range_end, {
    message: 'page_range_start must be <= page_range_end',
    path: ['page_range_end'],
  })
  .refine(
    s => (s.heading_normalized === null) === (s.heading_original === null),
    { message: 'heading_normalized and heading_original must both be null or both non-null', path: ['heading_normalized'] },
  )
  .refine(
    s => (s.is_synthetic === true) === (s.heading_normalized === null),
    { message: 'is_synthetic true must coincide with heading_normalized null', path: ['is_synthetic'] },
  )

export type Segmento = z.infer<typeof SegmentoSchema>
