// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import type { AnalysisDetail } from '../../src/types/domain/analysis'

afterEach(cleanup)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={href}>{children}</a>,
}))

const { ResultTabs } = await import('../../app/dashboard/analisis/[id]/_components/result-tabs')

/** Minimal AnalysisDetail fixture for T7 accordion/tab tests. */
const DETAIL_FIXTURE: AnalysisDetail = {
  id: 'ANA-2026-00048',
  procesoId: 'proc-001',
  pliegoUploadId: 'plu-001',
  overallVerdict: 'amarillo',
  procesoLookupStatus: 'verified',
  procesoMetadata: {
    numero_proceso: 'LP-2024-00123',
    entidad: 'Alcaldía de Medellín',
    objeto_a_contratar: 'Suministro de equipos de cómputo',
    modalidad: 'licitacion_publica',
    cuantia_proceso: 2450000000,
    fecha_de_publicacion_del_proceso: '2024-01-15',
    fecha_limite_de_recepcion: '2026-05-15',
    secop_url: null,
  },
  extractionStatus: 'completed',
  extractionStage: null,
  pagesFlagged: 0,
  flaggedPagesList: [],
  costUsd: 0.03,
  latencyMs: 4500,
  createdAt: '2026-04-28T10:34:00Z',
  pliegoSha256: 'abc123',
  pliegoStorageKey: 'companies/comp-1/pliegos/abc123.pdf',
  requisitos: [
    {
      id: 'req-001',
      tipo: 'juridico',
      texto: 'Existencia y representación legal',
      quoteFuente: 'El proponente debe acreditar personería jurídica.',
      paginaFuente: 5,
      verdict: { value: 'verde', reason: 'RUP activo y representante legal vigente.', confidence: 0.95 },
    },
    {
      id: 'req-002',
      tipo: 'financiero',
      texto: 'Indicador de liquidez ≥ 1.5',
      quoteFuente: null,
      paginaFuente: null,
      verdict: { value: 'amarillo', reason: 'Liquidez en límite, requiere verificación.', confidence: 0.7 },
    },
    {
      id: 'req-003',
      tipo: 'tecnico',
      texto: 'Personal técnico clave certificado',
      quoteFuente: 'El proponente debe acreditar ingeniero con experiencia mínima de 5 años.',
      paginaFuente: 18,
      verdict: { value: 'verde', reason: 'Equipo técnico cumple requisitos.', confidence: 0.9 },
    },
  ],
  feedbackByMe: { rating: null, comment: null },
}

describe('ResultTabs — T7 (REQ-009)', () => {
  it('accordion row toggles body text on click', () => {
    const { container } = render(<ResultTabs detail={DETAIL_FIXTURE} />)
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
    const { container } = render(<ResultTabs detail={DETAIL_FIXTURE} />)
    const tabs = container.querySelectorAll('[data-tab]')
    const juridicoTab = Array.from(tabs).find(t => t.textContent?.includes('Jurídico')) as HTMLElement
    const resumenTab = Array.from(tabs).find(t => t.textContent?.includes('Resumen')) as HTMLElement

    fireEvent.click(juridicoTab)
    expect(juridicoTab.getAttribute('data-active')).toBe('true')
    expect(resumenTab.getAttribute('data-active')).not.toBe('true')
  })
})
