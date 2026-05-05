"use client";

import { useState } from "react";

type PackageId = "basico" | "pro" | "empresarial";

const PACKAGES: { id: PackageId; nombre: string; analisis: number; precioCOP: string; precioUSD: string; popular?: boolean }[] = [
  { id: "basico", nombre: "Básico", analisis: 200, precioCOP: "$9.900", precioUSD: "$2.40 USD", popular: true },
  { id: "pro", nombre: "Pro", analisis: 500, precioCOP: "$19.900", precioUSD: "$4.85 USD" },
  { id: "empresarial", nombre: "Empresarial", analisis: 1200, precioCOP: "$39.900", precioUSD: "$9.75 USD" },
];

export function PackageSelector() {
  const [selected, setSelected] = useState<PackageId>("basico");

  return (
    <div className="space-y-3">
      {PACKAGES.map((pkg) => (
        <button
          key={pkg.id}
          type="button"
          onClick={() => setSelected(pkg.id)}
          className={[
            "w-full text-left p-4 rounded-xl border-2 transition-all",
            selected === pkg.id
              ? "border-blue-600 bg-blue-50"
              : "border-graphite-200 bg-white hover:border-graphite-300",
          ].join(" ")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={["w-4 h-4 rounded-full border-2 flex-none", selected === pkg.id ? "border-blue-600 bg-blue-600" : "border-graphite-300"].join(" ")}>
                {selected === pkg.id && <div className="w-full h-full rounded-full bg-white scale-50" />}
              </div>
              <span className="font-semibold text-graphite-900">{pkg.nombre}</span>
              {pkg.popular && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Más popular</span>
              )}
            </div>
            <div className="text-right">
              <div className="font-bold text-graphite-900">{pkg.precioCOP} COP</div>
              <div className="text-xs text-graphite-400">{pkg.precioUSD}</div>
            </div>
          </div>
          <div className="ml-6.5 mt-1.5 text-sm text-graphite-600">
            {pkg.analisis.toLocaleString("es-CO")} análisis
          </div>
        </button>
      ))}
    </div>
  );
}
