import Link from "next/link";
import { StatCard, SemPill, DataTable, PageHeader } from "@/components/page";
import { Card, CardHead, CardBody } from "@/components/ui";
import { ANALISIS } from "@/lib/mock";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="¡Hola, María! 👋"
        subtitle="Aquí tienes el resumen de tu actividad reciente."
        actions={
          <Link
            href="/dashboard/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Subir pliego
          </Link>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatCard label="Análisis realizados" value={48} hint="En los últimos 30 días" icon="file-text" tint="blue" delta={{ direction: "up", label: "12% vs. período anterior" }} />
        <StatCard label="Tasa de elegibilidad" value="68" unit="%" hint="En los últimos 30 días" icon="target" tint="green" delta={{ direction: "up", label: "8% vs. período anterior" }} />
        <StatCard label="Créditos restantes" value={23} hint="Disponibles" icon="archive" tint="purple" delta={{ direction: "up", label: "15% vs. período anterior" }} />
        <StatCard label="Ahorro de tiempo" value={112} unit="h" hint="En los últimos 30 días" icon="clock" tint="amber" delta={{ direction: "up", label: "20% vs. período anterior" }} />
      </div>

      <Card>
        <CardHead title="Análisis recientes" sub="Últimos 5 análisis realizados" />
        <DataTable>
          <thead>
            <tr className="border-b border-graphite-100">
              {["Proceso", "Entidad", "Fecha", "Estado", "Resultado", "Acciones"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-graphite-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ANALISIS.slice(0, 5).map((a) => (
              <tr key={a.id} className="border-b border-graphite-50 hover:bg-graphite-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-graphite-900 text-sm line-clamp-1">{a.proceso}</div>
                  <div className="font-mono text-xs text-graphite-400 mt-0.5">{a.procesoId}</div>
                </td>
                <td className="px-4 py-3 text-sm text-graphite-600">{a.entidad}</td>
                <td className="px-4 py-3 text-sm text-graphite-500">{a.fecha}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Completado
                  </span>
                </td>
                <td className="px-4 py-3">
                  <SemPill status={a.sem} />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/analisis/${a.id}`} className="text-blue-600 text-xs font-medium hover:underline">
                    Ver análisis
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <CardBody className="pt-3 pb-4">
          <Link href="/dashboard/analisis" className="text-sm font-medium text-blue-600 hover:underline">
            Ver todos mis análisis →
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
