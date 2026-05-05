"use client";

import { useState } from "react";
import { SemPill } from "@/components/page";
import { Icon } from "@/components/ui";
import type { MockResultDetail } from "@/lib/mock";

type Tab = "resumen" | "juridico" | "financiero" | "tecnico" | "experiencia";

const TABS: { id: Tab; label: string; icon: import("@/components/ui").IconName }[] = [
  { id: "resumen", label: "Resumen", icon: "target" },
  { id: "juridico", label: "Jurídico", icon: "shield" },
  { id: "financiero", label: "Financiero", icon: "dollar-sign" },
  { id: "tecnico", label: "Técnico", icon: "settings" },
  { id: "experiencia", label: "Experiencia", icon: "bar-chart" },
];

export function ResultTabs({ result }: { result: MockResultDetail }) {
  const [tab, setTab] = useState<Tab>("resumen");
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (id: string) => setOpen((prev) => (prev === id ? null : id));

  return (
    <div>
      <div className="flex gap-1 p-1 bg-graphite-100 rounded-xl mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-tab="true"
            data-active={tab === t.id ? "true" : undefined}
            onClick={() => setTab(t.id)}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              tab === t.id
                ? "bg-white text-graphite-900 shadow-sm"
                : "text-graphite-500 hover:text-graphite-700",
            ].join(" ")}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {result.reqs.map((req) => {
          const isOpen = open === req.id;
          return (
            <div key={req.id} data-accordion-row="true" className="bg-white border border-graphite-200 rounded-xl overflow-hidden">
              <div
                data-accordion-header="true"
                role="button"
                tabIndex={0}
                onClick={() => toggle(req.id)}
                onKeyDown={(e) => e.key === "Enter" && toggle(req.id)}
                className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-graphite-50 transition-colors select-none"
              >
                <Icon
                  name="chev-down"
                  size={16}
                  className={["stroke-graphite-400 flex-none transition-transform", isOpen ? "rotate-180" : ""].join(" ")}
                  style={isOpen ? { transform: "rotate(180deg)" } : {}}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-graphite-900 text-sm">{req.titulo}</div>
                  <div className="text-xs text-graphite-400 mt-0.5">{req.subtitulo}</div>
                </div>
                <SemPill status={req.status} />
                {req.observaciones > 0 && (
                  <span className="text-xs text-graphite-500 ml-1">{req.observaciones} obs.</span>
                )}
              </div>
              <div data-accordion-body="true" hidden={!isOpen} className="px-5 pb-4 pt-1 border-t border-graphite-100">
                <p className="text-sm text-graphite-700">{req.razonamiento}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
