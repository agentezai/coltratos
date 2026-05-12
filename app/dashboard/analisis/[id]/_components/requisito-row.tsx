"use client";

/**
 * RequisitoRow (T14 — REQ-013, REQ-022, RN-008)
 *
 * Collapsed: chevron + 1-line truncated texto + SemPill + confidence indicator.
 * Expanded: full texto + verdict reason + CitationBlock + "Abrir en PDF" (T15).
 *
 * Confidence indicator levels (4 tiers):
 *   < 0.60  → empty
 *   0.60–0.74 → one-third
 *   0.75–0.89 → two-thirds
 *   ≥ 0.90  → full
 */
import { useState } from "react";
import { SemPill } from "@/components/page/sem-pill";
import { Icon } from "@/components/ui";
import type { RequisitoView } from "@/types/domain/analysis";
import { CitationBlock, type OpenPdfArgs } from "./citation-block";

// ─────────────────────────────────────────────────────────────────────────────
// Confidence indicator
// ─────────────────────────────────────────────────────────────────────────────

type ConfidenceLevel = "empty" | "one-third" | "two-thirds" | "full";

function toConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.9) return "full";
  if (confidence >= 0.75) return "two-thirds";
  if (confidence >= 0.6) return "one-third";
  return "empty";
}

const CONF_FILL: Record<ConfidenceLevel, string> = {
  empty: "bg-graphite-200",
  "one-third": "bg-amber-300",
  "two-thirds": "bg-amber-400",
  full: "bg-green-500",
};

const CONF_TITLE: Record<ConfidenceLevel, string> = {
  empty: "Confianza baja (<60%)",
  "one-third": "Confianza media-baja (60–74%)",
  "two-thirds": "Confianza media-alta (75–89%)",
  full: "Confianza alta (≥90%)",
};

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const level = toConfidenceLevel(confidence);
  return (
    <span
      data-confidence-indicator="true"
      data-confidence-level={level}
      title={CONF_TITLE[level]}
      className={[
        "w-3 h-3 rounded-full border border-graphite-300 flex-none",
        CONF_FILL[level],
      ].join(" ")}
      aria-label={CONF_TITLE[level]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface RequisitoRowProps {
  requisito: RequisitoView;
  /** Wired by parent — opens the PDF viewer at the given page + quote (T15). */
  onOpenPdf: (args: OpenPdfArgs) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function RequisitoRow({ requisito, onOpenPdf }: RequisitoRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen((prev) => !prev);

  const semStatus = requisito.verdict?.value ?? "amarillo";
  const confidence = requisito.verdict?.confidence ?? 0;

  return (
    <div
      data-accordion-row="true"
      data-requisito-id={requisito.id}
      className="bg-white border border-graphite-200 rounded-xl overflow-hidden"
    >
      {/* ── Collapsed header ── */}
      <div
        data-accordion-header="true"
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => e.key === "Enter" && toggle()}
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-graphite-50 transition-colors select-none"
      >
        <Icon
          name="chev-down"
          size={16}
          className="stroke-graphite-400 flex-none transition-transform"
          style={isOpen ? { transform: "rotate(180deg)" } : {}}
        />
        <div className="flex-1 min-w-0">
          <div
            data-req-texto="true"
            className="font-medium text-graphite-900 text-sm line-clamp-1"
          >
            {requisito.texto}
          </div>
          <div className="text-xs text-graphite-400 mt-0.5 capitalize">
            {requisito.tipo}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <SemPill status={semStatus} />
          {requisito.verdict && (
            <ConfidenceIndicator confidence={confidence} />
          )}
        </div>
      </div>

      {/* ── Expanded panel ── */}
      <div
        data-accordion-body="true"
        hidden={!isOpen}
        className="px-5 pb-4 pt-1 border-t border-graphite-100 space-y-3"
      >
        {/* Full texto */}
        <p className="text-sm font-medium text-graphite-800">
          {requisito.texto}
        </p>

        {/* Verdict reason */}
        {requisito.verdict ? (
          <p
            data-req-reason="true"
            className="text-sm text-graphite-700"
          >
            {requisito.verdict.reason}
          </p>
        ) : (
          <p className="text-sm text-graphite-500 italic">
            Sin veredicto disponible para este requisito.
          </p>
        )}

        {/* Citation block (REQ-022) */}
        <CitationBlock
          quoteFuente={requisito.quoteFuente}
          paginaFuente={requisito.paginaFuente}
          onOpenPdf={onOpenPdf}
        />
      </div>
    </div>
  );
}
