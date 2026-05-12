"use client";
/**
 * T19: ExportButton (REQ-025)
 *
 * Two modes:
 *   Mode A — REPORT_EXPORT_ENABLED = true  → enabled; delegates to report-export
 *   Mode B — REPORT_EXPORT_ENABLED = false → disabled with "Próximamente" tooltip
 *
 * The actual export pipeline (rendering, signed-URL pickup, storage cleanup)
 * is owned by the future `report-export` feature spec. This component only
 * wires the trigger and disabled/enabled states.
 *
 * Lives next to the RerunButton (T16) in the VerdictBanner action cluster.
 */
import { REPORT_EXPORT_ENABLED } from "@/lib/features/report-export";

const TOOLTIP_DISABLED =
  "Próximamente — exportar a PDF estará disponible en la siguiente versión";

const BASE_CLASS =
  "text-xs px-3 py-1.5 border rounded-lg font-medium w-full transition-colors";

const ENABLED_CLASS =
  "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer";

const DISABLED_CLASS =
  "border-graphite-200 text-graphite-400 cursor-not-allowed bg-transparent";

interface ExportButtonProps {
  analysisId: string;
}

export function ExportButton({ analysisId: _analysisId }: ExportButtonProps) {
  if (REPORT_EXPORT_ENABLED) {
    // Mode A — report-export is available
    // onClick wiring is deferred to the report-export spec; this branch
    // proves the button is enabled when the flag flips to true.
    return (
      <button
        type="button"
        className={[BASE_CLASS, ENABLED_CLASS].join(" ")}
        onClick={() => {
          // Intentionally left as a stub — the report-export feature spec
          // will supply triggerReportExport once it ships.
        }}
      >
        Exportar PDF
      </button>
    );
  }

  // Mode B — report-export not yet shipped
  return (
    <button
      type="button"
      disabled
      title={TOOLTIP_DISABLED}
      className={[BASE_CLASS, DISABLED_CLASS].join(" ")}
    >
      Exportar PDF
    </button>
  );
}
