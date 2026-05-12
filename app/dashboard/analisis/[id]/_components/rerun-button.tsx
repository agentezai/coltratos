'use client'

/**
 * T16: RerunButton — Client component (REQ-024, RN-007)
 *
 * Wraps the "Volver a analizar" affordance from the VerdictBanner placeholder.
 * Shows a confirmation dialog before calling rerunAnalysis, then navigates
 * to the new analysis URL on success (S6 Flag F-3 — navigate to new URL).
 *
 * On error: displays inline error message; user remains on the original page.
 *
 * Uses native <dialog> element — no Radix/headless-ui dependency required.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { rerunAnalysis } from '../_actions/rerun-analysis'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RerunButtonProps {
  analysisId: string
  /** Optional variant for rendering in the failed-extraction state */
  variant?: 'default' | 'danger'
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function RerunButton({
  analysisId,
  variant = 'default',
}: RerunButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleOpenDialog() {
    setError(null)
    setOpen(true)
  }

  function handleCancel() {
    setOpen(false)
    setError(null)
  }

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      const { id: newId } = await rerunAnalysis(analysisId)
      router.push(`/dashboard/analisis/${newId}`)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error desconocido al reiniciar el análisis.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  const triggerCls =
    variant === 'danger'
      ? 'px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors'
      : 'text-xs px-3 py-1.5 border border-graphite-200 rounded-lg font-medium text-graphite-700 hover:bg-graphite-50 transition-colors w-full'

  return (
    <>
      {/* Trigger button — replaces the T13 placeholder */}
      <button
        type="button"
        onClick={handleOpenDialog}
        className={triggerCls}
        data-rerun-trigger="true"
      >
        Volver a analizar
      </button>

      {/* Confirmation dialog */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={handleCancel}
            aria-hidden="true"
          />

          {/* Dialog panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rerun-dialog-title"
            className="fixed z-50 inset-0 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
              {/* Title */}
              <h2
                id="rerun-dialog-title"
                className="text-base font-semibold text-graphite-900"
              >
                ¿Crear un nuevo análisis?
              </h2>

              {/* Body */}
              <p className="text-sm text-graphite-600">
                Esto creará un nuevo análisis con tu perfil actual. El análisis
                original se mantendrá.
              </p>

              {/* Inline error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  data-rerun-error="true"
                >
                  Error: {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-graphite-700 border border-graphite-300 rounded-lg hover:bg-graphite-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creando análisis…' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
