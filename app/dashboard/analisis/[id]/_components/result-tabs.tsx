"use client";

/**
 * ResultTabs (T14 rewrite + T15 PDF viewer wiring — REQ-013, REQ-022, RN-008)
 *
 * 4 tabs: Resumen | Jurídico | Técnico | Financiero
 * (Experiencia tab removed — financiero includes experiencia per
 *  contratacion-publica.md; T14 plan §Tabs)
 *
 * Resumen tab: all requisitos sorted by severity (rojo → amarillo → verde).
 * Tipo tabs: filtered by requisito.tipo.
 *
 * Row rendering is delegated to RequisitoRow (expanded panel + CitationBlock).
 *
 * T15: "Abrir página en PDF" CTA calls POST /api/analyses/[id]/pliego-url,
 * receives a signed URL, and opens PdfViewer in a modal/drawer.
 */
import { useState, useCallback } from "react";
import { Icon } from "@/components/ui";
import { PdfViewer } from "@/components/ui/pdf-viewer";
import type { AnalysisDetail, RequisitoView } from "@/types/domain/analysis";
import { RequisitoRow } from "./requisito-row";
import type { OpenPdfArgs } from "./citation-block";

// ─────────────────────────────────────────────────────────────────────────────
// Tab definitions — 4 tabs, no Experiencia (per contratacion-publica.md)
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "resumen" | "juridico" | "tecnico" | "financiero";

const TABS: { id: Tab; label: string; icon: import("@/components/ui").IconName }[] = [
  { id: "resumen", label: "Resumen", icon: "target" },
  { id: "juridico", label: "Jurídico", icon: "shield" },
  { id: "tecnico", label: "Técnico", icon: "settings" },
  { id: "financiero", label: "Financiero", icon: "dollar-sign" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Severity ordering (rojo = most severe → first)
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<"verde" | "amarillo" | "rojo", number> = {
  rojo: 0,
  amarillo: 1,
  verde: 2,
};

function sortBySeverity(reqs: RequisitoView[]): RequisitoView[] {
  return [...reqs].sort((a, b) => {
    const av = a.verdict?.value ?? "amarillo";
    const bv = b.verdict?.value ?? "amarillo";
    return SEVERITY_ORDER[av] - SEVERITY_ORDER[bv];
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter + sort
// ─────────────────────────────────────────────────────────────────────────────

function getVisibleReqs(all: RequisitoView[], tab: Tab): RequisitoView[] {
  if (tab === "resumen") {
    return sortBySeverity(all);
  }
  // financiero tab includes both 'financiero' tipo (which covers experiencia)
  return all.filter((r) => r.tipo === tab);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF viewer state
// ─────────────────────────────────────────────────────────────────────────────

interface PdfState {
  open: boolean;
  signedUrl: string;
  initialPage: number;
  highlightQuote: string | null;
}

const CLOSED_PDF_STATE: PdfState = {
  open: false,
  signedUrl: "",
  initialPage: 1,
  highlightQuote: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ResultTabs({ detail }: { detail: AnalysisDetail }) {
  const [tab, setTab] = useState<Tab>("resumen");
  const [pdfState, setPdfState] = useState<PdfState>(CLOSED_PDF_STATE);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const visibleReqs = getVisibleReqs(detail.requisitos, tab);

  /**
   * T15: "Abrir página en PDF" handler.
   * 1. POST /api/analyses/[id]/pliego-url → receive signed URL
   * 2. Open PdfViewer with the signed URL, page, and quote
   *
   * Signed URL is never persisted beyond the open lifetime — closing drops it.
   */
  const handleOpenPdf = useCallback(
    async ({ page, quote }: OpenPdfArgs) => {
      setPdfError(null);
      setPdfLoading(true);
      try {
        const res = await fetch(`/api/analyses/${detail.id}/pliego-url`, {
          method: "POST",
        });
        if (!res.ok) {
          setPdfError(
            res.status === 404
              ? "No se encontró el pliego para este análisis."
              : "No se pudo abrir el pliego en este momento."
          );
          return;
        }
        const { url } = (await res.json()) as { url: string };
        setPdfState({
          open: true,
          signedUrl: url,
          initialPage: page,
          highlightQuote: quote,
        });
      } catch {
        setPdfError("Error de red al cargar el pliego.");
      } finally {
        setPdfLoading(false);
      }
    },
    [detail.id]
  );

  const handleClosePdf = useCallback(() => {
    // Drop the signed URL when the viewer is closed (per T15 spec)
    setPdfState(CLOSED_PDF_STATE);
  }, []);

  return (
    <div>
      {/* Tab strip */}
      <div className="flex gap-1 p-1 bg-graphite-100 rounded-xl mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-tab="true"
            data-active={tab === t.id ? "true" : undefined}
            onClick={() => setTab(t.id)}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              tab === t.id
                ? "bg-white text-graphite-900 shadow-sm"
                : "text-graphite-500 hover:text-graphite-700",
            ].join(" ")}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* PDF load error */}
      {pdfError && (
        <p className="text-sm text-red-500 mb-3 px-1">{pdfError}</p>
      )}

      {/* Requisito list */}
      {visibleReqs.length === 0 ? (
        <p className="text-sm text-graphite-400 py-4 text-center">
          No hay requisitos en esta categoría.
        </p>
      ) : (
        <div className="space-y-2">
          {visibleReqs.map((req) => (
            <RequisitoRow
              key={req.id}
              requisito={req}
              onOpenPdf={handleOpenPdf}
            />
          ))}
        </div>
      )}

      {/* Loading indicator while fetching signed URL */}
      {pdfLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="bg-white rounded-xl px-6 py-4 shadow-lg text-sm text-graphite-600">
            Cargando pliego…
          </div>
        </div>
      )}

      {/* PDF Viewer (T15) */}
      <PdfViewer
        open={pdfState.open}
        onClose={handleClosePdf}
        signedUrl={pdfState.signedUrl}
        initialPage={pdfState.initialPage}
        highlightQuote={pdfState.highlightQuote}
      />
    </div>
  );
}
