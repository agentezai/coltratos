import { describe, it, expect } from 'vitest'
import { PliegoSchema } from '../../types/domain/pliego'

const ID1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const ID2 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'

const validPliego = {
  id: ID1,
  proceso_id: ID2,
  tipo: 'pliego_definitivo',
  file_path: '/storage/pliegos/abc.pdf',
  file_hash: 'a'.repeat(64),
  uploaded_by_empresa_id: null,
  page_count: null,
  deleted_at: null,
  created_at: new Date(),
}

describe('PliegoSchema — TC-003a: deleted_at is nullable (REQ-005, RN-004)', () => {
  it('accepts deleted_at: null', () => {
    const result = PliegoSchema.safeParse({ ...validPliego, deleted_at: null })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.deleted_at).toBeNull()
  })

  it('defaults deleted_at to null when absent', () => {
    const { deleted_at: _, ...withoutDeletedAt } = validPliego
    const result = PliegoSchema.safeParse(withoutDeletedAt)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.deleted_at).toBeNull()
  })
})

describe('PliegoSchema — TC-008: rejects AnexoProceso tipo values (RN-012)', () => {
  it("rejects tipo: 'anexo_tecnico'", () => {
    const result = PliegoSchema.safeParse({ ...validPliego, tipo: 'anexo_tecnico' })
    expect(result.success).toBe(false)
  })

  it("rejects tipo: 'estudio_previo'", () => {
    const result = PliegoSchema.safeParse({ ...validPliego, tipo: 'estudio_previo' })
    expect(result.success).toBe(false)
  })

  it('accepts valid PliegoTipo values', () => {
    for (const tipo of ['pliego_condiciones', 'pliego_definitivo']) {
      const result = PliegoSchema.safeParse({ ...validPliego, tipo })
      expect(result.success, `tipo '${tipo}' should be valid`).toBe(true)
    }
  })
})

describe('PliegoSchema — file_hash must be exactly 64 chars (REQ-005, RN-003)', () => {
  it('rejects file_hash shorter than 64 chars', () => {
    const result = PliegoSchema.safeParse({ ...validPliego, file_hash: 'abc' })
    expect(result.success).toBe(false)
  })

  it('accepts file_hash of exactly 64 chars', () => {
    const result = PliegoSchema.safeParse({ ...validPliego, file_hash: 'a'.repeat(64) })
    expect(result.success).toBe(true)
  })

  it('rejects file_hash longer than 64 chars', () => {
    const result = PliegoSchema.safeParse({ ...validPliego, file_hash: 'a'.repeat(65) })
    expect(result.success).toBe(false)
  })
})
