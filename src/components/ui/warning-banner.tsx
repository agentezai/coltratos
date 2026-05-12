/**
 * WarningBanner — DS primitive (T17, REQ-027)
 *
 * Generic warning banner for partial-extraction alerts, cost warnings,
 * and other contextual notices. Supports amber and red variants.
 *
 * Not dismissible by default (RN-010: extraction warnings must persist
 * until the underlying condition is resolved via re-run).
 */

'use client'

import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type WarningBannerVariant = 'amber' | 'red'

export interface WarningBannerProps {
  variant: WarningBannerVariant
  title: string
  description: string
  /** Optional primary action rendered as a button inside the banner. */
  action?: { label: string; onClick: () => void }
  /**
   * When true a "Cerrar" button is shown. Default false.
   * Extraction warnings MUST NOT be dismissible (RN-010) — only set this
   * on transient informational banners.
   */
  dismissible?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Style maps
// ─────────────────────────────────────────────────────────────────────────────

const WRAPPER: Record<WarningBannerVariant, string> = {
  amber: 'bg-amber-50 border border-amber-300 text-amber-900',
  red:   'bg-red-50   border border-red-300   text-red-900',
}

const ICON: Record<WarningBannerVariant, string> = {
  amber: 'text-amber-600',
  red:   'text-red-600',
}

const ICON_LABEL: Record<WarningBannerVariant, string> = {
  amber: '⚠',
  red:   '✗',
}

const ACTION_BTN: Record<WarningBannerVariant, string> = {
  amber:
    'text-xs font-semibold text-amber-800 border border-amber-400 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors',
  red:
    'text-xs font-semibold text-red-800 border border-red-400 rounded-lg px-3 py-1.5 hover:bg-red-100 transition-colors',
}

const CLOSE_BTN: Record<WarningBannerVariant, string> = {
  amber: 'text-amber-500 hover:text-amber-700 text-lg leading-none',
  red:   'text-red-500   hover:text-red-700   text-lg leading-none',
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function WarningBanner({
  variant,
  title,
  description,
  action,
  dismissible = false,
}: WarningBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      data-testid="warning-banner"
      data-variant={variant}
      className={[
        'flex items-start gap-3 rounded-xl px-5 py-4',
        WRAPPER[variant],
      ].join(' ')}
      role="alert"
    >
      {/* Icon */}
      <span
        className={['font-bold text-base flex-none mt-0.5', ICON[variant]].join(' ')}
        aria-hidden="true"
      >
        {ICON_LABEL[variant]}
      </span>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm mt-0.5 leading-relaxed">{description}</p>

        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={['mt-3', ACTION_BTN[variant]].join(' ')}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Dismiss */}
      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar"
          className={['flex-none', CLOSE_BTN[variant]].join(' ')}
        >
          ×
        </button>
      )}
    </div>
  )
}
