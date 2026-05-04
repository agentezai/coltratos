import { describe, it, expect } from 'vitest'
import { SegmentoSchema } from '../../types/domain/segmento'

const ID1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const ID2 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'

const validSegmento = {
  id: ID1,
  pliego_id: ID2,
  categoria: 'juridico',
  contenido: 'Texto del segmento de capacidad jurídica',
  orden: 0,
  page_range_start: 1,
  page_range_end: 3,
  heading_normalized: 'capacidad juridica',
  heading_original: 'CAPACIDAD JURÍDICA',
  is_synthetic: false,
  created_at: new Date(),
}

describe('SegmentoSchema — TC-006: accepts categoria general (REQ-002, RN-007)', () => {
  it("parses with categoria: 'general', is_synthetic: true, null headings", () => {
    const result = SegmentoSchema.safeParse({
      ...validSegmento,
      categoria: 'general',
      is_synthetic: true,
      heading_normalized: null,
      heading_original: null,
      page_range_start: 1,
      page_range_end: 1,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.categoria).toBe('general')
  })
})

describe('SegmentoSchema — TC-007: refine rejects invalid heading/synthetic combos (REQ-006, RN-010)', () => {
  it('rejects is_synthetic: true with non-null headings', () => {
    const result = SegmentoSchema.safeParse({
      ...validSegmento,
      is_synthetic: true,
      heading_normalized: 'capacidad juridica',
      heading_original: 'CAPACIDAD JURÍDICA',
    })
    expect(result.success).toBe(false)
  })

  it('rejects is_synthetic: false with null headings', () => {
    const result = SegmentoSchema.safeParse({
      ...validSegmento,
      is_synthetic: false,
      heading_normalized: null,
      heading_original: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects mixed heading nullability (normalized non-null, original null)', () => {
    const result = SegmentoSchema.safeParse({
      ...validSegmento,
      heading_normalized: 'capacidad juridica',
      heading_original: null,
    })
    expect(result.success).toBe(false)
  })
})

describe('SegmentoSchema — page range validation (REQ-006, RN-011)', () => {
  it('rejects page_range_start > page_range_end', () => {
    const result = SegmentoSchema.safeParse({
      ...validSegmento,
      page_range_start: 5,
      page_range_end: 3,
    })
    expect(result.success).toBe(false)
  })

  it('rejects page_range_start: 0 (min is 1)', () => {
    const result = SegmentoSchema.safeParse({
      ...validSegmento,
      page_range_start: 0,
    })
    expect(result.success).toBe(false)
  })

  it('accepts equal page_range_start and page_range_end', () => {
    const result = SegmentoSchema.safeParse({
      ...validSegmento,
      page_range_start: 3,
      page_range_end: 3,
    })
    expect(result.success).toBe(true)
  })
})
