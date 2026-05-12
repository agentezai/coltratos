// @vitest-environment jsdom
/**
 * T12: ProcesoHeader — TDD contract (contract.md § T12)
 *
 * Behavior: Renders verified branch (REQ-014)
 * Behavior: Renders unverified branch (RN-009)
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import type { AnalysisDetail } from '../../src/types/domain/analysis'

afterEach(cleanup)

const { ProcesoHeader } = await import(
  '../../app/dashboard/analisis/[id]/_components/proceso-header'
)

// ─── Fixtures ────────────────────────────────────────────────────────────────

const BASE_META: AnalysisDetail['procesoMetadata'] = {
  numero_proceso: 'LP-2024-00123',
  entidad: 'Alcaldía de Medellín',
  objeto_a_contratar: 'Suministro de equipos de cómputo para las instituciones educativas del municipio de Medellín',
  modalidad: 'Licitación Pública',
  cuantia_proceso: 2450000000,
  fecha_de_publicacion_del_proceso: '2024-03-01T00:00:00Z',
  fecha_limite_de_recepcion: '2024-04-15T17:00:00Z',
  secop_url: null,
}

const VERIFIED_DETAIL: Pick<AnalysisDetail, 'procesoLookupStatus' | 'procesoMetadata'> = {
  procesoLookupStatus: 'verified',
  procesoMetadata: BASE_META,
}

const UNVERIFIED_DETAIL: Pick<AnalysisDetail, 'procesoLookupStatus' | 'procesoMetadata'> = {
  procesoLookupStatus: 'unverified',
  procesoMetadata: BASE_META,
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ProcesoHeader — T12 (REQ-014, RN-009)', () => {
  describe('verified branch', () => {
    it('shows all 5 metadata fields', () => {
      const { getByText } = render(<ProcesoHeader detail={VERIFIED_DETAIL as AnalysisDetail} />)
      // Entidad
      getByText('Alcaldía de Medellín')
      // Modalidad chip
      getByText('Licitación Pública')
      // Valor estimado — formatted COP
      getByText(/2\.450\.000\.000/)
      // Fecha de cierre — formatted
      getByText(/15 abr\.? 2024|15 Abr\.? 2024|abr.+2024/i)
    })

    it('renders the Ver en SECOP II link with encoded numero_proceso href', () => {
      const { getByRole } = render(<ProcesoHeader detail={VERIFIED_DETAIL as AnalysisDetail} />)
      const link = getByRole('link', { name: /ver en secop ii/i })
      expect(link).toBeTruthy()
      const expectedHref = `https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=${encodeURIComponent('LP-2024-00123')}`
      expect(link.getAttribute('href')).toBe(expectedHref)
      expect(link.getAttribute('target')).toBe('_blank')
    })

    it('does NOT render the "Datos ingresados manualmente" badge', () => {
      const { queryByText } = render(<ProcesoHeader detail={VERIFIED_DETAIL as AnalysisDetail} />)
      expect(queryByText(/datos ingresados manualmente/i)).toBeNull()
    })

    it('objeto truncates with line-clamp-2 class', () => {
      const { container } = render(<ProcesoHeader detail={VERIFIED_DETAIL as AnalysisDetail} />)
      const objEl = container.querySelector('[data-field="objeto"]')
      expect(objEl?.className).toMatch(/line-clamp-2/)
    })
  })

  describe('unverified branch', () => {
    it('shows the "Datos ingresados manualmente" amber chip', () => {
      const { getByText } = render(<ProcesoHeader detail={UNVERIFIED_DETAIL as AnalysisDetail} />)
      getByText(/datos ingresados manualmente/i)
    })

    it('shows "No disponible" instead of the SECOP II link', () => {
      const { queryByRole, getByText } = render(
        <ProcesoHeader detail={UNVERIFIED_DETAIL as AnalysisDetail} />
      )
      // Link must be absent
      expect(queryByRole('link', { name: /ver en secop ii/i })).toBeNull()
      // Static fallback text visible
      getByText(/no disponible/i)
    })
  })
})
