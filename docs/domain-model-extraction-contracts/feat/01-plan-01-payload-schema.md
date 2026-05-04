# T1: RequisitoExtractionPayloadSchema + ExtractorLogger

## Scope

- `src/types/domain/extraction-payload.ts` — LLM output contract (Zod schema + inferred type)
- `src/types/logger.ts` — Structural logger interface (pure type, zero runtime)

## Changes

### `src/types/domain/extraction-payload.ts`

```typescript
import { z } from 'zod'
import { SemaforoColor, RequisitoCategoria } from './primitives'

export const RequisitoExtractionPayloadSchema = z.object({
  categoria: z.enum([...RequisitoCategoria values...]),   // narrow — 'general' is a ZodError
  descripcion: z.string().min(1),
  cumple: z.boolean().nullable(),
  semaforo: z.enum([...SemaforoColor values...]),
  justificacion: z.string().nullable().default(null),
  citation_segment_id: z.string().uuid(),
  citation_quote: z.string().min(1).max(200),
  is_habilitante: z.boolean(),
  is_habilitante_source: z.enum(['structural', 'llm', 'manual']),
})

export type RequisitoExtractionPayload = z.infer<typeof RequisitoExtractionPayloadSchema>

// Convenience schema for arrays of payloads (the common LLM response shape)
export const RequisitoExtractionPayloadArraySchema = z.array(RequisitoExtractionPayloadSchema)
```

The payload schema intentionally omits orchestrator-populated fields: `id`, `analisis_id`, `created_at`, `segmento_id`, `citation_verified`. These fields exist on `RequisitoSchema` (the persisted-row contract in `domain-model-primitives`) but the LLM cannot know them at extraction time. The orchestrator is the only place the two schemas meet: it parses LLM output via `RequisitoExtractionPayloadSchema`, augments with orchestrator-only fields, and persists via `RequisitoSchema`. Conflating the two would force the LLM to emit fields it cannot know (a real `id`) or omit fields the DB requires.

### `src/types/logger.ts`

```typescript
export interface ExtractorLogger {
  info(event: string, payload: Record<string, unknown>): void
  warn(event: string, payload: Record<string, unknown>): void
  error(event: string, payload: Record<string, unknown>): void
}
```

Pure structural interface — zero runtime code. The composition root (orchestrator) provides the implementation; `lib/extraction/` depends only on this shape. Prevents circular dependencies between `@/types` and the feature implementations.

## Dependencies

Requires `domain-model-primitives` — imports `SemaforoColor`, `RequisitoCategoria` enum values, and references `RequisitoSchema` in contract tests.

## Done When

- [ ] `src/types/domain/extraction-payload.ts` exists and exports `RequisitoExtractionPayloadSchema`, `RequisitoExtractionPayloadArraySchema`, and inferred `RequisitoExtractionPayload` type
- [ ] `src/types/logger.ts` exists and exports `ExtractorLogger` as a pure interface (zero runtime code)
- [ ] `RequisitoExtractionPayloadSchema.parse({ categoria: 'juridico', ... })` succeeds (TC-003)
- [ ] `RequisitoExtractionPayloadSchema.parse({ ..., categoria: 'general' })` throws `ZodError` (TC-002)
- [ ] `RequisitoExtractionPayloadSchema.parse({ ..., is_habilitante_source: 'auto' })` throws `ZodError` (TC-004)
- [ ] Parsing same payload through `RequisitoSchema` throws `ZodError` for missing orchestrator fields (TC-001)
- [ ] `tsc --noEmit` on both files produces zero errors
