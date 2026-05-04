import { describe, it, expect } from 'vitest'
import {
  AnalisisEstado,
  ModalidadContratacion,
  PliegoTipo,
  AnexoProcesoTipo,
  SemaforoColor,
  IsHabilitanteSource,
  SegmentoCategoria,
  RequisitoCategoria,
  EmpresaMemberRole,
  branded,
} from '../../types/domain/primitives'

describe('AnalisisEstado enum', () => {
  it('has exactly 5 values', () => {
    const values = Object.values(AnalisisEstado)
    expect(values).toHaveLength(5)
    expect(new Set(values)).toEqual(new Set(['pending', 'extracting', 'analyzing', 'completed', 'failed']))
  })
})

describe('ModalidadContratacion enum', () => {
  it('has exactly 5 values', () => {
    const values = Object.values(ModalidadContratacion)
    expect(values).toHaveLength(5)
    expect(new Set(values)).toEqual(new Set([
      'licitacion_publica',
      'seleccion_abreviada',
      'minima_cuantia',
      'concurso_meritos',
      'contratacion_directa',
    ]))
  })
})

describe('PliegoTipo enum', () => {
  it('has exactly 2 values (narrow per RN-012)', () => {
    const values = Object.values(PliegoTipo)
    expect(values).toHaveLength(2)
    expect(new Set(values)).toEqual(new Set(['pliego_condiciones', 'pliego_definitivo']))
  })
})

describe('AnexoProcesoTipo enum', () => {
  it('has exactly 4 values', () => {
    const values = Object.values(AnexoProcesoTipo)
    expect(values).toHaveLength(4)
    expect(new Set(values)).toEqual(new Set(['anexo_tecnico', 'estudio_previo', 'resolucion', 'otro']))
  })
})

describe('SemaforoColor enum', () => {
  it('has exactly 3 values', () => {
    const values = Object.values(SemaforoColor)
    expect(values).toHaveLength(3)
    expect(new Set(values)).toEqual(new Set(['verde', 'amarillo', 'rojo']))
  })
})

describe('IsHabilitanteSource enum', () => {
  it('has exactly 3 values', () => {
    const values = Object.values(IsHabilitanteSource)
    expect(values).toHaveLength(3)
    expect(new Set(values)).toEqual(new Set(['structural', 'llm', 'manual']))
  })
})

describe('SegmentoCategoria enum', () => {
  it('includes general (wide union)', () => {
    const values = Object.values(SegmentoCategoria)
    expect(values).toHaveLength(5)
    expect(values).toContain('general')
  })
})

describe('RequisitoCategoria enum', () => {
  it('has exactly 4 values and excludes general (narrow per RN-017)', () => {
    const values = Object.values(RequisitoCategoria)
    expect(values).toHaveLength(4)
    expect(values).not.toContain('general')
    expect(new Set(values)).toEqual(new Set(['juridico', 'financiero', 'tecnico', 'experiencia']))
  })
})

describe('EmpresaMemberRole enum', () => {
  it('has exactly 2 values', () => {
    const values = Object.values(EmpresaMemberRole)
    expect(values).toHaveLength(2)
    expect(new Set(values)).toEqual(new Set(['owner', 'member']))
  })
})

describe('branded helper', () => {
  it('returns the same string value', () => {
    const id = branded<string>('abc-123')
    expect(id).toBe('abc-123')
  })
})
