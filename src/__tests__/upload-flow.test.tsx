// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, act, cleanup } from '@testing-library/react'

afterEach(cleanup)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={href}>{children}</a>,
}))

const { default: UploadPage } = await import('../../app/dashboard/upload/page')

function mockFile() {
  return new File(['content'], 'pliego.pdf', { type: 'application/pdf' })
}

describe('Upload flow — T5 (REQ-006, RN-004)', () => {
  it('"Iniciar análisis" disabled when no proceso selected', () => {
    const { container } = render(<UploadPage />)
    const btn = container.querySelector('button:disabled') as HTMLButtonElement
    expect(btn?.textContent).toContain('Iniciar análisis')
  })

  it('"Iniciar análisis" disabled when proceso selected but no file', () => {
    const { container } = render(<UploadPage />)
    const select = container.querySelector('select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'LP-2024-00123' } })
    const btn = container.querySelector('button[disabled]') as HTMLButtonElement
    expect(btn?.textContent).toContain('Iniciar análisis')
  })

  it('"Iniciar análisis" enabled when proceso AND file present', () => {
    const { container } = render(<UploadPage />)
    const select = container.querySelector('select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'LP-2024-00123' } })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [mockFile()] } })
    const buttons = Array.from(container.querySelectorAll('button'))
    const iniciar = buttons.find(b => b.textContent?.includes('Iniciar análisis')) as HTMLButtonElement
    expect(iniciar?.disabled).toBe(false)
  })

  it('"Verificar" in URL mode triggers found state after timeout', async () => {
    vi.useFakeTimers()
    const { container } = render(<UploadPage />)
    const modeButtons = Array.from(container.querySelectorAll('button'))
    const urlBtn = modeButtons.find(b => b.textContent?.includes('Pegar URL'))
    fireEvent.click(urlBtn!)
    const input = container.querySelector('input:not([type="file"])') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'LP-2024-00123' } })
    const verificarBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Verificar')
    fireEvent.click(verificarBtn!)
    await act(() => { vi.advanceTimersByTime(900) })
    expect(container.textContent).toContain('Proceso encontrado')
    vi.useRealTimers()
  })
})
