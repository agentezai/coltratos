/**
 * CitationBlock (T14 — REQ-022, RN-008)
 *
 * Renders a pliego quote with page indicator and an "Abrir página en PDF" CTA.
 * Uses the Quote DS primitive.
 *
 * When `quoteFuente` or `paginaFuente` is null (RN-008), the data layer
 * (T11) already forces the requisito verdict to `amarillo`. CitationBlock
 * renders the missing-citation fallback copy instead of the quote.
 */
import { Quote } from "@/components/ui/quote";

export interface OpenPdfArgs {
  page: number;
  /** The quote text to highlight in the PDF viewer. */
  quote: string | null;
}

export interface CitationBlockProps {
  quoteFuente: string | null;
  paginaFuente: number | null;
  /** Callback fired when the user clicks "Abrir página en PDF" (wired in T15). */
  onOpenPdf: (args: OpenPdfArgs) => void;
}

export function CitationBlock({
  quoteFuente,
  paginaFuente,
  onOpenPdf,
}: CitationBlockProps) {
  // Missing citation fallback (RN-008)
  if (quoteFuente === null || paginaFuente === null) {
    return (
      <div
        data-citation-block="true"
        className="border-l-4 border-graphite-300 pl-4 py-1"
      >
        <p
          data-citation-fallback="true"
          className="text-xs text-graphite-400 italic"
        >
          Cita no disponible — verifica manualmente en el pliego.
        </p>
      </div>
    );
  }

  // Determine accent: amber when quote is unusually short (< 40 chars = likely truncated)
  const isTruncated = quoteFuente.length < 40;
  const accent = isTruncated ? "border-amber-200" : "border-blue-200";

  return (
    <div data-citation-block="true" className={["border-l-4 pl-4 py-1", accent].join(" ")}>
      {/* Quote body — no inner border (outer div provides it) */}
      <p
        data-citation-quote="true"
        className="text-xs text-graphite-600 italic"
      >
        {quoteFuente}
      </p>
      {/* Footer row with page label + open-PDF button */}
      <div
        data-citation-footer="true"
        className="flex items-center justify-between mt-2"
      >
        <span className="text-xs text-graphite-400">
          Página {paginaFuente} del pliego
        </span>
        <button
          type="button"
          data-open-pdf="true"
          onClick={() => onOpenPdf({ page: paginaFuente, quote: quoteFuente })}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Abrir página en PDF
        </button>
      </div>
    </div>
  );
}
