"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui";
import { SemPill } from "@/components/page";
import { PROCESOS } from "@/lib/mock";

type Step = "link" | "upload" | "progress" | "done";
type Mode = "select" | "url" | "new";
type UrlStatus = "idle" | "loading" | "found" | "not-found";

const STEPPER = ["Extracción", "Análisis", "Evaluación", "Validación"];
const PROGRESS_ROWS = [
  { label: "Archivo recibido", done: true },
  { label: "Extracción de texto", done: true },
  { label: "Segmentación de requisitos", active: true },
  { label: "Evaluación de elegibilidad", pending: true },
  { label: "Generando resultado", pending: true },
];

function UploadInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState<Step>("link");
  const [mode, setMode] = useState<Mode>("select");
  const [procesoId, setProcesoId] = useState(() => params.get("procesoId") ?? "");
  const [urlValue, setUrlValue] = useState("");
  const [urlStatus, setUrlStatus] = useState<UrlStatus>("idle");
  const [file, setFile] = useState<File | null>(null);

  const canStart =
    file != null &&
    ((mode === "select" && procesoId !== "") ||
      (mode === "url" && urlStatus === "found") ||
      mode === "new");

  const selectedProceso = PROCESOS.find((p) => p.id === procesoId);

  const handleVerify = () => {
    setUrlStatus("loading");
    setTimeout(() => setUrlStatus("found"), 800);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  if (step === "progress") {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-graphite-900 mb-6">Análisis en progreso</h1>

        <div className="bg-white border border-graphite-200 rounded-xl p-6 mb-4">
          <div className="flex justify-center gap-0 mb-8">
            {STEPPER.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={["flex flex-col items-center gap-1.5", i < 2 ? "opacity-100" : "opacity-40"].join(" ")}>
                  <div className={["w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold", i < 2 ? "bg-blue-600 text-white" : "bg-graphite-100 text-graphite-500"].join(" ")}>
                    {i < 2 ? "✓" : i + 1}
                  </div>
                  <span className="text-xs text-graphite-600 w-20 text-center">{s}</span>
                </div>
                {i < STEPPER.length - 1 && <div className="w-16 h-px bg-graphite-200 mb-5 mx-2" />}
              </div>
            ))}
          </div>

          <div className="flex justify-center mb-6">
            <svg width={100} height={100} viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={40} fill="none" stroke="#e5e7eb" strokeWidth={8} />
              <circle
                cx={50} cy={50} r={40} fill="none" stroke="#2563eb" strokeWidth={8}
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - 0.42)}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
              <text x={50} y={55} textAnchor="middle" className="text-lg font-bold" fill="#111827" fontSize={18} fontWeight="bold">42%</text>
            </svg>
          </div>

          <div className="space-y-2.5 max-w-sm mx-auto">
            {PROGRESS_ROWS.map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <div className={["w-5 h-5 rounded-full flex items-center justify-center flex-none text-xs",
                  row.done ? "bg-green-100 text-green-600" :
                  row.active ? "bg-blue-100 text-blue-600" :
                  "bg-graphite-100 text-graphite-300"].join(" ")}>
                  {row.done ? "✓" : row.active ? "●" : "○"}
                </div>
                <span className={["text-sm", row.done ? "text-graphite-600 line-through" : row.active ? "text-graphite-900 font-medium" : "text-graphite-400"].join(" ")}>
                  {row.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard/analisis/ANA-2026-00048")}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          Ver resultado (demo)
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-graphite-900 mb-6">Subir pliego de condiciones</h1>

      {/* Step 1 */}
      <div className="bg-white border border-graphite-200 rounded-xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-none">1</div>
          <h2 className="font-semibold text-graphite-900">Vincular a proceso</h2>
        </div>

        <div className="flex gap-1 p-1 bg-graphite-100 rounded-lg mb-5 w-fit">
          {(["select", "url", "new"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={["px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                mode === m ? "bg-white text-graphite-900 shadow-sm" : "text-graphite-500 hover:text-graphite-700"].join(" ")}
            >
              {m === "select" ? "Elegir proceso" : m === "url" ? "Pegar URL / ID" : "Crear nuevo"}
            </button>
          ))}
        </div>

        {mode === "select" && (
          <div>
            <select
              value={procesoId}
              onChange={(e) => setProcesoId(e.target.value)}
              className="w-full h-10 px-3 border border-graphite-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Seleccionar proceso...</option>
              {PROCESOS.map((p) => (
                <option key={p.id} value={p.id}>{p.id} — {p.nombre.substring(0, 50)}</option>
              ))}
            </select>
            {selectedProceso && (
              <div className="mt-3 p-4 bg-graphite-50 rounded-lg border border-graphite-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-graphite-900 text-sm">{selectedProceso.nombre}</div>
                    <div className="text-xs text-graphite-500 mt-1">{selectedProceso.entidad} · {selectedProceso.modalidad} · Cierra {selectedProceso.cierre}</div>
                    <div className="text-xs font-mono text-graphite-400 mt-1">{selectedProceso.id} · {selectedProceso.pliegos} pliego(s)</div>
                  </div>
                  <SemPill status={selectedProceso.sem} />
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "url" && (
          <div>
            <div className="flex gap-2">
              <input
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="Pega la URL de SECOP II o el ID del proceso"
                className="flex-1 h-10 px-3 border border-graphite-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={!urlValue || urlStatus === "loading"}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {urlStatus === "loading" ? "Verificando..." : "Verificar"}
              </button>
            </div>
            {urlStatus === "found" && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-medium">
                Proceso encontrado — LP-2024-00123 · Alcaldía de Medellín
              </div>
            )}
          </div>
        )}

        {mode === "new" && (
          <div className="grid grid-cols-2 gap-3">
            {[["Número de proceso", "Ej. LP-2024-00123"], ["Nombre del proceso", "Descripción del objeto"], ["Entidad contratante", "Nombre de la entidad"], ["Modalidad", "Licitación Pública"]].map(([label, ph]) => (
              <div key={label}>
                <label className="block text-xs font-medium text-graphite-700 mb-1">{label}</label>
                <input placeholder={ph} className="w-full h-9 px-3 border border-graphite-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2 */}
      <div className="bg-white border border-graphite-200 rounded-xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-none">2</div>
          <h2 className="font-semibold text-graphite-900">Subir el documento</h2>
        </div>

        {!file ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-graphite-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors"
          >
            <div className="inline-flex w-14 h-14 rounded-full bg-graphite-100 items-center justify-center mb-4 text-graphite-400">
              <Icon name="file-text" size={24} />
            </div>
            <div className="text-sm text-graphite-700 font-medium mb-1">Arrastra y suelta tu archivo PDF aquí</div>
            <label className="text-sm text-blue-600 cursor-pointer hover:underline">
              o haz clic para buscar
              <input type="file" accept=".pdf" className="sr-only" onChange={handleFileChange} />
            </label>
            <div className="text-xs text-graphite-400 mt-2">Solo PDF · Máx. 20 MB</div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-graphite-50 rounded-lg border border-graphite-200">
            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded">PDF</span>
            <span className="flex-1 text-sm text-graphite-800 font-medium">{file.name}</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Archivo cargado
            </span>
            <button type="button" onClick={() => setFile(null)} className="p-1 rounded hover:bg-graphite-200 text-graphite-400 hover:text-graphite-700 transition-colors">
              <Icon name="x" size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Info strip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[["Costo por análisis", "1 crédito"], ["Créditos disponibles", "22 créditos"], ["Tiempo estimado", "~45 segundos"]].map(([label, value]) => (
          <div key={label} className="bg-white border border-graphite-200 rounded-xl p-4 text-center">
            <div className="text-xs text-graphite-500">{label}</div>
            <div className="text-sm font-bold text-graphite-900 mt-1">{value}</div>
          </div>
        ))}
      </div>

      {/* Privacy banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-5">
        <Icon name="shield" size={18} className="stroke-blue-600 flex-none mt-0.5" />
        <p className="text-xs text-blue-800">
          Tu documento es procesado de forma segura y no es compartido con terceros. Los datos son encriptados en tránsito y en reposo.
        </p>
      </div>

      {/* Footer */}
      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()} className="px-5 py-2.5 border border-graphite-200 rounded-xl text-sm font-medium text-graphite-700 hover:bg-graphite-50 transition-colors">
          Cancelar
        </button>
        <button
          type="button"
          disabled={!canStart}
          onClick={() => setStep("progress")}
          className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Iniciar análisis
        </button>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-graphite-500">Cargando...</div>}>
      <UploadInner />
    </Suspense>
  );
}
