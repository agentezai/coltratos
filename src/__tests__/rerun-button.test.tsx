// @vitest-environment jsdom
/**
 * T16: RerunButton — TDD contract (contract.md § T16)
 *
 * Behaviors tested:
 *  - "Volver a analizar" button is present and clickable
 *  - Click opens confirmation dialog with Spanish copy
 *  - Cancel closes the dialog without calling rerunAnalysis
 *  - Confirm calls rerunAnalysis and navigates to new URL on success
 *  - Error state: error message shown when rerunAnalysis throws
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react'

afterEach(cleanup)

// ── Mock router ───────────────────────────────────────────────────────────────

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// ── Mock server action ────────────────────────────────────────────────────────

const mockRerunAnalysis = vi.fn()

vi.mock(
  '../../app/dashboard/analisis/[id]/_actions/rerun-analysis',
  () => ({
    rerunAnalysis: mockRerunAnalysis,
  })
)

// ── Import under test ─────────────────────────────────────────────────────────

const { RerunButton } = await import(
  '../../app/dashboard/analisis/[id]/_components/rerun-button'
)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RerunButton — T16 (REQ-024, RN-007)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Volver a analizar" button', () => {
    const { getByRole } = render(<RerunButton analysisId="ana-001" />)
    expect(getByRole('button', { name: /volver a analizar/i })).not.toBeNull()
  })

  it('shows confirmation dialog with Spanish copy on click', async () => {
    const { getByRole, getAllByText } = render(<RerunButton analysisId="ana-001" />)

    fireEvent.click(getByRole('button', { name: /volver a analizar/i }))

    await waitFor(() => {
      // Dialog title and body both mention "nuevo análisis" — use getAllByText
      expect(getAllByText(/nuevo análisis/i).length).toBeGreaterThan(0)
      expect(
        getAllByText(/análisis original se mantendrá/i).length
      ).toBeGreaterThan(0)
    })
  })

  it('closes dialog and does NOT call rerunAnalysis when cancel is clicked', async () => {
    const { getByRole, getByText } = render(<RerunButton analysisId="ana-001" />)

    fireEvent.click(getByRole('button', { name: /volver a analizar/i }))

    await waitFor(() => {
      expect(getByText(/análisis original se mantendrá/i)).not.toBeNull()
    })

    fireEvent.click(getByRole('button', { name: /cancelar/i }))

    await waitFor(() => {
      expect(mockRerunAnalysis).not.toHaveBeenCalled()
    })
  })

  it('calls rerunAnalysis and navigates to new analysis URL on confirm', async () => {
    mockRerunAnalysis.mockResolvedValue({ id: 'ana-002' })

    const { getByRole, getByText } = render(<RerunButton analysisId="ana-001" />)

    fireEvent.click(getByRole('button', { name: /volver a analizar/i }))

    await waitFor(() => {
      expect(getByText(/análisis original se mantendrá/i)).not.toBeNull()
    })

    fireEvent.click(getByRole('button', { name: /confirmar/i }))

    await waitFor(() => {
      expect(mockRerunAnalysis).toHaveBeenCalledWith('ana-001')
      expect(mockPush).toHaveBeenCalledWith('/dashboard/analisis/ana-002')
    })
  })

  it('shows error message and stays on page when rerunAnalysis throws', async () => {
    mockRerunAnalysis.mockRejectedValue(new Error('NotFoundError'))

    const { getByRole, getByText, findByText } = render(
      <RerunButton analysisId="ana-001" />
    )

    fireEvent.click(getByRole('button', { name: /volver a analizar/i }))

    await waitFor(() => {
      expect(getByText(/análisis original se mantendrá/i)).not.toBeNull()
    })

    fireEvent.click(getByRole('button', { name: /confirmar/i }))

    const errorMsg = await findByText(/error/i)
    expect(errorMsg).not.toBeNull()

    // Must not navigate away
    expect(mockPush).not.toHaveBeenCalled()
  })
})
