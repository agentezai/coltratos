import { z } from 'zod'
import { type PromptCacheId, type PliegoId, type EmpresaId, branded } from './primitives'

export const PromptCacheSchema = z.object({
  id: z.string().uuid().transform(v => branded<PromptCacheId>(v)),
  pliego_id: z.string().uuid().transform(v => branded<PliegoId>(v)),
  empresa_id: z.string().uuid().transform(v => branded<EmpresaId>(v)),
  hash: z.string().length(64),
  prompt_tokens: z.number().int().positive(),
  cached_at: z.coerce.date(),
  expires_at: z.coerce.date(),
})

export type PromptCache = z.infer<typeof PromptCacheSchema>
