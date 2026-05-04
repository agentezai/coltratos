import { z } from 'zod'

export const RequisitoExtractionPayloadSchema = z.object({
  categoria: z.enum(['juridico', 'financiero', 'tecnico', 'experiencia']),
  descripcion: z.string().min(1),
  cumple: z.boolean().nullable(),
  semaforo: z.enum(['verde', 'amarillo', 'rojo']),
  justificacion: z.string().nullable().default(null),
  citation_segment_id: z.string().uuid(),
  citation_quote: z.string().min(1).max(200),
  is_habilitante: z.boolean(),
  is_habilitante_source: z.enum(['structural', 'llm', 'manual']),
})

export type RequisitoExtractionPayload = z.infer<typeof RequisitoExtractionPayloadSchema>

export const RequisitoExtractionPayloadArraySchema = z.array(RequisitoExtractionPayloadSchema)
