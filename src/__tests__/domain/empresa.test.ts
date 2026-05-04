import { describe, it, expect } from 'vitest'
import { EmpresaSchema } from '../../types/domain/empresa'

const ID1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

const validEmpresa = {
  id: ID1,
  nombre: 'Constructora Andina SAS',
  nit: '900123456-7',
  profile_updated_at: new Date(),
  created_at: new Date(),
  updated_at: new Date(),
}

describe('EmpresaSchema — TC-010 read-side: profile_updated_at is a Date (REQ-011, RN-014)', () => {
  it('accepts profile_updated_at as a Date', () => {
    const result = EmpresaSchema.safeParse(validEmpresa)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.profile_updated_at).toBeInstanceOf(Date)
    }
  })

  it('coerces profile_updated_at from ISO string', () => {
    const result = EmpresaSchema.safeParse({
      ...validEmpresa,
      profile_updated_at: '2026-04-30T00:00:00Z',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.profile_updated_at).toBeInstanceOf(Date)
    }
  })
})

describe('EmpresaSchema — NIT format', () => {
  it('rejects invalid NIT format', () => {
    const result = EmpresaSchema.safeParse({ ...validEmpresa, nit: '12345' })
    expect(result.success).toBe(false)
  })

  it('accepts valid NIT with 9-digit prefix', () => {
    const result = EmpresaSchema.safeParse({ ...validEmpresa, nit: '900123456-7' })
    expect(result.success).toBe(true)
  })

  it('accepts valid NIT with 10-digit prefix', () => {
    const result = EmpresaSchema.safeParse({ ...validEmpresa, nit: '9001234567-7' })
    expect(result.success).toBe(true)
  })
})
