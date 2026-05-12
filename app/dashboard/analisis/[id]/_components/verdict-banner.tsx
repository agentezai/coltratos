/**
 * T13 + T16: VerdictBanner — real-data verdict banner (REQ-012, RN-002, RN-006, REQ-024)
 *
 * Renders the semáforo circle, state title, deterministic narrative,
 * counts table, and recommendation panel for a completed/partial analysis.
 *
 * The banner MUST NOT expose any verdict-edit control (RN-006).
 * Writable affordances: re-run (T16 — RerunButton), export (T19 placeholder),
 * feedback (T18 placeholder).
 */
import { SemPill } from "@/components/page/sem-pill";
import type { AnalysisDetail } from "@/types/domain/analysis";
import { ExportButton } from "./export-button";
import { RerunButton } from "./rerun-button";
import { FeedbackThumbs } from "./feedback-thumbs";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type CanonicalVerdict = "verde" | "amarillo" | "rojo";

// ─────────────────────────────────────────────────────────────────────────────
// Style maps (per T13 plan: color by overallVerdict)
// ─────────────────────────────────────────────────────────────────────────────

const HERO_BG: Record<CanonicalVerdict, string> = {
  verde: "bg-green-50 border-green-200",
  amarillo: "bg-amber-50 border-amber-200",
  rojo: "bg-red-50 border-red-200",
};

const CIRCLE_STYLE: Record<CanonicalVerdict, string> = {
  verde: "border-green-400 bg-green-100 text-green-700",
  amarillo: "border-amber-400 bg-amber-100 text-amber-700",
  rojo: "border-red-400 bg-red-100 text-red-700",
};

const CIRCLE_ICON: Record<CanonicalVerdict, string> = {
  verde: "✓",
  amarillo: "△",
  rojo: "✗",
};

const TITULO: Record<CanonicalVerdict, string> = {
  verde: "Cumple",
  amarillo: "Cumple con observaciones",
  rojo: "No cumple",
};

// ─────────────────────────────────────────────────────────────────────────────
// Counts reducer — deterministic, no LLM (per T13 plan + RN-002)
// ─────────────────────────────────────────────────────────────────────────────

export interface VerdictCounts {
  verde: number;
  amarillo: number;
  rojo: number;
  total: number;
}

