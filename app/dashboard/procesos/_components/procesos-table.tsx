"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SemPill } from "@/components/page";
import { Icon } from "@/components/ui";
import type { MockProceso } from "@/lib/mock";

const SEL_CLS = "h-9 px-3 pr-8 border border-graphite-200 rounded-lg text-sm bg-white text-graphite-700 focus:outline-none focus:ring-2 focus:ring-blue-500";

export function ProcesosTable({ procesos }: { procesos: MockProceso[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filterSem, setFilterSem] = useState("");
  const [filterModalidad, setFilterModalidad] = useState("");
  const [filterCierre, setFilterCierre] = useState("");

  const filtered = procesos.filter((p) => {
    const matchQ = !q || [p.nombre, p.id, p.entidad].some((s) => s.toLowerCase().includes(q.toLowerCase()));
    const matchSem = !filterSem || p.sem === filterSem;
    const matchMod = !filterModalidad || p.modalidad === filterModalidad;
    return matchQ && matchSem && matchMod;
  });

  return (
    <div>
      <div className="flex gap-2.5 items-center bg-white border border-graphite-200 rounded-xl p-3.5 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 stroke-graphite-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar proceso..."
            className="w-full h-9 pl-9 pr-3 border border-graphite-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={filterSem} onChange={(e) => setFilterSem(e.target.value)} className={SEL_CLS}>
          <option value="">Semáforo</option>
          <option value="eligible">Elegible</option>
          <option value="conditional">Con observaciones</option>
          <option value="not-eligible">No elegible</option>
        </select>
        <select value={filterModalidad} onChange={(e) => setFilterModalidad(e.target.value)} className={SEL_CLS}>
          <option value="">Modalidad</option>
          <option value="Licitación Pública">Licitación pública</option>
          <option value="Selección Abreviada">Selección abreviada</option>
          <option value="Mínima Cuantía">Mínima cuantía</option>
          <option value="Concurso de Méritos">Concurso de méritos</option>
        </select>
        <select value={filterCierre} onChange={(e) => setFilterCierre(e.target.value)} className={SEL_CLS}>
          <option value="">Cierre</option>
          <option value="semana">Esta semana</option>
          <option value="mes">Este mes</option>
        </select>
        <button
          type="button"
          onClick={() => { setQ(""); setFilterSem(""); setFilterModalidad(""); setFilterCierre(""); }}
          className="h-9 px-3 text-sm text-graphite-600 hover:text-graphite-900 font-medium"
        >
          Limpiar
        </button>
      </div>

      <div className="bg-white border border-graphite-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-graphite-100">
              {["", "Proceso", "Entidad", "Modalidad", "Pliegos", "Presupuesto", "Cierre", ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-graphite-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => router.push(`/dashboard/analisis/${p.analisisId}`)}
                className="border-b border-graphite-50 hover:bg-graphite-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 w-8">
                  <SemPill status={p.sem} />
                </td>
                <td className="px-4 py-3 max-w-[280px]">
                  <div className="font-medium text-graphite-900 line-clamp-1">{p.nombre}</div>
                  <div className="font-mono text-xs text-graphite-400 mt-0.5">{p.id}</div>
                </td>
                <td className="px-4 py-3 text-graphite-600">{p.entidad}</td>
                <td className="px-4 py-3 text-graphite-600">{p.modalidad}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                    {p.pliegos}
                  </span>
                </td>
                <td className="px-4 py-3 text-graphite-700 font-mono text-xs">{p.presupuesto}</td>
                <td className="px-4 py-3 text-graphite-600">{p.cierre}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/upload?procesoId=${p.id}`); }}
                      className="p-1.5 rounded-md hover:bg-blue-50 text-graphite-400 hover:text-blue-600 transition-colors"
                      title="Subir pliego"
                    >
                      <Icon name="upload" size={15} />
                    </button>
                    <Icon name="chev-right" size={15} className="stroke-graphite-300" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
