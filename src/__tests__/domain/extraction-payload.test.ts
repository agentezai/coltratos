import { describe, it, expect } from 'vitest'
import { RequisitoExtractionPayloadSchema } from '../../types/domain/extraction-payload'
import { RequisitoSchema } from '../../types/domain/requisito'

const SEG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

const validPayload = {
  categoria: 'juridico',
  descripcion: 'Debe estar inscrito en el RUP activo',
  cumple: true,
  semaforo: 'verde',
  justificacion: 'El proponente tiene RUP activo',
  citation_segment_id: SEG_ID,
  citation_quote: 'CAPACIDAD JURÍDICA',
  is_habilitante: true,
  is_habilitante_source: 'structural',
}

// TC-001 — payload schema is distinct from persisted-row schema (REQ-001, RN-001)
describe('RequisitoExtractionPayloadSchema — TC-001: distinct from RequisitoSchema', () => {
  it('parses a valid payload with no orchestrator fields', () => {
    const result = RequisitoExtractionPayloadSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('RequisitoSchema rejects the same payload (missing id, analisis_id, segmento_id, created_at, citation_verified)', () => {
    const result = RequisitoSchema.safeParse(validPayload)
    expect(result.success).toBe(false)
  })
})

// TC-002 — rejects categoria 'general' (RN-002)
describe('RequisitoExtractionPayloadSchema — TC-002: rejects general', () => {
  it("rejects categoria: 'general'", () => {
    const result = RequisitoExtractionPayloadSchema.safeParse({ ...validPayload, categoria: 'general' })
    expect(result.success).toBe(false)
  })
})

// TC-003 — accepts all four valid categoria values (RN-002)
describe('RequisitoExtractionPayloadSchema — TC-003: accepts all four categoria values', () => {
  for (const categoria of ['juridico', 'financiero', 'tecnico', 'experiencia'] as const) {
    it(`accepts categoria: '${categoria}'`, () => {
      const result = RequisitoExtractionPayloadSchema.safeParse({ ...validPayload, categoria })
      expect(result.success, `categoria '${categoria}' should be valid`).toBe(true)
    })
  }
})

// TC-004 — is_habilitante + is_habilitante_source (RN-003)
describe('RequisitoExtractionPayloadSchema — TC-004: is_habilitante + is_habilitante_source', () => {
  it('accepts is_habilitante: true, is_habilitante_source: structural', () => {
    const result = RequisitoExtractionPayloadSchema.safeParse({
      ...validPayload,
      is_habilitante: true,
      is_habilitante_source: 'structural',
    })
    expect(result.success).toBe(true)
  })

  it('accepts all three valid is_habilitante_source values', () => {
    for (const src of ['structural', 'llm', 'manual'] as const) {
      const result = RequisitoExtractionPayloadSchema.safeParse({ ...validPayload, is_habilitante_source: src })
      expect(result.success, `source '${src}' should be valid`).toBe(true)
    }
  })

  it("rejects is_habilitante_source: 'auto'", () => {
    const result = RequisitoExtractionPayloadSchema.safeParse({
      ...validPayload,
      is_habilitante_source: 'auto',
    })
    expect(result.success).toBe(false)
  })
})

// citation_quote max 200 chars (REQ-001)
describe('RequisitoExtractionPayloadSchema — citation_quote max 200 chars', () => {
  it('rejects citation_quote over 200 chars', () => {
    const result = RequisitoExtractionPayloadSchema.safeParse({
      ...validPayload,
      citation_quote: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it('accepts citation_quote exactly 200 chars', () => {
    const result = RequisitoExtractionPayloadSchema.safeParse({
      ...validPayload,
      citation_quote: 'a'.repeat(200),
    })
    expect(result.success).toBe(true)
  })
})
