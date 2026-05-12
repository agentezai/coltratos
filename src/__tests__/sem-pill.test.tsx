// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'

afterEach(cleanup)

const { SemPill } = await import('../../src/components/page/sem-pill')

describe('SemPill — T2 (RN-002) legacy values', () => {
  it('eligible → green chip with "Elegible"', () => {
    const { container, getByText } = render(<SemPill status="eligible" />)
    getByText('Elegible')
    expect(container.querySelector('[data-component="chip"]')?.className).toContain('green')
  })

  it('conditional → amber chip with "Con observaciones"', () => {
    const { container, getByText } = render(<SemPill status="conditional" />)
    getByText('Con observaciones')
    expect(container.querySelector('[data-component="chip"]')?.className).toContain('amber')
  })

  it('not-eligible → red chip with "No elegible"', () => {
    const { container, getByText } = render(<SemPill status="not-eligible" />)
    getByText('No elegible')
    expect(container.querySelector('[data-component="chip"]')?.className).toContain('red')
  })
})

/**
 * T13 — canonical semáforo values (RN-002, contract.md § T13)
 */
describe('SemPill — T13 (RN-002) canonical values', () => {
  it('verde → green chip with "Cumple"', () => {
    const { container, getByText } = render(<SemPill status="verde" />)
    getByText('Cumple')
    expect(container.querySelector('[data-component="chip"]')?.className).toContain('green')
  })

  it('amarillo → amber chip with "Con observaciones"', () => {
    const { container, getByText } = render(<SemPill status="amarillo" />)
    getByText('Con observaciones')
    expect(container.querySelector('[data-component="chip"]')?.className).toContain('amber')
  })

  it('rojo → red chip with "No cumple"', () => {
    const { container, getByText } = render(<SemPill status="rojo" />)
    getByText('No cumple')
    expect(container.querySelector('[data-component="chip"]')?.className).toContain('red')
  })
})
