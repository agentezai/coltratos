import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody, CardHead } from "@/components/ui";
import { getAnalysisDetail } from "@/lib/queries/analysis-detail";
import { auth } from "@/lib/server/auth-context";
import { ResultTabs } from "./_components/result-tabs";
import { ProcesoHeader } from "./_components/proceso-header";
import { VerdictBanner } from "./_components/verdict-banner";
import { ExtractionWarning } from "./_components/extraction-warning";
import { ExtractionLoading } from "./_components/extraction-loading";
import type { ExtractionStage } from "./_components/extraction-stages";

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function ResultadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const companyId = await auth.company_id();
  if (!companyId) {
    redirect("/login");
  }

  const detail = await getAnalysisDetail(id, companyId);
  if (!detail) {
    notFound();
  }

  // Extraction in progress — step-driven loader (T20, REQ-028)
  if (
    detail.extractionStatus === "pending" ||
    detail.extractionStatus === "extracting"
  ) {
    return (
      <div>
        <Link
          href="/dashboard/analisis"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mb-5"
        >
          ← Volver a mis análisis
        </Link>
        <ExtractionLoading
          analysisId={detail.id}
          initialStage={detail.extractionStage as ExtractionStage | null}
        />
      </div>
    );
  }

  // Extraction failed — ExtractionWarning renders red banner + RerunButton (T17)
  if (detail.extractionStatus === "failed") {
    return (
      <div>
        <Link
          href="/dashboard/analisis"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mb-5"
        >
          ← Volver a mis análisis
        </Link>
        <ExtractionWarning detail={detail} />
        <p className="text-xs text-graphite-400 font-mono mt-3 text-center">{detail.id}</p>
      </div>
    );
  }

  // Completed or partial — render the full result page
  const meta = detail.procesoMetadata;

  return (
    <div>
      <Link
        href="/dashboard/analisis"
        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mb-5"
      >
        ← Volver a mis análisis
      </Link>

      {/* T17: Partial-extraction warning banner — above verdict banner (RN-010) */}
      <div className="mb-4">
        <ExtractionWarning detail={detail} />
      </div>

      {/* T12: Proceso metadata header strip */}
      <div className="mb-5">
        <ProcesoHeader detail={detail} />
      </div>

      {/* Header row */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-graphite-900">Resultado del análisis</h1>
          <div className="text-xs text-graphite-400 mt-1 flex gap-3 flex-wrap">
            <span className="font-mono">{detail.id}</span>
            <span>·</span>
            <span className="font-mono">{meta.numero_proceso}</span>
            <span>·</span>
            <span>{meta.entidad}</span>
            {detail.procesoLookupStatus === "unverified" && (
              <>
                <span>·</span>
                <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                  Datos ingresados manualmente
                </span>
              </>
            )}
          </div>
        </div>
        <Link
          href="/dashboard/upload"
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          Nuevo análisis
        </Link>
      </div>

      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
        <div>
          {/* T13: Hero verdict banner — real data, canonical semáforo */}
          <div className="mb-5">
            <VerdictBanner detail={detail} />
          </div>

          {/* Requisito tabs (T14 will rewrite result-tabs.tsx to accept AnalysisDetail) */}
          <ResultTabs detail={detail} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* T12 will replace this with ProcesoHeader */}
          <Card>
            <CardHead title="Información del proceso" />
            <CardBody>
              <dl className="space-y-2.5 text-sm">
                {[
                  [
                    "Proceso",
                    <span key="proceso-id" className="font-mono">
                      {meta.numero_proceso}
                    </span>,
                  ],
                  ["Entidad", meta.entidad],
                  ["Objeto", meta.objeto_a_contratar],
                  [
                    "Cierre",
                    meta.fecha_limite_de_recepcion ?? "—",
                  ],
                  ["Modalidad", meta.modalidad],
                  [
                    "Presupuesto",
                    meta.cuantia_proceso
                      ? `$${meta.cuantia_proceso.toLocaleString("es-CO")} COP`
                      : "—",
                  ],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex gap-2">
                    <dt className="text-graphite-400 min-w-[80px] flex-none">{label}</dt>
                    <dd className="text-graphite-800 font-medium">{value}</dd>
                  </div>
                ))}
                {meta.secop_url && (
                  <div className="pt-1">
                    <a
                      href={meta.secop_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-xs hover:underline"
                    >
                      Ver en SECOP II →
                    </a>
                  </div>
                )}
                {detail.procesoLookupStatus === "unverified" && !meta.secop_url && (
                  <div className="pt-1 text-xs text-graphite-400">
                    Ver en SECOP II — No disponible (datos manuales)
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Archivos" />
            <CardBody>
              <div className="flex items-center gap-2.5">
                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded">
                  PDF
                </span>
                <span className="flex-1 text-sm text-graphite-700 font-mono truncate text-xs">
                  {detail.pliegoSha256 ? `${detail.pliegoSha256.slice(0, 12)}…` : "—"}
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Proceso de análisis" />
            <CardBody>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-graphite-700">Análisis completado</span>
              </div>
              <div className="text-xs text-graphite-400 mt-1.5">
                <span className="font-mono">{detail.id}</span> ·{" "}
                {new Date(detail.createdAt).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              {detail.costUsd !== null && (
                <div className="text-xs text-graphite-400 mt-1">
                  Costo: ${detail.costUsd.toFixed(4)} USD
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
