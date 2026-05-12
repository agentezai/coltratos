/**
 * T12: Proceso metadata header strip + SECOP II link
 *
 * REQ-014 — reads from `analyses.proceso_metadata_snapshot` (never re-fetches datos.gov.co).
 * RN-003  — monetary values: COP with dots; dates: DD Mes YYYY.
 * RN-009  — `proceso_lookup_status = 'unverified'` renders "Datos ingresados manualmente" chip;
 *            SECOP II link is replaced with the static text "No disponible".
 *
 * Design-system constraints (plan-12 §Design System):
 * - Uses existing Chip primitive from @/components/ui — MUST NOT introduce new primitives.
 * - Tooltip: implemented via native `title` attribute to avoid a new dependency (per NFR-02).
 *   T15 may revisit with a full Tooltip DS primitive once one exists.
 */

import { Chip } from '@/components/ui/chip'
import type { AnalysisDetail } from '@/types/domain/analysis'

// ─── Formatters (RN-003) ──────────────────────────────────────────────────────

function formatCOP(amount: number | null): string {
  if (amount === null) return '—'
  // Format with es-CO locale: dots as thousand separators, no decimals
  return `$${amount.toLocaleString('es-CO')} COP`
}

const MONTH_ES: Record<number, string> = {
  0: 'ene', 1: 'feb', 2: 'mar', 3: 'abr', 4: 'may', 5: 'jun',
  6: 'jul', 7: 'ago', 8: 'sep', 9: 'oct', 10: 'nov', 11: 'dic',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const day = d.getUTCDate()
  const mon = MONTH_ES[d.getUTCMonth()]
  const year = d.getUTCFullYear()
  return `${day} ${mon} ${year}`
}

// ─── SECOP II URL builder ─────────────────────────────────────────────────────

function secopUrl(numeroProceso: string): string {
  return `https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=${encodeURIComponent(numeroProceso)}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface ProcesoHeaderProps {
  detail: Pick<AnalysisDetail, 'procesoLookupStatus' | 'procesoMetadata'>
}

export function ProcesoHeader({ detail }: ProcesoHeaderProps) {
  const { procesoLookupStatus: lookupStatus, procesoMetadata: meta } = detail
  const isUnverified = lookupStatus === 'unverified'

  return (
    <div
      data-component="proceso-header"
      className="flex flex-wrap items-start gap-x-5 gap-y-2 px-5 py-3 bg-white border border-graphite-100 rounded-xl text-sm"
    >
      {/* Unverified badge — rendered first per RN-009 */}
      {isUnverified && (
        <Chip variant="amber" dot className="self-center">
          Datos ingresados manualmente
        </Chip>
      )}

      {/* Entidad */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-graphite-400 font-medium uppercase tracking-wide">
          Entidad
        </span>
        <span className="text-graphite-900 font-medium">{meta.entidad}</span>
      </div>

      {/* Objeto — truncated to 2 lines; full text via native title */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-[160px] max-w-sm">
        <span className="text-xs text-graphite-400 font-medium uppercase tracking-wide">
          Objeto
        </span>
        <span
          data-field="objeto"
          className="text-graphite-900 font-medium line-clamp-2 cursor-default"
          title={meta.objeto_a_contratar}
        >
          {meta.objeto_a_contratar}
        </span>
      </div>

      {/* Modalidad */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-graphite-400 font-medium uppercase tracking-wide">
          Modalidad
        </span>
        <Chip variant="gray" dot={false}>
          {meta.modalidad}
        </Chip>
      </div>

      {/* Valor estimado */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-graphite-400 font-medium uppercase tracking-wide">
          Valor estimado
        </span>
        <span className="text-graphite-900 font-medium">
          {formatCOP(meta.cuantia_proceso)}
        </span>
      </div>

      {/* Fecha de cierre */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-graphite-400 font-medium uppercase tracking-wide">
          Cierre
        </span>
        <span className="text-graphite-900 font-medium">
          {formatDate(meta.fecha_limite_de_recepcion)}
        </span>
      </div>

      {/* SECOP II link — hidden when unverified (RN-009) */}
      <div className="flex flex-col gap-0.5 self-center">
        {isUnverified ? (
          <span className="text-graphite-400 text-xs">
            Ver en SECOP II — <span data-field="secop-unavailable">No disponible</span>
          </span>
        ) : (
          <a
            href={secopUrl(meta.numero_proceso)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 text-xs hover:underline"
            aria-label="Ver en SECOP II"
          >
            Ver en SECOP II →
          </a>
        )}
      </div>
    </div>
  )
}
