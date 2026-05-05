import { describe, it, expect } from 'vitest'
import { ProcesoSchema } from '../../types/domain/proceso'

const ID1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

const validProceso = {
  id: ID1,
  secop_process_number: 'VJ-SGP-1234-2024',
  entidad_contratante: 'Ministerio de Salud y Protección Social',
  objeto: 'Suministro de medicamentos esenciales',
  modalidad: 'licitacion_publica',
  valor_estimado: null,
  cronograma: null,
  created_at: new Date(),
}

describe('ProcesoSchema — TC-003b: no deleted_at field (REQ-005, RN-004)', () => {
  it('has no deleted_at in schema shape', () => {
    expect('deleted_at' in ProcesoSchema.shape).toBe(false)
  })

  it('strips deleted_at if provided', () => {
    const result = ProcesoSchema.safeParse({ ...validProceso, deleted_at: new Date() })
    expect(result.success).toBe(true)
    if (result.success) {
      expect('deleted_at' in result.data).toBe(false)
    }
  })
})

describe('ProcesoSchema — modalidad enum', () => {
  it('rejects unknown modalidad', () => {
    const result = ProcesoSchema.safeParse({ ...validProceso, modalidad: 'subasta_inversa' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid modalidades', () => {
    const modalidades = [
      'licitacion_publica',
      'seleccion_abreviada',
      'minima_cuantia',
      'concurso_meritos',
      'contratacion_directa',
    ]
    for (const modalidad of modalidades) {
      const result = ProcesoSchema.safeParse({ ...validProceso, modalidad })
      expect(result.success, `modalidad '${modalidad}' should be valid`).toBe(true)
    }
  })
})
