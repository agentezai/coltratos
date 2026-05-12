// @vitest-environment jsdom
/**
 * T15: PdfViewer tests
 * Contracts: REQ-023 (quote-not-found chip), NFR-06 (responsive layout)
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'

afterEach(cleanup)

// ── Mock react-pdf ────────────────────────────────────────────────────────────
// react-pdf uses Worker and canvas APIs not available in jsdom.
// We stub the minimal API surface needed for behavioral tests.
vi.mock('react-pdf', async () => {
  const { useEffect } = await import('react')
  return {
    Document: ({ onLoadSuccess, children }: { onLoadSuccess?: (pdf: { numPages: number }) => void; children: React.ReactNode }) => {
      // Simulate successful load with 20 pages (via effect to avoid render-phase update)
      useEffect(() => {
        if (onLoadSuccess) onLoadSuccess({ numPages: 20 })
      }, []) // eslint-disable-line react-hooks/exhaustive-deps
      return <div data-testid="pdf-document">{children}</div>
    },
    Page: ({ pageNumber, onRenderTextLayerSuccess }: { pageNumber: number; onRenderTextLayerSuccess?: () => void }) => {
      // Call text layer success callback after mount (avoids render-phase state update)
      useEffect(() => {
        if (onRenderTextLayerSuccess) onRenderTextLayerSuccess()
      }, [pageNumber]) // eslint-disable-line react-hooks/exhaustive-deps
      return <div data-testid="pdf-page" data-page-number={pageNumber} />
    },
    pdfjs: {
      GlobalWorkerOptions: { workerSrc: '' },
      version: '4.0.0',
    },
  }
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PdfViewer (T15 — REQ-023)', () => {
  it('opens to initialPage', async () => {
    const { PdfViewer } = await import('../../src/components/ui/pdf-viewer')
    const { getByTestId } = render(
      <PdfViewer
        open={true}
        onClose={() => {}}
        signedUrl="https://example.com/pliego.pdf"
        initialPage={5}
        highlightQuote={null}
      />
    )
    // Page mock renders synchronously with the given pageNumber prop
    await waitFor(() => {
      const page = getByTestId('pdf-page')
      expect(page.getAttribute('data-page-number')).toBe('5')
    })
  })

  it('renders "Cita no encontrada" chip when quote is not found in rendered text', async () => {
    const { PdfViewer } = await import('../../src/components/ui/pdf-viewer')
    // The chip renders optimistically (synchronous) when highlightQuote is
    // non-null — the text layer callback would only HIDE it if the quote is
    // found. Since the mock Page has no text layer, the chip stays visible.
    const { container } = render(
      <PdfViewer
        open={true}
        onClose={() => {}}
        signedUrl="https://example.com/pliego.pdf"
        initialPage={3}
        highlightQuote="TEXTO_QUE_NO_EXISTE_EN_EL_PDF_XYZ"
      />
    )
    const chip = container.querySelector('[data-quote-not-found="true"]')
    expect(chip).toBeTruthy()
    expect(chip!.textContent).toContain('Cita no encontrada en esta página')
  })

  it('does NOT render quote-not-found chip when highlightQuote is null', async () => {
    const { PdfViewer } = await import('../../src/components/ui/pdf-viewer')
    const { container } = render(
      <PdfViewer
        open={true}
        onClose={() => {}}
        signedUrl="https://example.com/pliego.pdf"
        initialPage={1}
        highlightQuote={null}
      />
    )
    // quoteNotFound starts as false when highlightQuote is null — chip never shown
    const chip = container.querySelector('[data-quote-not-found="true"]')
    expect(chip).toBeNull()
  })

  it('does not render anything when open=false', async () => {
    const { PdfViewer } = await import('../../src/components/ui/pdf-viewer')
    const { container } = render(
      <PdfViewer
        open={false}
        onClose={() => {}}
        signedUrl="https://example.com/pliego.pdf"
        initialPage={1}
        highlightQuote={null}
      />
    )
    // Viewer should not mount PDF content when closed
    expect(container.querySelector('[data-pdf-viewer="true"]')).toBeNull()
  })
})
