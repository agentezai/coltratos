import Link from "next/link";
import { Card, CardHead, CardBody, Icon } from "@/components/ui";
import { StatCard, PageHeader } from "@/components/page";
import { EQUIPO } from "@/lib/mock";
import { MemberTable } from "./_components/member-table";

const ACTIVITY = [
  { icon: "user-plus" as const, color: "bg-blue-50 text-blue-600", text: "Carlos Jiménez se unió al equipo", time: "Hoy, 09:42" },
  { icon: "check" as const, color: "bg-green-50 text-green-600", text: "Ana López completó 3 análisis", time: "Ayer, 17:30" },
  { icon: "settings" as const, color: "bg-amber-50 text-amber-600", text: "María actualizó permisos de Analista", time: "Ayer, 14:00" },
  { icon: "x" as const, color: "bg-red-50 text-red-600", text: "Daniela Valencia fue suspendida", time: "15 Abr 2026" },
];

export default function EquipoPage() {
  return (
    <div>
      <PageHeader
        title="Mi equipo"
        subtitle="Gestiona los miembros y permisos de tu organización."
        actions={
          <div className="flex gap-2">
            <button type="button" className="px-3 py-2 border border-graphite-200 rounded-lg text-sm font-medium text-graphite-700 hover:bg-graphite-50 transition-colors">Exportar</button>
            <button type="button" className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Invitar miembro</button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatCard label="Miembros activos" value={16} icon="users" tint="blue" />
        <StatCard label="Invitaciones pendientes" value={3} icon="bell" tint="amber" />
        <StatCard label="Administradores" value={4} icon="shield" tint="purple" />
        <StatCard label="Último acceso prom." value="2.4" unit="días" icon="clock" tint="green" />
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-5">
        <MemberTable miembros={EQUIPO} />

        <div className="space-y-4">
          <Card>
            <CardHead title="Roles y permisos" />
            <CardBody>
              <div className="space-y-3">
                {[
                  { icon: "shield" as const, color: "bg-violet-50 text-violet-600", rol: "Administrador", desc: "Acceso total: análisis, equipo, facturación." },
                  { icon: "bar-chart" as const, color: "bg-blue-50 text-blue-600", rol: "Analista", desc: "Puede subir pliegos y ver análisis propios." },
                  { icon: "search" as const, color: "bg-graphite-100 text-graphite-500", rol: "Viewer", desc: "Solo lectura de resultados compartidos." },
                ].map((r) => (
                  <div key={r.rol} className="flex items-start gap-3">
                    <div className={["w-8 h-8 rounded-full flex items-center justify-center flex-none", r.color].join(" ")}>
                      <Icon name={r.icon} size={15} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-graphite-900">{r.rol}</div>
                      <div className="text-xs text-graphite-500">{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Actividad reciente" />
            <CardBody>
              <div className="space-y-3">
                {ACTIVITY.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={["w-7 h-7 rounded-full flex items-center justify-center flex-none", a.color].join(" ")}>
                      <Icon name={a.icon} size={13} />
                    </div>
                    <div>
                      <div className="text-xs text-graphite-800">{a.text}</div>
                      <div className="text-xs text-graphite-400 mt-0.5">{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="mt-4 text-xs text-blue-600 font-medium hover:underline">
                Ver toda la actividad →
              </button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
