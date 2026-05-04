import { Card, CardHead, CardBody, Icon } from "@/components/ui";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/page";
import { FACTURAS } from "@/lib/mock";
import { PackageSelector } from "./_components/package-selector";

const USAGE = [
  { mes: "Nov", analisis: 12, creditos: 12 },
  { mes: "Dic", analisis: 8, creditos: 8 },
  { mes: "Ene", analisis: 15, creditos: 15 },
  { mes: "Feb", analisis: 20, creditos: 20 },
  { mes: "Mar", analisis: 24, creditos: 24 },
  { mes: "Abr", analisis: 18, creditos: 18 },
];

const MAX = Math.max(...USAGE.map((u) => u.analisis));

export default function CreditosPage() {
  return (
    <div>
      <PageHeader title="Créditos" subtitle="Gestiona tu saldo y paquetes de análisis." />

      <div className="grid grid-cols-[280px_1fr_1.5fr] gap-4 mb-5">
        {/* Balance card */}
        <div className="rounded-xl p-6 text-white" style={{ background: "linear-gradient(135deg, #1e3a8a, #0f172a)" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-4 opacity-70">Créditos disponibles</div>
          <div className="font-display font-bold text-5xl mb-1">22</div>
          <div className="text-sm opacity-70 mb-4">análisis</div>
          <div className="text-xs opacity-60 mb-5">Equivalente a USD $0.66 aprox.</div>
          <button type="button" className="w-full py-2 bg-white text-navy-900 text-sm font-semibold rounded-lg hover:bg-graphite-100 transition-colors">
            Comprar créditos
          </button>
        </div>

        {/* Resumen */}
        <Card>
          <CardHead title="Resumen de uso" sub="Este mes" />
          <CardBody>
            <div className="space-y-3">
              {[
                ["Análisis realizados", "18", "+20% vs. mes anterior"],
                ["Créditos consumidos", "18 / USD $0.54", null],
                ["Costo promedio", "USD $0.03 / análisis", null],
              ].map(([label, value, delta]) => (
                <div key={String(label)}>
                  <div className="text-xs text-graphite-500">{label}</div>
                  <div className="font-bold text-graphite-900 mt-0.5">{value}</div>
                  {delta && <div className="text-xs text-green-600 mt-0.5">{delta}</div>}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Usage chart */}
        <Card>
          <CardHead title="Uso últimos 6 meses" />
          <CardBody>
            <div className="space-y-2">
              {USAGE.map((u) => (
                <div key={u.mes} className="flex items-center gap-3">
                  <span className="text-xs text-graphite-500 w-8">{u.mes}</span>
                  <div className="flex-1 flex gap-1">
                    <div className="h-3 rounded-full bg-blue-500" style={{ width: `${(u.analisis / MAX) * 100}%` }} />
                    <div className="h-3 rounded-full bg-green-400" style={{ width: `${(u.creditos / MAX) * 80}%` }} />
                  </div>
                  <span className="text-xs font-mono text-graphite-600 w-6 text-right">{u.analisis}</span>
                </div>
              ))}
              <div className="flex gap-4 mt-3 text-xs text-graphite-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-blue-500 inline-block" /> Análisis</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-green-400 inline-block" /> Créditos</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Package selector */}
        <Card>
          <CardHead title="Comprar créditos" />
          <CardBody>
            <PackageSelector />
            <div className="flex items-start gap-2.5 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Icon name="shield" size={15} className="stroke-blue-600 flex-none mt-0.5" />
              <p className="text-xs text-blue-800">Pago seguro. Los créditos no vencen y son transferibles al equipo.</p>
            </div>
            <button type="button" className="w-full mt-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
              Continuar con la compra
            </button>
          </CardBody>
        </Card>

        {/* Facturas */}
        <Card>
          <CardHead title="Facturas" />
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-graphite-100">
                  {["Factura", "Fecha", "Descripción", "Monto", "Estado", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-graphite-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FACTURAS.map((f) => (
                  <tr key={f.id} className="border-b border-graphite-50 hover:bg-graphite-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-graphite-600">{f.id}</td>
                    <td className="px-4 py-3 text-xs text-graphite-500">{f.fecha}</td>
                    <td className="px-4 py-3 text-xs text-graphite-700">{f.descripcion}</td>
                    <td className="px-4 py-3 text-xs font-bold text-graphite-900">{f.monto}</td>
                    <td className="px-4 py-3">
                      <Chip variant={f.estado === "Pagada" ? "green" : "red"} dot>{f.estado}</Chip>
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" className="p-1 rounded hover:bg-graphite-100 text-graphite-400 transition-colors">
                        <Icon name="download" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
