import { describe, it, expect } from 'vitest'
import { AnexoProcesoSchema } from '../../types/domain/anexo-proceso'

const ID1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const ID2 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'

const validAnexo = {
  id: ID1,
  proceso_id: ID2,
  tipo: 'anexo_tecnico',
  file_path: '/storage/anexos/abc.pdf',
  file_hash: 'a'.repeat(64),
  uploaded_by_empresa_id: null,
  page_count: null,
  deleted_at: null,
  created_at: new Date(),
}

describe('AnexoProcesoSchema — TC-008: rejects Pliego tipo values (RN-012)', () => {
  it("rejects tipo: 'pliego_condiciones'", () => {
    const result = AnexoProcesoSchema.safeParse({ ...validAnexo, tipo: 'pliego_condiciones' })
    expect(result.success).toBe(false)
  })

  it("rejects tipo: 'pliego_definitivo'", () => {
    const result = AnexoProcesoSchema.safeParse({ ...validAnexo, tipo: 'pliego_definitivo' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid AnexoProcesoTipo values', () => {
    for (const tipo of ['anexo_tecnico', 'estudio_previo', 'resolucion', 'otro']) {
      const result = AnexoProcesoSchema.safeParse({ ...validAnexo, tipo })
      expect(result.success, `tipo '${tipo}' should be valid`).toBe(true)
    }
  })
})

describe('AnexoProcesoSchema — file_hash must be exactly 64 chars', () => {
  it('rejects file_hash shorter than 64 chars', () => {
    const result = AnexoProcesoSchema.safeParse({ ...validAnexo, file_hash: 'abc' })
    expect(result.success).toBe(false)
  })

  it('accepts file_hash of exactly 64 chars', () => {
    const result = AnexoProcesoSchema.safeParse({ ...validAnexo, file_hash: 'a'.repeat(64) })
    expect(result.success).toBe(true)
  })
})
