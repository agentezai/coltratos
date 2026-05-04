"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SemPill, Pagination } from "@/components/page";
import { Icon } from "@/components/ui";
import type { MockAnalisis } from "@/lib/mock";

const SEL = "h-9 px-3 pr-8 border border-graphite-200 rounded-lg text-sm bg-white text-graphite-700 focus:outline-none focus:ring-2 focus:ring-blue-500";
const DOT = { ok: "bg-green-500", warn: "bg-amber-400", fail: "bg-red-500" } as const;

export function AnalisisTable({ analisis }: { analisis: MockAnalisis[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filterSem, setFilterSem] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const filtered = analisis.filter((a) => {
    const matchQ = !q || [a.id, a.proceso, a.entidad].some((s) => s.toLowerCase().includes(q.toLowerCase()));
    const matchSem = !filterSem || a.sem === filterSem;
    return matchQ && matchSem;
  });

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      <div className="flex gap-2.5 items-center bg-white border border-graphite-200 rounded-xl p-3.5 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 stroke-graphite-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar análisis..."
            className="w-full h-9 pl-9 pr-3 border border-graphite-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={filterSem} onChange={(e) => setFilterSem(e.target.value)} className={SEL}>
          <option value="">Semáforo</option>
          <option value="eligible">Elegible</option>
          <option value="conditional">Con observaciones</option>
          <option value="not-eligible">No elegible</option>
        </select>
        <button type="button" onClick={() => { setQ(""); setFilterSem(""); }} className="h-9 px-3 text-sm text-graphite-600 hover:text-graphite-900 font-medium">
          Limpiar
        </button>
      </div>

      <div className="bg-white border border-graphite-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-graphite-100">
              {["ID Análisis", "Proceso / Objeto", "Entidad", "Fecha", "Semáforo", "Resultado", "Requisitos", "Acciones"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-graphite-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((a) => (
              <tr
                key={a.id}
                onClick={() => router.push(`/dashboard/analisis/${a.id}`)}
                className="border-b border-graphite-50 hover:bg-graphite-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-graphite-600">{a.id}</td>
                <td className="px-4 py-3 max-w-[220px]">
                  <div className="font-mono text-xs font-bold text-graphite-900 line-clamp-1">{a.proceso}</div>
                  <div className="text-xs text-graphite-400 mt-0.5">{a.procesoId}</div>
                </td>
                <td className="px-4 py-3 text-graphite-600 text-xs">{a.entidad}</td>
                <td className="px-4 py-3 text-graphite-500 text-xs">{a.fecha}</td>
                <td className="px-4 py-3"><SemPill status={a.sem} /></td>
                <td className="px-4 py-3 font-mono text-sm font-bold text-graphite-900">{a.resultado}%</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className={["w-2.5 h-2.5 rounded-full", DOT.ok].join(" ")} title="Cumplen" />
                    <span className="text-xs text-graphite-500">{a.requisitos.ok}</span>
                    <span className={["w-2.5 h-2.5 rounded-full", DOT.warn].join(" ")} title="Con observaciones" />
                    <span className="text-xs text-graphite-500">{a.requisitos.warn}</span>
                    <span className={["w-2.5 h-2.5 rounded-full", DOT.fail].join(" ")} title="No cumplen" />
                    <span className="text-xs text-graphite-500">{a.requisitos.fail}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/analisis/${a.id}`); }}
                      className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      Ver análisis
                    </button>
                    <button type="button" className="p-1.5 rounded-md hover:bg-graphite-100 text-graphite-400 transition-colors">
                      <Icon name="more" size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={48} page={page} perPage={PER_PAGE} onPage={setPage} />
      </div>
    </div>
  );
}
