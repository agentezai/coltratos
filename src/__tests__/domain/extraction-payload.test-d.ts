import { describe, it, expectTypeOf } from 'vitest'
import type { ExtractorLogger } from '@/types'

// ExtractorLogger structural interface (REQ-002)
describe('ExtractorLogger — pure structural interface', () => {
  it('accepts an object with info, warn, error methods of the correct signature', () => {
    const logger: ExtractorLogger = {
      info: (_event: string, _payload: Record<string, unknown>) => {},
      warn: (_event: string, _payload: Record<string, unknown>) => {},
      error: (_event: string, _payload: Record<string, unknown>) => {},
    }
    expectTypeOf(logger.info).toBeFunction()
    expectTypeOf(logger.warn).toBeFunction()
    expectTypeOf(logger.error).toBeFunction()
  })

  it('RequisitoExtractionPayloadSchema resolves from @/types', async () => {
    const { RequisitoExtractionPayloadSchema } = await import('@/types')
    expectTypeOf(RequisitoExtractionPayloadSchema.parse).toBeFunction()
  })

  it('RequisitoExtractionPayload type resolves from @/types', () => {
    type Payload = import('@/types').RequisitoExtractionPayload
    expectTypeOf<Payload>().toHaveProperty('categoria')
    expectTypeOf<Payload>().toHaveProperty('is_habilitante')
    expectTypeOf<Payload>().toHaveProperty('is_habilitante_source')
  })
})
