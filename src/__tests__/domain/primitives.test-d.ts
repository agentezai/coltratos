import { describe, it, expectTypeOf } from 'vitest'
import type {
  EmpresaId,
  ProcesoId,
  PliegoId,
  AnexoProcesoId,
  SegmentoId,
  AnalisisId,
  RequisitoId,
  PromptCacheId,
  RequisitoCategoria,
} from '../../types/domain/primitives'

describe('Branded IDs prevent cross-entity assignment (REQ-001)', () => {
  it('EmpresaId and PliegoId are distinct types', () => {
    expectTypeOf<PliegoId>().not.toMatchTypeOf<EmpresaId>()
    expectTypeOf<EmpresaId>().not.toMatchTypeOf<PliegoId>()
  })

  it('all 8 branded ID types are distinct from each other', () => {
    expectTypeOf<EmpresaId>().not.toMatchTypeOf<ProcesoId>()
    expectTypeOf<ProcesoId>().not.toMatchTypeOf<PliegoId>()
    expectTypeOf<PliegoId>().not.toMatchTypeOf<AnexoProcesoId>()
    expectTypeOf<AnexoProcesoId>().not.toMatchTypeOf<SegmentoId>()
    expectTypeOf<SegmentoId>().not.toMatchTypeOf<AnalisisId>()
    expectTypeOf<AnalisisId>().not.toMatchTypeOf<RequisitoId>()
    expectTypeOf<RequisitoId>().not.toMatchTypeOf<PromptCacheId>()
  })
})

describe('RequisitoCategoria is narrow — excludes general (REQ-001, RN-017)', () => {
  it("'general' is not assignable to RequisitoCategoria", () => {
    // @ts-expect-error - 'general' must not be assignable to the narrow RequisitoCategoria
    const _general: RequisitoCategoria = 'general'
    void _general
  })

  it("all four valid values are assignable", () => {
    const _juridico: RequisitoCategoria = 'juridico'
    const _financiero: RequisitoCategoria = 'financiero'
    const _tecnico: RequisitoCategoria = 'tecnico'
    const _experiencia: RequisitoCategoria = 'experiencia'
    void _juridico; void _financiero; void _tecnico; void _experiencia
  })
})
