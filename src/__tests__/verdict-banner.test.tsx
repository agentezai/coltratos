// @vitest-environment jsdom
/**
 * T13: VerdictBanner — TDD contract (contract.md § T13)
 *
 * Behavior: No verdict-edit affordance (RN-006)
 * Behavior: Three verdict branches render correct color, title, narrative
 * Behavior: Counts derive deterministically from verdicts array
 *
 * Note: VerdictBanner now renders RerunButton (T16) which calls useRouter().
 * We mock next/navigation here so the test environment doesn't need the
 * full Next.js app router context.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import type { AnalysisDetail, RequisitoView } from '../../src/types/domain/analysis'

// Mock next/navigation — VerdictBanner embeds RerunButton which calls useRouter()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock the server action imported by RerunButton
vi.mock(
  '../../app/dashboard/analisis/[id]/_actions/rerun-analysis',
  () => ({ rerunAnalysis: vi.fn() })
)

afterEach(cleanup)

const { VerdictBanner } = await import(
  '../../app/dashboard/analisis/[id]/_components/verdict-banner'
)

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeRequisito(
  id: string,
  value: 'verde' | 'amarillo' | 'rojo'
): RequisitoView {
  return {
    id,
    tipo: 'juridico',
    texto: `Requisito ${id}`,
    quoteFuente: 'quote',
    paginaFuente: 1,
    verdict: { value, reason: 'razón de prueba', confidence: 0.9 },
  }
}

const BASE_DETAIL: Pick<
  AnalysisDetail,
  | 'id'
  | 'overallVerdict'
  | 'requisitos'
  | 'procesoMetadata'
  | 'feedbackByMe'
> = {
  id: 'ana-001',
  overallVerdict: 'verde',
  requisitos: [
    makeRequisito('r1', 'verde'),
    makeRequisito('r2', 'verde'),
    makeRequisito('r3', 'amarillo'),
  ],
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
  feedbackByMe: { rating: null, comment: null },
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('VerdictBanner — T13 (REQ-012, RN-002, RN-006)', () => {
  describe('Verdict branches: title + color marker', () => {
    it('verde → title "Cumple" + data-verdict="verde"', () => {
      const detail = { ...BASE_DETAIL, overallVerdict: 'verde' as const }
      const { getByTestId, container } = render(
        <VerdictBanner detail={detail as AnalysisDetail} />
      )
      // Title is rendered in data-testid="verdict-title"
      expect(getByTestId('verdict-title').textContent).toBe('Cumple')
      expect(
        container.querySelector('[data-verdict="verde"]')
      ).not.toBeNull()
    })

    it('amarillo → title "Cumple con observaciones" + data-verdict="amarillo"', () => {
      const detail = { ...BASE_DETAIL, overallVerdict: 'amarillo' as const }
      const { getByTestId, container } = render(
        <VerdictBanner detail={detail as AnalysisDetail} />
      )
      expect(getByTestId('verdict-title').textContent).toBe('Cumple con observaciones')
      expect(
        container.querySelector('[data-verdict="amarillo"]')
      ).not.toBeNull()
    })

    it('rojo → title "No cumple" + data-verdict="rojo"', () => {
      const detail = {
        ...BASE_DETAIL,
        overallVerdict: 'rojo' as const,
        requisitos: [
          makeRequisito('r1', 'rojo'),
          makeRequisito('r2', 'rojo'),
        ],
      }
      const { getByTestId, container } = render(
        <VerdictBanner detail={detail as AnalysisDetail} />
      )
      expect(getByTestId('verdict-title').textContent).toBe('No cumple')
      expect(
        container.querySelector('[data-verdict="rojo"]')
      ).not.toBeNull()
    })
  })

  describe('Deterministic counts reducer', () => {
    it('counts verde/amarillo/rojo/total correctly from verdicts array', () => {
      const detail = {
        ...BASE_DETAIL,
        overallVerdict: 'amarillo' as const,
        requisitos: [
          makeRequisito('r1', 'verde'),
          makeRequisito('r2', 'verde'),
          makeRequisito('r3', 'amarillo'),
          makeRequisito('r4', 'rojo'),
        ],
      }
      const { getByTestId } = render(
        <VerdictBanner detail={detail as AnalysisDetail} />
      )
      expect(getByTestId('count-verde').textContent).toBe('2')
      expect(getByTestId('count-amarillo').textContent).toBe('1')
      expect(getByTestId('count-rojo').textContent).toBe('1')
      expect(getByTestId('count-total').textContent).toBe('4')
    })
  })

  describe('No verdict-edit affordance (RN-006)', () => {
    it('renders no textbox, combobox, or slider for verdict editing', () => {
      const { queryAllByRole } = render(
        <VerdictBanner detail={BASE_DETAIL as AnalysisDetail} />
      )
      expect(queryAllByRole('textbox')).toHaveLength(0)
      expect(queryAllByRole('combobox')).toHaveLength(0)
      expect(queryAllByRole('slider')).toHaveLength(0)
    })

    it('has no input that affects the verdict (no <select> or verdict-edit data attribute)', () => {
      const { container } = render(
        <VerdictBanner detail={BASE_DETAIL as AnalysisDetail} />
      )
      // No <select> elements
      expect(container.querySelectorAll('select')).toHaveLength(0)
      // No element with data-verdict-edit
      expect(container.querySelectorAll('[data-verdict-edit]')).toHaveLength(0)
    })
  })
})
