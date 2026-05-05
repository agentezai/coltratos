"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import { Chip } from "@/components/ui/chip";
import { Pagination } from "@/components/page";
import type { MockMiembro } from "@/lib/mock";

type Tab = "miembros" | "invitaciones";

const ROL_VARIANT: Record<string, "violet" | "blue" | "gray"> = {
  Administrador: "violet",
  Analista: "blue",
  Viewer: "gray",
};

const SEL = "h-9 px-3 pr-8 border border-graphite-200 rounded-lg text-sm bg-white text-graphite-700 focus:outline-none focus:ring-2 focus:ring-blue-500";

export function MemberTable({ miembros }: { miembros: MockMiembro[] }) {
  const [tab, setTab] = useState<Tab>("miembros");
  const [q, setQ] = useState("");
  const [filterRol, setFilterRol] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 6;

  const filtered = miembros.filter((m) => {
    const matchQ = !q || [m.nombre, m.email].some((s) => s.toLowerCase().includes(q.toLowerCase()));
    const matchRol = !filterRol || m.rol === filterRol;
    return matchQ && matchRol;
  });

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="bg-white border border-graphite-200 rounded-xl overflow-hidden">
      <div className="flex gap-1 p-1 border-b border-graphite-100">
        {(["miembros", "invitaciones"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              tab === t ? "bg-graphite-100 text-graphite-900" : "text-graphite-500 hover:text-graphite-700",
            ].join(" ")}
          >
            {t === "miembros" ? "Miembros" : "Invitaciones pendientes"}
            {t === "invitaciones" && (
              <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">3</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-2.5 items-center p-3.5 border-b border-graphite-100 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 stroke-graphite-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar miembro..."
            className="w-full h-9 pl-9 pr-3 border border-graphite-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={filterRol} onChange={(e) => setFilterRol(e.target.value)} className={SEL}>
          <option value="">Rol</option>
          <option value="Administrador">Administrador</option>
          <option value="Analista">Analista</option>
          <option value="Viewer">Viewer</option>
        </select>
        <button type="button" className="px-3 py-2 border border-graphite-200 rounded-lg text-sm font-medium text-graphite-700 hover:bg-graphite-50">
          Filtros
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-graphite-100">
            {["Usuario", "Rol", "Estado", "Último acceso", "Acciones"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-graphite-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paged.map((m) => (
            <tr key={m.id} className="border-b border-graphite-50 hover:bg-graphite-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-none"
                    style={{ background: "linear-gradient(135deg, #2563eb, #34d399)" }}
                  >
                    {m.initials}
                  </div>
                  <div>
                    <div className="font-medium text-graphite-900">{m.nombre}</div>
                    <div className="text-xs text-graphite-400">{m.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Chip variant={ROL_VARIANT[m.rol] ?? "gray"} dot>{m.rol}</Chip>
              </td>
              <td className="px-4 py-3">
                <Chip variant={m.estado === "Activo" ? "green" : "red"} dot>{m.estado}</Chip>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-graphite-500">{m.ultimoAcceso}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button type="button" className="p-1.5 rounded-md hover:bg-graphite-100 text-graphite-400 transition-colors"><Icon name="eye" size={14} /></button>
                  <button type="button" className="p-1.5 rounded-md hover:bg-graphite-100 text-graphite-400 transition-colors"><Icon name="settings" size={14} /></button>
                  <button type="button" className="p-1.5 rounded-md hover:bg-graphite-100 text-graphite-400 transition-colors"><Icon name="more" size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination total={16} page={page} perPage={PER_PAGE} onPage={setPage} />
    </div>
  );
}
