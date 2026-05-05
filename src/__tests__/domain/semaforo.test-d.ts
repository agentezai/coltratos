import { describe, it, expect, expectTypeOf } from 'vitest'
import { HABILITANTE_HEADING_PATTERNS, HABILITANTE_PATTERNS_VERSION } from '@/types'
import type { Semaforo, SemaforoStats, RequisitoCategoria, IsHabilitanteSource } from '@/types'

// TC-006: byCategoria.general must be a compile error
// @ts-expect-error — 'general' is not a key of Record<RequisitoCategoria, SemaforoColor>
type _GeneralIsInvalid = Semaforo['byCategoria']['general']
void (undefined as unknown as _GeneralIsInvalid)

// TC-005 — all extraction-contract types resolve from @/types
describe('TC-005 — Semaforo types + HABILITANTE_* constants resolve from @/types', () => {
  it('HABILITANTE_HEADING_PATTERNS is readonly RegExp[] of length >= 5', () => {
    expect(Array.isArray(HABILITANTE_HEADING_PATTERNS)).toBe(true)
    expect(HABILITANTE_HEADING_PATTERNS.length).toBeGreaterThanOrEqual(5)
    for (const p of HABILITANTE_HEADING_PATTERNS) {
      expect(p).toBeInstanceOf(RegExp)
    }
  })

  it("HABILITANTE_PATTERNS_VERSION is 'v1.0.0'", () => {
    expect(HABILITANTE_PATTERNS_VERSION).toBe('v1.0.0')
  })

  it('RequisitoCategoria type resolves — all four values assignable', () => {
    const values: RequisitoCategoria[] = ['juridico', 'financiero', 'tecnico', 'experiencia']
    expect(values).toHaveLength(4)
  })

  it('IsHabilitanteSource type resolves — all three values assignable', () => {
    const values: IsHabilitanteSource[] = ['structural', 'llm', 'manual']
    expect(values).toHaveLength(3)
  })

  it('SemaforoStats type has the expected shape', () => {
    const stats: SemaforoStats = { total: 10, cumple: 7, noCumple: 2, sinInfo: 1, cumplePct: 70 }
    expectTypeOf(stats).toHaveProperty('total')
    expectTypeOf(stats).toHaveProperty('cumple')
    expectTypeOf(stats).toHaveProperty('noCumple')
    expectTypeOf(stats).toHaveProperty('sinInfo')
    expectTypeOf(stats).toHaveProperty('cumplePct')
  })

  it('Semaforo.byCategoria.juridico compiles (TC-006 positive)', () => {
    type JuridicoColor = Semaforo['byCategoria']['juridico']
    expectTypeOf<JuridicoColor>().not.toBeNever()
    expect(true).toBe(true)
  })
})
