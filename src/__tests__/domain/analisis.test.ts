import { describe, it, expect } from 'vitest'
import { AnalisisSchema } from '../../types/domain/analisis'

const ID1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const ID2 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'
const ID3 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'
const ID4 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'

const validAnalisis = {
  id: ID1,
  proceso_id: ID2,
  empresa_id: ID3,
  pliego_ids: [ID4],
  estado: 'pending',
  semaforo: null,
  error_message: null,
  cost_usd: null,
  model_metadata: null,
  prompt_version: null,
  semaforo_rules_version: null,
  created_at: new Date(),
  updated_at: new Date(),
  completed_at: null,
}

describe('AnalisisSchema — TC-001: estado enum rejects unknown value (REQ-004, RN-001)', () => {
  it('rejects estado: cancelled', () => {
    const result = AnalisisSchema.safeParse({ ...validAnalisis, estado: 'cancelled' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid estado values', () => {
    for (const estado of ['pending', 'extracting', 'analyzing', 'completed', 'failed']) {
      const result = AnalisisSchema.safeParse({ ...validAnalisis, estado })
      expect(result.success, `estado '${estado}' should be valid`).toBe(true)
    }
  })
})

describe('AnalisisSchema — TC-014: nullable telemetry fields (REQ-010)', () => {
  it('accepts all four telemetry fields as null', () => {
    const result = AnalisisSchema.safeParse({
      ...validAnalisis,
      cost_usd: null,
      model_metadata: null,
      prompt_version: null,
      semaforo_rules_version: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cost_usd).toBeNull()
      expect(result.data.model_metadata).toBeNull()
      expect(result.data.prompt_version).toBeNull()
      expect(result.data.semaforo_rules_version).toBeNull()
    }
  })

  it('accepts model_metadata with valid shape', () => {
    const result = AnalisisSchema.safeParse({
      ...validAnalisis,
      model_metadata: {
        implementation_id: 'impl-001',
        model_name: 'claude-sonnet-4-6',
        prompt_version: 'v1.0.0',
      },
    })
    expect(result.success).toBe(true)
  })
})
