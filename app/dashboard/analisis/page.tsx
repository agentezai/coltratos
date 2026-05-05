import Link from "next/link";
import { StatCard, PageHeader } from "@/components/page";
import { ANALISIS } from "@/lib/mock";
import { AnalisisTable } from "./_components/analisis-table";

export default function AnalisisPage() {
  const total = ANALISIS.length;
  const elegibles = ANALISIS.filter((a) => a.sem === "eligible").length;
  const conObs = ANALISIS.filter((a) => a.sem === "conditional").length;
  const noElegibles = ANALISIS.filter((a) => a.sem === "not-eligible").length;

  return (
    <div>
      <PageHeader
        title="Mis análisis"
        subtitle="Historial completo de análisis de elegibilidad realizados."
        actions={
          <div className="flex gap-2">
            <button type="button" className="px-3 py-2 border border-graphite-200 rounded-lg text-sm font-medium text-graphite-700 hover:bg-graphite-50 transition-colors">
              Exportar
            </button>
            <Link href="/dashboard/upload" className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Nuevo análisis
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-5 gap-4 mb-5">
        <StatCard label="Total análisis" value={total} icon="file-text" tint="blue" />
        <StatCard label="Elegibles" value={`${Math.round((elegibles / total) * 100)}%`} icon="check-circle" tint="green" />
        <StatCard label="Con observaciones" value={`${Math.round((conObs / total) * 100)}%`} icon="alert" tint="amber" />
        <StatCard label="No elegibles" value={`${Math.round((noElegibles / total) * 100)}%`} icon="x-circle" tint="red" />
        <StatCard label="Tiempo promedio" value="48" unit="seg" icon="clock" tint="purple" />
      </div>

      <AnalisisTable analisis={ANALISIS} />
    </div>
  );
}
