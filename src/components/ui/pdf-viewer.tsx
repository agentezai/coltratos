"use client";

/**
 * PdfViewer DS primitive (T15 — REQ-022, REQ-023, NFR-06, NFR-07)
 *
 * Responsive layout:
 *  < lg viewports : full-screen modal (fixed overlay)
 *  ≥ lg viewports : 50% right-side drawer
 *
 * Wraps react-pdf Document + Page with:
 *  - initialPage navigation
 *  - Text-layer highlight for highlightQuote (text-search strategy, F-2)
 *  - Quote-not-found amber chip when quote is absent from rendered text (REQ-023)
 *
 * NFR-02 exception: react-pdf is a client-only bundle inclusion.
 * Confirmed exception — flagged for /nybo-verify.
 *
 * State design: `PdfViewerInner` is keyed on `${initialPage}-${signedUrl}` so
 * React re-mounts it when the viewer opens a new page/document, avoiding
 * stale-state and `useEffect` calls that set state (which lint disallows).
 */

import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Chip } from "./chip";

// Configure pdf.js worker (cdn — standard next.js app router pattern).
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PdfViewerProps {
  open: boolean;
  onClose: () => void;
  /** Pre-fetched signed URL (never stored across sessions — see T15 spec). */
  signedUrl: string;
  /** 1-indexed page number to jump to on open. */
  initialPage: number;
  /** Quote to highlight in the text layer. null = skip highlight entirely. */
  highlightQuote: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Collapse whitespace and strip leading/trailing punctuation for fuzzy match. */
function normalizeForMatch(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[^\w\d\s]+|[^\w\d\s]+$/g, "")
    .toLowerCase()
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner component (keyed to reset state on open/page/url change)
// ─────────────────────────────────────────────────────────────────────────────

interface PdfViewerInnerProps {
  onClose: () => void;
  signedUrl: string;
  initialPage: number;
  highlightQuote: string | null;
}

function PdfViewerInner({
  onClose,
  signedUrl,
  initialPage,
  highlightQuote,
}: PdfViewerInnerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  /**
   * Optimistic: when highlightQuote is non-null we ASSUME "not found" until
   * the text layer confirms the quote exists.
   * When highlightQuote is null: always false (no chip).
   */
  const [quoteNotFound, setQuoteNotFound] = useState<boolean>(
    highlightQuote !== null
  );

  /**
   * Called by react-pdf's Page when the text layer finishes rendering.
   * Optimistic approach: chip shows by default; hides only if quote is found.
   */
  const handleTextLayerSuccess = useCallback(() => {
    if (!highlightQuote) return;

    const normalizedQuote = normalizeForMatch(highlightQuote);
    const textLayer = document.querySelector(".react-pdf__Page__textContent");

    if (!textLayer) {
      // Text layer unavailable (image-only page) — chip remains visible
      console.warn("[PdfViewer] Text layer not available — quote not found:", highlightQuote);
      return;
    }

    const spans = Array.from(textLayer.querySelectorAll("span"));
    const pageText = normalizeForMatch(spans.map((s) => s.textContent ?? "").join(" "));

    if (!pageText.includes(normalizedQuote)) {
      console.warn("[PdfViewer] Quote not found in rendered text:", highlightQuote);
      return;
    }

    // Quote found — hide chip and apply highlight marks
    setQuoteNotFound(false);
    spans.forEach((span) => {
      const spanText = normalizeForMatch(span.textContent ?? "");
      if (spanText.length > 3 && normalizedQuote.includes(spanText)) {
        span.style.background = "rgb(254 243 199)"; // amber-100
        span.style.borderRadius = "2px";
      }
    });
  }, [highlightQuote]);

  const goToPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNext = () => setCurrentPage((p) => Math.min(numPages || Infinity, p + 1));

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= numPages) {
      setCurrentPage(val);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-graphite-200 flex-none">
        <span className="font-semibold text-graphite-900 text-sm">
          Pliego de condiciones
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar visualizador"
          className="text-graphite-400 hover:text-graphite-700 transition-colors p-1 rounded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Quote-not-found chip (REQ-023) — MUST NOT silently fail */}
      {quoteNotFound && (
        <div className="px-4 pt-2 pb-1 flex-none">
          <span data-quote-not-found="true">
            <Chip variant="amber" dot>
              Cita no encontrada en esta página
            </Chip>
          </span>
        </div>
      )}

      {/* PDF canvas */}
      <div className="flex-1 overflow-auto flex justify-center bg-graphite-50 p-4">
        <Document
          file={signedUrl}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <div className="text-sm text-graphite-400 py-8 text-center">
              Cargando pliego…
            </div>
          }
          error={
            <div className="text-sm text-red-500 py-8 text-center">
              Error al cargar el pliego.
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            onRenderTextLayerSuccess={handleTextLayerSuccess}
            width={
              typeof window !== "undefined"
                ? Math.min(window.innerWidth * 0.9, 800)
                : 600
            }
          />
        </Document>
      </div>

      {/* Navigation */}
      {numPages > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-graphite-200 flex-none bg-white">
          <button
            type="button"
            onClick={goToPrev}
            disabled={currentPage <= 1}
            aria-label="Página anterior"
            className="px-3 py-1.5 text-sm font-medium text-graphite-700 border border-graphite-300 rounded-lg hover:bg-graphite-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>

          <div className="flex items-center gap-2 text-sm text-graphite-600">
            <span>Página</span>
            <input
              type="number"
              min={1}
              max={numPages}
              value={currentPage}
              onChange={handlePageInput}
              aria-label="Número de página"
              className="w-14 text-center border border-graphite-300 rounded-md py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span>de {numPages}</span>
          </div>

          <button
            type="button"
            onClick={goToNext}
            disabled={currentPage >= numPages}
            aria-label="Página siguiente"
            className="px-3 py-1.5 text-sm font-medium text-graphite-700 border border-graphite-300 rounded-lg hover:bg-graphite-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────────────────────────────────────

export function PdfViewer({
  open,
  onClose,
  signedUrl,
  initialPage,
  highlightQuote,
}: PdfViewerProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop — visible on mobile only */}
      <div
        className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Viewer panel */}
      {/* < lg: full-screen | ≥ lg: 50% right drawer */}
      <div
        data-pdf-viewer="true"
        role="dialog"
        aria-modal="true"
        aria-label="Visualizador de pliego"
        className={[
          "fixed z-50 bg-white shadow-2xl flex flex-col",
          "inset-0",
          "lg:inset-y-0 lg:right-0 lg:left-auto lg:w-1/2",
        ].join(" ")}
      >
        {/* Inner component keyed to reset state on open/page/url change */}
        <PdfViewerInner
          key={`${initialPage}-${signedUrl}`}
          onClose={onClose}
          signedUrl={signedUrl}
          initialPage={initialPage}
          highlightQuote={highlightQuote}
        />
      </div>
    </>
  );
}
