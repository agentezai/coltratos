import { StatCard, PageHeader } from "@/components/page";
import { PROCESOS } from "@/lib/mock";
import { ProcesosTable } from "./_components/procesos-table";

export default function ProcesosPage() {
  const total = PROCESOS.length;
  const elegibles = PROCESOS.filter((p) => p.sem === "eligible").length;
  const conObs = PROCESOS.filter((p) => p.sem === "conditional").length;
  const noElegibles = PROCESOS.filter((p) => p.sem === "not-eligible").length;

  return (
    <div>
      <PageHeader
        title="Procesos"
        subtitle="Gestiona y analiza los procesos de contratación pública."
      />

      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatCard label="Total procesos" value={total} icon="file-text" tint="blue" />
        <StatCard label="Elegibles" value={elegibles} icon="check-circle" tint="green" />
        <StatCard label="Con observaciones" value={conObs} icon="alert" tint="amber" />
        <StatCard label="No elegibles" value={noElegibles} icon="x-circle" tint="red" />
      </div>

      <ProcesosTable procesos={PROCESOS} />
    </div>
  );
}
