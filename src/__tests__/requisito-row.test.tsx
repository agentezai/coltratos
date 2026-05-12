// @vitest-environment jsdom
/**
 * T14: RequisitoRow + CitationBlock tests
 * Contracts: REQ-022, RN-008
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.setConfig({ testTimeout: 15000 })
import { render, fireEvent, cleanup } from '@testing-library/react'
import type { RequisitoView } from '../../src/types/domain/analysis'

afterEach(cleanup)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const REQ_WITH_CITATION: RequisitoView = {
  id: 'req-cit-001',
  tipo: 'juridico',
  texto: 'El proponente debe acreditar personería jurídica vigente.',
  quoteFuente: 'El proponente debe estar constituido como persona jurídica al momento de la presentación de la oferta.',
  paginaFuente: 12,
  verdict: {
    value: 'verde',
    reason: 'RUP activo y representante legal vigente.',
    confidence: 0.95,
  },
}

// REQ_MISSING_CITATION is a reference fixture — used implicitly via the null
// quoteFuente/paginaFuente path tests below.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const REQ_MISSING_CITATION: RequisitoView = {
  id: 'req-cit-002',
  tipo: 'financiero',
  texto: 'Indicador de liquidez ≥ 1.5',
  quoteFuente: null,
  paginaFuente: null,
  verdict: {
    value: 'amarillo',
    reason: 'No se encontró cita en el pliego.',
    confidence: 0.6,
  },
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RequisitoRow (T14 — REQ-022)', () => {
  it('collapsed: truncates texto to 1 line via line-clamp-1', async () => {
    const { RequisitoRow } = await import(
      '../../app/dashboard/analisis/[id]/_components/requisito-row'
    )
    const { container } = render(
      <RequisitoRow requisito={REQ_WITH_CITATION} onOpenPdf={() => {}} />
    )
    const texto = container.querySelector('[data-req-texto]') as HTMLElement
    expect(texto.classList.contains('line-clamp-1')).toBe(true)
  })

  it('collapsed: shows SemPill and confidence indicator', async () => {
    const { RequisitoRow } = await import(
      '../../app/dashboard/analisis/[id]/_components/requisito-row'
    )
    const { container } = render(
      <RequisitoRow requisito={REQ_WITH_CITATION} onOpenPdf={() => {}} />
    )
    // SemPill renders a Chip with data-component="chip"
    const chip = container.querySelector('[data-component="chip"]')
    expect(chip).toBeTruthy()
    // Confidence indicator
    const conf = container.querySelector('[data-confidence-indicator]')
    expect(conf).toBeTruthy()
  })

  it('clicking header expands the row and shows body', async () => {
    const { RequisitoRow } = await import(
      '../../app/dashboard/analisis/[id]/_components/requisito-row'
    )
    const { container } = render(
      <RequisitoRow requisito={REQ_WITH_CITATION} onOpenPdf={() => {}} />
    )
    const header = container.querySelector('[data-accordion-header]') as HTMLElement
    const body = container.querySelector('[data-accordion-body]') as HTMLElement

    expect(body.hidden).toBe(true)
    fireEvent.click(header)
    expect(body.hidden).toBe(false)
  })

  it('expanded: shows verdict reason text', async () => {
    const { RequisitoRow } = await import(
      '../../app/dashboard/analisis/[id]/_components/requisito-row'
    )
    const { container } = render(
      <RequisitoRow requisito={REQ_WITH_CITATION} onOpenPdf={() => {}} />
    )
    const header = container.querySelector('[data-accordion-header]') as HTMLElement
    fireEvent.click(header)
    const reason = container.querySelector('[data-req-reason]') as HTMLElement
    expect(reason.textContent).toContain('RUP activo y representante legal vigente.')
  })
})

describe('CitationBlock (T14 — REQ-022)', () => {
  it('renders quote in italic with left-border accent', async () => {
    const { CitationBlock } = await import(
      '../../app/dashboard/analisis/[id]/_components/citation-block'
    )
    const { container } = render(
      <CitationBlock
        quoteFuente="El proponente debe estar constituido como persona jurídica."
        paginaFuente={12}
        onOpenPdf={() => {}}
      />
    )
    const quoteEl = container.querySelector('[data-citation-quote]') as HTMLElement
    expect(quoteEl).toBeTruthy()
    expect(quoteEl.classList.contains('italic')).toBe(true)

    // Left-border accent on container
    const blockEl = container.querySelector('[data-citation-block]') as HTMLElement
    expect(blockEl.className).toMatch(/border-l-4/)
  })

  it('footer reads "Página 12 del pliego"', async () => {
    const { CitationBlock } = await import(
      '../../app/dashboard/analisis/[id]/_components/citation-block'
    )
    const { container } = render(
      <CitationBlock
        quoteFuente="El proponente debe estar constituido como persona jurídica."
        paginaFuente={12}
        onOpenPdf={() => {}}
      />
    )
    const footer = container.querySelector('[data-citation-footer]') as HTMLElement
    expect(footer.textContent).toContain('Página 12 del pliego')
  })

  it('renders "Abrir página en PDF" button', async () => {
    const { CitationBlock } = await import(
      '../../app/dashboard/analisis/[id]/_components/citation-block'
    )
    const { container } = render(
      <CitationBlock
        quoteFuente="Cita de prueba."
        paginaFuente={5}
        onOpenPdf={() => {}}
      />
    )
    const btn = container.querySelector('[data-open-pdf]') as HTMLElement
    expect(btn).toBeTruthy()
    expect(btn.textContent).toContain('Abrir página en PDF')
  })

  it('missing citation (RN-008): renders fallback copy', async () => {
    const { CitationBlock } = await import(
      '../../app/dashboard/analisis/[id]/_components/citation-block'
    )
    const { container } = render(
      <CitationBlock
        quoteFuente={null}
        paginaFuente={null}
        onOpenPdf={() => {}}
      />
    )
    const fallback = container.querySelector('[data-citation-fallback]') as HTMLElement
    expect(fallback).toBeTruthy()
    expect(fallback.textContent).toContain('Cita no disponible')
    expect(fallback.textContent).toContain('verifica manualmente en el pliego')
  })
})

describe('Confidence indicator (T14)', () => {
  it('renders full-fill for confidence >= 0.9', async () => {
    const { RequisitoRow } = await import(
      '../../app/dashboard/analisis/[id]/_components/requisito-row'
    )
    const req: RequisitoView = {
      ...REQ_WITH_CITATION,
      verdict: { value: 'verde', reason: 'ok', confidence: 0.95 },
    }
    const { container } = render(<RequisitoRow requisito={req} onOpenPdf={() => {}} />)
    const conf = container.querySelector('[data-confidence-indicator]') as HTMLElement
    expect(conf.getAttribute('data-confidence-level')).toBe('full')
  })

  it('renders two-thirds fill for confidence in 0.75–0.89', async () => {
    const { RequisitoRow } = await import(
      '../../app/dashboard/analisis/[id]/_components/requisito-row'
    )
    const req: RequisitoView = {
      ...REQ_WITH_CITATION,
      verdict: { value: 'verde', reason: 'ok', confidence: 0.8 },
    }
    const { container } = render(<RequisitoRow requisito={req} onOpenPdf={() => {}} />)
    const conf = container.querySelector('[data-confidence-indicator]') as HTMLElement
    expect(conf.getAttribute('data-confidence-level')).toBe('two-thirds')
  })

  it('renders one-third fill for confidence in 0.6–0.74', async () => {
    const { RequisitoRow } = await import(
      '../../app/dashboard/analisis/[id]/_components/requisito-row'
    )
    const req: RequisitoView = {
      ...REQ_WITH_CITATION,
      verdict: { value: 'amarillo', reason: 'ok', confidence: 0.65 },
    }
    const { container } = render(<RequisitoRow requisito={req} onOpenPdf={() => {}} />)
    const conf = container.querySelector('[data-confidence-indicator]') as HTMLElement
    expect(conf.getAttribute('data-confidence-level')).toBe('one-third')
  })

  it('renders empty fill for confidence < 0.6', async () => {
    const { RequisitoRow } = await import(
      '../../app/dashboard/analisis/[id]/_components/requisito-row'
    )
    const req: RequisitoView = {
      ...REQ_WITH_CITATION,
      verdict: { value: 'rojo', reason: 'ok', confidence: 0.4 },
    }
    const { container } = render(<RequisitoRow requisito={req} onOpenPdf={() => {}} />)
    const conf = container.querySelector('[data-confidence-indicator]') as HTMLElement
    expect(conf.getAttribute('data-confidence-level')).toBe('empty')
  })
})

describe('ResultTabs Resumen severity sort (T14)', () => {
  it('sorts Resumen tab: rojo first, then amarillo, then verde', async () => {
    const { ResultTabs } = await import(
      '../../app/dashboard/analisis/[id]/_components/result-tabs'
    )
    const detail = {
      id: 'ANA-sort',
      procesoId: 'proc-001',
      pliegoUploadId: 'plu-001',
      overallVerdict: 'amarillo' as const,
      procesoLookupStatus: 'verified' as const,
      procesoMetadata: {
        numero_proceso: 'LP-2024-00123',
        entidad: 'Entidad',
        objeto_a_contratar: 'Suministro',
        modalidad: 'licitacion_publica',
        cuantia_proceso: null,
        fecha_de_publicacion_del_proceso: null,
        fecha_limite_de_recepcion: null,
        secop_url: null,
      },
      extractionStatus: 'completed' as const,
      extractionStage: null,
      pagesFlagged: 0,
      flaggedPagesList: [],
      costUsd: null,
      latencyMs: null,
      createdAt: '2026-04-28T10:34:00Z',
      pliegoSha256: 'abc123',
      pliegoStorageKey: 'companies/comp-1/pliegos/abc123.pdf',
      requisitos: [
        { id: 'r1', tipo: 'juridico' as const, texto: 'Verde req', quoteFuente: null, paginaFuente: null, verdict: { value: 'verde' as const, reason: 'ok', confidence: 0.9 } },
        { id: 'r2', tipo: 'tecnico' as const, texto: 'Rojo req', quoteFuente: null, paginaFuente: null, verdict: { value: 'rojo' as const, reason: 'fail', confidence: 0.9 } },
        { id: 'r3', tipo: 'financiero' as const, texto: 'Amarillo req', quoteFuente: null, paginaFuente: null, verdict: { value: 'amarillo' as const, reason: 'partial', confidence: 0.7 } },
      ],
      feedbackByMe: { rating: null, comment: null },
    }

    const { container } = render(<ResultTabs detail={detail} />)
    const rows = container.querySelectorAll('[data-accordion-row]')
    // Resumen is default tab — should be sorted rojo → amarillo → verde
    expect(rows.length).toBe(3)
    const firstRow = rows[0] as HTMLElement
    const secondRow = rows[1] as HTMLElement
    const thirdRow = rows[2] as HTMLElement

    // Each row should have a data-requisito-id matching sort order
    expect(firstRow.getAttribute('data-requisito-id')).toBe('r2') // rojo
    expect(secondRow.getAttribute('data-requisito-id')).toBe('r3') // amarillo
    expect(thirdRow.getAttribute('data-requisito-id')).toBe('r1') // verde
  })

  it('tipo tabs filter by requisito.tipo', async () => {
    const { ResultTabs } = await import(
      '../../app/dashboard/analisis/[id]/_components/result-tabs'
    )
    const detail = {
      id: 'ANA-filter',
      procesoId: 'proc-001',
      pliegoUploadId: 'plu-001',
      overallVerdict: 'amarillo' as const,
      procesoLookupStatus: 'verified' as const,
      procesoMetadata: {
        numero_proceso: 'LP-2024-00123',
        entidad: 'Entidad',
        objeto_a_contratar: 'Suministro',
        modalidad: 'licitacion_publica',
        cuantia_proceso: null,
        fecha_de_publicacion_del_proceso: null,
        fecha_limite_de_recepcion: null,
        secop_url: null,
      },
      extractionStatus: 'completed' as const,
      extractionStage: null,
      pagesFlagged: 0,
      flaggedPagesList: [],
      costUsd: null,
      latencyMs: null,
      createdAt: '2026-04-28T10:34:00Z',
      pliegoSha256: 'abc123',
      pliegoStorageKey: 'companies/comp-1/pliegos/abc123.pdf',
      requisitos: [
        { id: 'j1', tipo: 'juridico' as const, texto: 'Juridico req', quoteFuente: null, paginaFuente: null, verdict: { value: 'verde' as const, reason: 'ok', confidence: 0.9 } },
        { id: 't1', tipo: 'tecnico' as const, texto: 'Tecnico req', quoteFuente: null, paginaFuente: null, verdict: { value: 'verde' as const, reason: 'ok', confidence: 0.9 } },
        { id: 'f1', tipo: 'financiero' as const, texto: 'Financiero req', quoteFuente: null, paginaFuente: null, verdict: { value: 'verde' as const, reason: 'ok', confidence: 0.9 } },
      ],
      feedbackByMe: { rating: null, comment: null },
    }

    const { container } = render(<ResultTabs detail={detail} />)
    const tabs = container.querySelectorAll('[data-tab]')
    const juridicoTab = Array.from(tabs).find(t => t.textContent?.includes('Jurídico')) as HTMLElement
    fireEvent.click(juridicoTab)

    const rows = container.querySelectorAll('[data-accordion-row]')
    expect(rows.length).toBe(1)
    expect((rows[0] as HTMLElement).getAttribute('data-requisito-id')).toBe('j1')
  })
})

describe('Quote DS primitive (T14)', () => {
  it('renders children as blockquote with accent border', async () => {
    const { Quote } = await import('../../src/components/ui/quote')
    const { container } = render(
      <Quote accent="border-blue-200">
        Este es el texto de la cita del pliego.
      </Quote>
    )
    const el = container.querySelector('[data-component="quote"]') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.tagName.toLowerCase()).toBe('blockquote')
    expect(el.className).toMatch(/border-blue-200/)
    expect(el.textContent).toContain('Este es el texto de la cita del pliego.')
  })

  it('renders attribution when provided', async () => {
    const { Quote } = await import('../../src/components/ui/quote')
    const { container } = render(
      <Quote accent="border-amber-200" attribution="Página 7 del pliego">
        Cita de prueba.
      </Quote>
    )
    const attr = container.querySelector('[data-quote-attribution]') as HTMLElement
    expect(attr).toBeTruthy()
    expect(attr.textContent).toContain('Página 7 del pliego')
  })
})
