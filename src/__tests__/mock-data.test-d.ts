import { expectTypeOf, describe, it } from 'vitest'
import type { ANALISIS } from '../../src/lib/mock/index'

type MockAnalisis = (typeof ANALISIS)[number]

describe('Mock data types — T2', () => {
  it('ANALISIS[0].sem is assignable to Semaforo union', () => {
    expectTypeOf<MockAnalisis['sem']>().toEqualTypeOf<'eligible' | 'conditional' | 'not-eligible'>()
  })
})
