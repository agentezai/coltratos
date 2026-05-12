// @vitest-environment jsdom
/**
 * T17: ExtractionWarning + WarningBanner — TDD contract (contract.md § T17)
 *
 * Behaviors:
 * 1. Banner appears above verdict when pages_flagged > 0 (RN-010)
 * 2. Banner appears when extraction_status = 'partial'
 * 3. Banner has no dismiss button (non-dismissible by design — RN-010)
 * 4. "Ver páginas afectadas" opens drawer with page list
 * 5. Failed extraction replaces verdict banner with red banner + CTA
 *
 * WarningBanner DS primitive:
 * 6. Renders amber variant with title + description
 * 7. Renders red variant with correct color classes
 * 8. Renders optional action button
 * 9. Dismissible prop shows close button; non-dismissible hides it
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, screen } from '@testing-library/react'
import type { AnalysisDetail } from '../../src/types/domain/analysis'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock(
  '../../app/dashboard/analisis/[id]/_actions/rerun-analysis',
  () => ({ rerunAnalysis: vi.fn() })
)

afterEach(cleanup)

const { WarningBanner } = await import(
  '../../src/components/ui/warning-banner'
)

const { ExtractionWarning } = await import(
  '../../app/dashboard/analisis/[id]/_components/extraction-warning'
)

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeDetail(
  overrides: Partial<AnalysisDetail> = {}
): AnalysisDetail {
  return {
    id: 'ana-001',
    procesoId: 'proc-001',
    pliegoUploadId: 'plu-001',
    overallVerdict: 'amarillo',
    procesoLookupStatus: 'verified',
    procesoMetadata: {
      numero_proceso: 'LP-2024-001',
      entidad: 'Entidad Prueba',
      objeto_a_contratar: 'Objeto de prueba',
      modalidad: 'Licitación Pública',
      cuantia_proceso: null,
      fecha_de_publicacion_del_proceso: null,
      fecha_limite_de_recepcion: null,
      secop_url: null,
    },
    extractionStatus: 'completed',
    extractionStage: null,
    pagesFlagged: 0,
    flaggedPagesList: [],
    costUsd: null,
    latencyMs: null,
    createdAt: new Date().toISOString(),
    pliegoSha256: 'abc123',
    pliegoStorageKey: 'companies/c1/pliegos/abc123.pdf',
    requisitos: [],
    feedbackByMe: { rating: null, comment: null },
    ...overrides,
  }
}

// ─── WarningBanner DS primitive ──────────────────────────────────────────────

describe('WarningBanner — DS primitive', () => {
  it('renders amber variant with title and description', () => {
    const { getByTestId } = render(
      <WarningBanner
        variant="amber"
        title="Análisis parcial"
        description="Algunas páginas no fueron legibles."
      />
    )
    const el = getByTestId('warning-banner')
    expect(el.getAttribute('data-variant')).toBe('amber')
    expect(el.textContent).toContain('Análisis parcial')
    expect(el.textContent).toContain('Algunas páginas no fueron legibles.')
  })

  it('renders red variant with correct data-variant attribute', () => {
    const { getByTestId } = render(
      <WarningBanner
        variant="red"
        title="Análisis fallido"
        description="No fue posible extraer los requisitos."
      />
    )
    expect(getByTestId('warning-banner').getAttribute('data-variant')).toBe('red')
  })

  it('renders optional action button when action prop provided', () => {
    const onClick = vi.fn()
    const { getByRole } = render(
      <WarningBanner
        variant="amber"
        title="Alerta"
        description="Detalle."
        action={{ label: 'Ver páginas afectadas', onClick }}
      />
    )
    const btn = getByRole('button', { name: 'Ver páginas afectadas' })
    expect(btn).toBeTruthy()
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not render close button when dismissible is false (default)', () => {
    const { queryByRole } = render(
      <WarningBanner
        variant="amber"
        title="Alerta"
        description="Detalle."
      />
    )
    // No close/dismiss button
    expect(queryByRole('button', { name: /cerrar|dismiss/i })).toBeNull()
  })

  it('renders close button when dismissible=true', () => {
    const { queryByRole } = render(
      <WarningBanner
        variant="amber"
        title="Alerta"
        description="Detalle."
        dismissible
      />
    )
    expect(queryByRole('button', { name: /cerrar/i })).not.toBeNull()
  })
})

// ─── ExtractionWarning component ─────────────────────────────────────────────

describe('ExtractionWarning — T17 (RN-010, REQ-027)', () => {
  it('renders amber banner when pages_flagged > 0', () => {
    const detail = makeDetail({ pagesFlagged: 3, flaggedPagesList: [5, 8, 12] })
    const { getByTestId } = render(<ExtractionWarning detail={detail} />)
    const banner = getByTestId('warning-banner')
    expect(banner.getAttribute('data-variant')).toBe('amber')
    expect(banner.textContent).toContain('3')
  })

  it('renders amber banner when extraction_status = partial (even if pages_flagged = 0)', () => {
    const detail = makeDetail({ extractionStatus: 'partial', pagesFlagged: 0 })
    const { getByTestId } = render(<ExtractionWarning detail={detail} />)
    expect(getByTestId('warning-banner').getAttribute('data-variant')).toBe('amber')
  })

  it('renders nothing when status=completed and pages_flagged=0', () => {
    const detail = makeDetail({ extractionStatus: 'completed', pagesFlagged: 0 })
    const { container } = render(<ExtractionWarning detail={detail} />)
    expect(container.firstChild).toBeNull()
  })

  it('banner has no dismiss button on partial branch (RN-010)', () => {
    const detail = makeDetail({ pagesFlagged: 2, flaggedPagesList: [3, 7] })
    const { queryByRole } = render(<ExtractionWarning detail={detail} />)
    expect(queryByRole('button', { name: /cerrar|dismiss/i })).toBeNull()
  })

  it('"Ver páginas afectadas" button opens drawer with flagged page list', () => {
    const detail = makeDetail({ pagesFlagged: 2, flaggedPagesList: [5, 10] })
    render(<ExtractionWarning detail={detail} />)

    const btn = screen.getByRole('button', { name: /ver páginas afectadas/i })
    fireEvent.click(btn)

    // Drawer is now open — page numbers visible
    expect(screen.getByTestId('flagged-pages-drawer')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
    expect(screen.getByText('10')).toBeTruthy()
  })

  it('failed state: red banner with "Volver a analizar" CTA', () => {
    const detail = makeDetail({ extractionStatus: 'failed' })
    const { getByTestId, getByRole } = render(<ExtractionWarning detail={detail} />)
    const banner = getByTestId('warning-banner')
    expect(banner.getAttribute('data-variant')).toBe('red')
    expect(banner.textContent).toContain('Análisis fallido')
    expect(getByRole('button', { name: /volver a analizar/i })).toBeTruthy()
  })
})
