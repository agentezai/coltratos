import Link from "next/link";
import { Card, CardBody, CardHead } from "@/components/ui";
import { SemPill, type Semaforo } from "@/components/page";
import { RESULT_DETAIL } from "@/lib/mock";
import { ResultTabs } from "./_components/result-tabs";

type HeroStyle = { bg: string; text: string; icon: string };

const HERO_COLOR: Record<Semaforo, HeroStyle> = {
  eligible: { bg: "bg-green-50 border-green-200", text: "text-green-700", icon: "✓" },
  conditional: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: "△" },
  "not-eligible": { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: "✗" },
};

const TITULO: Record<Semaforo, string> = {
  eligible: "Empresa elegible para postularse",
  conditional: "Elegible con observaciones",
  "not-eligible": "No elegible para este proceso",
};

export default function ResultadoPage() {
  const r = RESULT_DETAIL;
  const hero = HERO_COLOR[r.sem];

  return (
    <div>
      <Link href="/dashboard/analisis" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mb-5">
        ← Volver a mis análisis
      </Link>

      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-graphite-900">Resultado del análisis</h1>
          <div className="text-xs text-graphite-400 mt-1 flex gap-3">
            <span className="font-mono">{r.id}</span>
            <span>·</span>
            <span className="font-mono">{r.procesoId}</span>
            <span>·</span>
            <span>{r.entidad}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button type="button" className="px-3 py-2 border border-graphite-200 rounded-lg text-sm font-medium text-graphite-700 hover:bg-graphite-50 transition-colors">Exportar PDF</button>
          <button type="button" className="px-3 py-2 border border-graphite-200 rounded-lg text-sm font-medium text-graphite-700 hover:bg-graphite-50 transition-colors">Compartir</button>
          <Link href="/dashboard/upload" className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Nuevo análisis</Link>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
        <div>
          {/* Hero card */}
          <div className={["border rounded-xl p-6 mb-5", hero.bg].join(" ")}>
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-5 items-start">
              <div className={["w-[72px] h-[72px] rounded-full border-2 flex items-center justify-center text-2xl font-bold flex-none", hero.bg, hero.text].join(" ")}>
                {hero.icon}
              </div>
              <div>
                <div className={["text-lg font-bold", hero.text].join(" ")}>{TITULO[r.sem]}</div>
                <div className="text-sm text-graphite-600 mt-1">{r.recomendacion}</div>
                <div className={["inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full text-sm font-bold", hero.bg, hero.text].join(" ")}>
                  {r.resultado}% cumplimiento
                </div>
              </div>
              <div className="min-w-[140px]">
                <div className="text-xs font-semibold text-graphite-500 uppercase tracking-wide mb-2">Resumen</div>
                <table className="text-sm w-full">
                  <tbody>
                    <tr><td className="text-green-700 font-medium pr-2">Cumple</td><td className="font-bold">{r.resumen.cumple}</td></tr>
                    <tr><td className="text-amber-600 font-medium pr-2">Con obs.</td><td className="font-bold">{r.resumen.conObs}</td></tr>
                    <tr><td className="text-red-600 font-medium pr-2">No cumple</td><td className="font-bold">{r.resumen.noCumple}</td></tr>
                    <tr className="border-t border-graphite-200"><td className="text-graphite-600 font-medium pr-2 pt-1">Total</td><td className="font-bold pt-1">{r.resumen.total}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="min-w-[180px]">
                <div className={["rounded-xl p-4 border", hero.bg].join(" ")}>
                  <div className="text-xs font-semibold text-graphite-700 mb-2">Recomendación</div>
                  <p className="text-xs text-graphite-600">{r.recomendacion}</p>
                  <button type="button" className="mt-3 text-xs font-medium text-blue-600 hover:underline">Ver recomendaciones →</button>
                </div>
              </div>
            </div>
          </div>

          <ResultTabs result={r} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHead title="Información del proceso" />
            <CardBody>
              <dl className="space-y-2.5 text-sm">
                {[
                  ["Proceso", <span key="proceso-id" className="font-mono">{r.procesoId}</span>],
                  ["Entidad", r.entidad],
                  ["Objeto", r.objeto],
                  ["Cierre", r.cierre],
                  ["Modalidad", r.modalidad],
                  ["Presupuesto", r.presupuesto],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex gap-2">
                    <dt className="text-graphite-400 min-w-[80px] flex-none">{label}</dt>
                    <dd className="text-graphite-800 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Archivos" />
            <CardBody>
              <div className="flex items-center gap-2.5">
                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded">PDF</span>
                <span className="flex-1 text-sm text-graphite-700">{r.archivo}</span>
                <span className="text-xs text-graphite-400">{r.archivoTamano}</span>
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
              <div className="text-xs text-graphite-400 mt-1.5">{r.id} · 28 Abr 2026, 10:34</div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
