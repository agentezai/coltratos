import { describe, it, expect } from 'vitest'
import { RequisitoSchema } from '../../types/domain/requisito'

const ID1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const ID2 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'
const ID3 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'
const ID4 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'

const validRequisito = {
  id: ID1,
  analisis_id: ID2,
  segmento_id: ID3,
  categoria: 'juridico',
  descripcion: 'Debe estar inscrito en el RUP activo',
  cumple: null,
  semaforo: 'rojo',
  justificacion: null,
  is_habilitante: true,
  is_habilitante_source: 'structural',
  citation_segment_id: ID4,
  citation_quote: 'CAPACIDAD JURÍDICA',
  citation_verified: false,
  created_at: new Date(),
}

describe('RequisitoSchema — TC-002: cumple accepts null, true, false (REQ-003, RN-002)', () => {
  it('accepts cumple: null', () => {
    const result = RequisitoSchema.safeParse({ ...validRequisito, cumple: null })
    expect(result.success).toBe(true)
  })

  it('accepts cumple: true', () => {
    const result = RequisitoSchema.safeParse({ ...validRequisito, cumple: true })
    expect(result.success).toBe(true)
  })

  it('accepts cumple: false', () => {
    const result = RequisitoSchema.safeParse({ ...validRequisito, cumple: false })
    expect(result.success).toBe(true)
  })
})

describe('RequisitoSchema — TC-011: rejects categoria general (REQ-008, RN-017)', () => {
  it("rejects categoria: 'general'", () => {
    const result = RequisitoSchema.safeParse({ ...validRequisito, categoria: 'general' })
    expect(result.success).toBe(false)
  })

  it('accepts all four valid categoria values', () => {
    for (const categoria of ['juridico', 'financiero', 'tecnico', 'experiencia']) {
      const result = RequisitoSchema.safeParse({ ...validRequisito, categoria })
      expect(result.success, `categoria '${categoria}' should be valid`).toBe(true)
    }
  })
})

describe('RequisitoSchema — TC-013: is_habilitante + is_habilitante_source (REQ-009, RN-018)', () => {
  it('accepts is_habilitante: true with source structural', () => {
    const result = RequisitoSchema.safeParse({
      ...validRequisito,
      is_habilitante: true,
      is_habilitante_source: 'structural',
    })
    expect(result.success).toBe(true)
  })

  it('accepts all three valid is_habilitante_source values', () => {
    for (const src of ['structural', 'llm', 'manual']) {
      const result = RequisitoSchema.safeParse({ ...validRequisito, is_habilitante_source: src })
      expect(result.success, `source '${src}' should be valid`).toBe(true)
    }
  })

  it("rejects is_habilitante_source: 'auto'", () => {
    const result = RequisitoSchema.safeParse({
      ...validRequisito,
      is_habilitante_source: 'auto',
    })
    expect(result.success).toBe(false)
  })
})

describe('RequisitoSchema — citation_quote max 200 chars (REQ-007)', () => {
  it('rejects citation_quote over 200 chars', () => {
    const result = RequisitoSchema.safeParse({
      ...validRequisito,
      citation_quote: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it('accepts citation_quote exactly 200 chars', () => {
    const result = RequisitoSchema.safeParse({
      ...validRequisito,
      citation_quote: 'a'.repeat(200),
    })
    expect(result.success).toBe(true)
  })
})
