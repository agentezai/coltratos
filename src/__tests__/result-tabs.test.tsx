// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'

afterEach(cleanup)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={href}>{children}</a>,
}))

const { ResultTabs } = await import('../../app/dashboard/analisis/[id]/_components/result-tabs')
import { RESULT_DETAIL } from '../../src/lib/mock/index'

describe('ResultTabs — T7 (REQ-009)', () => {
  it('accordion row toggles body text on click', () => {
    const { container } = render(<ResultTabs result={RESULT_DETAIL} />)
    const rows = container.querySelectorAll('[data-accordion-row]')
    const first = rows[0] as HTMLElement
    const header = first.querySelector('[data-accordion-header]') as HTMLElement
    const body = first.querySelector('[data-accordion-body]') as HTMLElement

    expect(body.hidden).toBe(true)
    fireEvent.click(header)
    expect(body.hidden).toBe(false)
    fireEvent.click(header)
    expect(body.hidden).toBe(true)
  })

  it('tab switching changes active tab', () => {
    const { container } = render(<ResultTabs result={RESULT_DETAIL} />)
    const tabs = container.querySelectorAll('[data-tab]')
    const juridicoTab = Array.from(tabs).find(t => t.textContent?.includes('Jurídico')) as HTMLElement
    const resumenTab = Array.from(tabs).find(t => t.textContent?.includes('Resumen')) as HTMLElement

    fireEvent.click(juridicoTab)
    expect(juridicoTab.getAttribute('data-active')).toBe('true')
    expect(resumenTab.getAttribute('data-active')).not.toBe('true')
  })
})
