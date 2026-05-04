// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

const { SemPill } = await import('../../src/components/page/sem-pill')

describe('SemPill — T2 (RN-002)', () => {
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
