'use client'

/**
 * T17: ExtractionWarning — Partial / failed extraction surface (REQ-027, RN-010)
 *
 * Renders ABOVE the verdict banner (page.tsx controls DOM order).
 *
 * Branches:
 * - extraction_status = 'failed'  → red WarningBanner with RerunButton CTA.
 *   This branch signals to page.tsx that the verdict banner should NOT render.
 * - extraction_status = 'partial' OR pages_flagged > 0
 *   → amber WarningBanner + "Ver páginas afectadas" drawer.
 *   Banner is non-dismissible (RN-010) — re-run is the only way to clear it.
 * - Otherwise → null (no DOM output).
 */

import { useState } from 'react'
import { WarningBanner } from '@/components/ui/warning-banner'
import { RerunButton } from './rerun-button'
import type { AnalysisDetail } from '@/types/domain/analysis'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtractionWarningProps {
  detail: Pick<
    AnalysisDetail,
    'id' | 'extractionStatus' | 'pagesFlagged' | 'flaggedPagesList'
  >
}

// ─────────────────────────────────────────────────────────────────────────────
// Flagged-pages drawer
// ─────────────────────────────────────────────────────────────────────────────

interface FlaggedPagesDrawerProps {
  pages: number[]
  onClose: () => void
}

function FlaggedPagesDrawer({ pages, onClose }: FlaggedPagesDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel — slides in from right */}
      <div
        data-testid="flagged-pages-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flagged-pages-title"
        className="fixed z-50 inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-graphite-200">
          <h2
            id="flagged-pages-title"
            className="text-sm font-semibold text-graphite-900"
          >
            Páginas no legibles
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-graphite-400 hover:text-graphite-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          <p className="text-xs text-graphite-500 mb-3">
            Las siguientes páginas no pudieron extraerse durante el análisis.
            Los requisitos en estas páginas no se incluyeron en el resultado.
          </p>

          {pages.length === 0 ? (
            <p className="text-sm text-graphite-600 italic">
              No hay páginas registradas.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {pages.map((page) => (
                <li
                  key={page}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200"
                >
                  <span
                    className="text-amber-600 font-bold text-xs shrink-0"
                    aria-hidden="true"
                  >
                    ⚠
                  </span>
                  <span className="text-sm font-medium text-amber-900">
                    {page}
                  </span>
                  <span className="text-xs text-amber-600 ml-auto">
                    Página no legible
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-graphite-200">
          <p className="text-xs text-graphite-400">
            Para incluir estas páginas, sube de nuevo el pliego o contacta soporte.
          </p>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ExtractionWarning({ detail }: ExtractionWarningProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { extractionStatus, pagesFlagged, flaggedPagesList } = detail

  // Failed — red banner; verdict banner will not render (page.tsx checks this)
  if (extractionStatus === 'failed') {
    return (
      <div
        data-testid="extraction-failed-wrapper"
        className="rounded-xl border border-red-200 bg-red-50"
      >
        <WarningBanner
          variant="red"
          title="Análisis fallido"
          description="No fue posible extraer los requisitos del pliego. Verifica el archivo y vuelve a intentarlo."
        />
        {/* RerunButton renders its own confirmation dialog (T16) */}
        <div className="px-5 pb-4 flex justify-start">
          <RerunButton analysisId={detail.id} variant="danger" />
        </div>
      </div>
    )
  }

  // Partial or flagged pages — amber banner
  const isPartial = extractionStatus === 'partial'
  const hasFlagged = pagesFlagged > 0

  if (!isPartial && !hasFlagged) {
    return null
  }

  const pageWord = pagesFlagged === 1 ? 'página' : 'páginas'
  const title = hasFlagged
    ? `Análisis parcial — ${pagesFlagged} ${pageWord} no ${pagesFlagged === 1 ? 'fue' : 'fueron'} legible${pagesFlagged === 1 ? '' : 's'}`
    : 'Análisis parcial — extracción incompleta'

  return (
    <>
      <WarningBanner
        variant="amber"
        title={title}
        description="Algunas páginas del pliego no pudieron extraerse. Los requisitos en estas páginas no se incluyeron en el análisis. Considera volver a subir el documento o contactar soporte."
        action={
          hasFlagged
            ? { label: 'Ver páginas afectadas', onClick: () => setDrawerOpen(true) }
            : undefined
        }
        dismissible={false}
      />

      {drawerOpen && (
        <FlaggedPagesDrawer
          pages={flaggedPagesList}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  )
}
