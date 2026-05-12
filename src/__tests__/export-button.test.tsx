// @vitest-environment jsdom
/**
 * T19: ExportButton — TDD contract (contract.md § T19)
 *
 * Behavior: Disabled placeholder when `report-export` not shipped (REQ-025)
 *
 * The NEXT_PUBLIC_REPORT_EXPORT_ENABLED env var controls Mode A vs Mode B.
 * In all current tests we run Mode B (flag absent / false) — Mode A is
 * verified manually once the `report-export` feature ships.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'

afterEach(cleanup)

describe('ExportButton — T19 (REQ-025)', () => {
  describe('Mode B — report-export not shipped (REPORT_EXPORT_ENABLED=false)', () => {
    beforeEach(() => {
      // Ensure the env var is absent / false for Mode B tests
      vi.stubEnv('NEXT_PUBLIC_REPORT_EXPORT_ENABLED', 'false')
    })

    afterEach(() => {
      vi.unstubAllEnvs()
      // Reset module registry so the feature flag re-evaluates on each test
      vi.resetModules()
    })

    it('renders a button with label "Exportar PDF"', async () => {
      const { ExportButton } = await import(
        '../../app/dashboard/analisis/[id]/_components/export-button'
      )
      render(<ExportButton analysisId="ana-001" />)
      expect(screen.getByRole('button', { name: /exportar pdf/i })).not.toBeNull()
    })

    it('button is disabled', async () => {
      const { ExportButton } = await import(
        '../../app/dashboard/analisis/[id]/_components/export-button'
      )
      render(<ExportButton analysisId="ana-001" />)
      const btn = screen.getByRole('button', { name: /exportar pdf/i })
      expect((btn as HTMLButtonElement).disabled).toBe(true)
    })

    it('tooltip shows "Próximamente" copy (title attribute)', async () => {
      const { ExportButton } = await import(
        '../../app/dashboard/analisis/[id]/_components/export-button'
      )
      render(<ExportButton analysisId="ana-001" />)
      const btn = screen.getByRole('button', { name: /exportar pdf/i })
      expect(btn.getAttribute('title')).toContain('Próximamente')
      expect(btn.getAttribute('title')).toContain(
        'exportar a PDF estará disponible en la siguiente versión'
      )
    })

    it('clicking the disabled button does not throw (no console error)', async () => {
      const { ExportButton } = await import(
        '../../app/dashboard/analisis/[id]/_components/export-button'
      )
      render(<ExportButton analysisId="ana-001" />)
      const btn = screen.getByRole('button', { name: /exportar pdf/i })
      // Native disabled buttons absorb click events; this should not throw
      expect(() => btn.click()).not.toThrow()
    })
  })
})