export function computeVerdictCounts(
  requisitos: AnalysisDetail["requisitos"]
): VerdictCounts {
  let verde = 0;
  let amarillo = 0;
  let rojo = 0;
  for (const req of requisitos) {
    if (req.verdict?.value === "verde") verde++;
    else if (req.verdict?.value === "amarillo") amarillo++;
    else if (req.verdict?.value === "rojo") rojo++;
  }
  return { verde, amarillo, rojo, total: requisitos.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Narrative — derived deterministically from counts (no LLM)
// ─────────────────────────────────────────────────────────────────────────────

function buildNarrative(
  verdict: CanonicalVerdict,
  counts: VerdictCounts
): string {
  if (verdict === "verde" && counts.rojo === 0 && counts.amarillo === 0) {
    return "Cumples con todos los requisitos extraídos.";
  }
  if (verdict === "amarillo") {
    return "Cumples con la mayoría; algunos requisitos requieren verificación.";
  }
  if (verdict === "rojo") {
    return `No cumples con ${counts.rojo} requisito${counts.rojo !== 1 ? "s" : ""} crítico${counts.rojo !== 1 ? "s" : ""}.`;
  }
  return "Cumples con la mayoría; algunos requisitos requieren verificación.";
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation copy — three preset copies keyed by verdict
// ─────────────────────────────────────────────────────────────────────────────

const RECOMENDACION: Record<CanonicalVerdict, string> = {
  verde:
    "La empresa cumple todos los requisitos habilitantes. Puedes presentar la oferta.",
  amarillo:
    "Revisa los requisitos con observación antes de presentar la oferta.",
  rojo: "La empresa no cumple requisitos habilitantes críticos. No se recomienda presentar la oferta sin acción correctiva.",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export interface VerdictBannerProps {
  detail: Pick<
    AnalysisDetail,
    "id" | "overallVerdict" | "requisitos" | "procesoMetadata" | "feedbackByMe"
  >;
}

export function VerdictBanner({ detail }: VerdictBannerProps) {
  const verdict: CanonicalVerdict = detail.overallVerdict ?? "amarillo";
  const counts = computeVerdictCounts(detail.requisitos);
  const narrative = buildNarrative(verdict, counts);

  return (
    /**
     * data-verdict is used by tests to assert the correct color branch renders.
     * MUST NOT carry data-verdict-edit (RN-006 — no verdict mutation from UI).
     */
    <div
      data-verdict={verdict}
      className={[
        "border rounded-xl p-6",
        HERO_BG[verdict],
      ].join(" ")}
    >
      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-5 items-start">
        {/* Semáforo circle — 72px, color from overallVerdict */}
        <div
          className={[
            "w-[72px] h-[72px] rounded-full border-2 flex items-center justify-center",
            "text-2xl font-bold flex-none",
            CIRCLE_STYLE[verdict],
          ].join(" ")}
          aria-label={`Semáforo: ${TITULO[verdict]}`}
        >
          {CIRCLE_ICON[verdict]}
        </div>

        {/* State title + narrative + SemPill */}
        <div>
          <div
            className="text-lg font-bold text-graphite-900"
            data-testid="verdict-title"
          >
            {TITULO[verdict]}
          </div>
          <p className="text-sm text-graphite-600 mt-1">{narrative}</p>
          <div className="mt-2">
            <SemPill status={verdict} />
          </div>
        </div>

        {/* Counts table — verde / amarillo / rojo / total */}
        <div className="min-w-[140px]">
          <div className="text-xs font-semibold text-graphite-500 uppercase tracking-wide mb-2">
            Resumen
          </div>
          <table className="text-sm w-full">
            <tbody>
              <tr>
                <td className="text-green-700 font-medium pr-2">Cumple</td>
                <td
                  className="font-bold"
                  data-testid="count-verde"
                >
                  {counts.verde}
                </td>
              </tr>
              <tr>
                <td className="text-amber-600 font-medium pr-2">Con obs.</td>
                <td
                  className="font-bold"
                  data-testid="count-amarillo"
                >
                  {counts.amarillo}
                </td>
              </tr>
              <tr>
                <td className="text-red-600 font-medium pr-2">No cumple</td>
                <td
                  className="font-bold"
                  data-testid="count-rojo"
                >
                  {counts.rojo}
                </td>
              </tr>
              <tr className="border-t border-graphite-200">
                <td className="text-graphite-600 font-medium pr-2 pt-1">
                  Total
                </td>
                <td
                  className="font-bold pt-1"
                  data-testid="count-total"
                >
                  {counts.total}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Recommendation panel — preset copy keyed by verdict */}
        <div className="min-w-[200px]">
          <div
            className={[
              "rounded-xl p-4 border",
              HERO_BG[verdict],
            ].join(" ")}
          >
            <div className="text-xs font-semibold text-graphite-700 mb-2">
              Recomendación
            </div>
            <p className="text-xs text-graphite-600">
              {RECOMENDACION[verdict]}
            </p>
            {/* Action buttons: re-run (T16), export (T19), feedback (T18) — NO verdict-edit */}
            <div className="mt-3 flex flex-col gap-2">
              {/* T19: export button — real component (replaces placeholder) */}
              <ExportButton analysisId={detail.id} />
              {/* T16: re-run button — replaces placeholder */}
              <RerunButton analysisId={detail.id} />
              {/* T18: feedback thumbs — real control */}
              <div className="pt-1">
                <FeedbackThumbs
                  analysisId={detail.id}
                  feedbackByMe={detail.feedbackByMe}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
