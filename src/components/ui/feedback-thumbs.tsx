'use client'

/**
 * FeedbackThumbs — DS primitive (T18, REQ-026)
 *
 * Generic thumbs-up / thumbs-down relevance feedback control.
 * - Active state: filled icon when rating matches.
 * - After click: optional 1-line comment input appears (200 char max).
 * - "Enviar" submits via onSubmit callback.
 * - Re-clicking the active thumb calls onSubmit(null, null) — toggle-off.
 * - Toast "Gracias por tu opinión" shown on success.
 *
 * NOT tied to any specific server action — the caller wires the action.
 */

import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FeedbackThumbsProps {
  initialRating: 'up' | 'down' | null
  initialComment: string | null
  /** Called with (rating, comment). rating = null means toggle-off (delete). */
  onSubmit: (rating: 'up' | 'down' | null, comment: string | null) => Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons — simple SVG so there's no new dependency
// ─────────────────────────────────────────────────────────────────────────────

function ThumbUpIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
      />
    </svg>
  )
}

function ThumbDownIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function FeedbackThumbs({
  initialRating,
  initialComment,
  onSubmit,
}: FeedbackThumbsProps) {
  const [rating, setRating] = useState<'up' | 'down' | null>(initialRating)
  const [comment, setComment] = useState<string>(initialComment ?? '')
  // null = idle; 'up' | 'down' = pending confirmation (comment input visible)
  const [pendingRating, setPendingRating] = useState<'up' | 'down' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(false)

  /**
   * Handle a thumb button click.
   * - If the clicked rating == current active rating → toggle-off immediately (no comment).
   * - Otherwise → enter pending state and show comment input.
   */
  async function handleThumbClick(clicked: 'up' | 'down') {
    if (rating === clicked) {
      // Toggle-off
      setSubmitting(true)
      try {
        await onSubmit(null, null)
        setRating(null)
        setComment('')
        setPendingRating(null)
        showToast()
      } finally {
        setSubmitting(false)
      }
      return
    }
    // Enter pending state — show comment input
    setPendingRating(clicked)
  }

  /** Submit with the current pendingRating + comment. */
  async function handleEnviar() {
    if (!pendingRating) return
    setSubmitting(true)
    try {
      const trimmed = comment.trim() || null
      await onSubmit(pendingRating, trimmed)
      setRating(pendingRating)
      setPendingRating(null)
      showToast()
    } finally {
      setSubmitting(false)
    }
  }

  function showToast() {
    setToast(true)
    setTimeout(() => setToast(false), 3000)
  }

  const activeRating = pendingRating ?? rating

  return (
    <div className="flex flex-col gap-2">
      {/* Thumb buttons row */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-graphite-500">¿Fue útil?</span>

        {/* ThumbsUp */}
        <button
          type="button"
          aria-label="Pulgar arriba — útil"
          data-feedback-up
          data-active={activeRating === 'up' ? 'true' : 'false'}
          disabled={submitting}
          onClick={() => handleThumbClick('up')}
          className={[
            'transition-colors p-1 rounded',
            activeRating === 'up'
              ? 'text-green-600 bg-green-50'
              : 'text-graphite-400 hover:text-green-600 hover:bg-green-50',
          ].join(' ')}
        >
          <ThumbUpIcon filled={activeRating === 'up'} />
        </button>

        {/* ThumbsDown */}
        <button
          type="button"
          aria-label="Pulgar abajo — no útil"
          data-feedback-down
          data-active={activeRating === 'down' ? 'true' : 'false'}
          disabled={submitting}
          onClick={() => handleThumbClick('down')}
          className={[
            'transition-colors p-1 rounded',
            activeRating === 'down'
              ? 'text-red-600 bg-red-50'
              : 'text-graphite-400 hover:text-red-600 hover:bg-red-50',
          ].join(' ')}
        >
          <ThumbDownIcon filled={activeRating === 'down'} />
        </button>
      </div>

      {/* Comment input — appears when a thumb is pending confirmation */}
      {pendingRating !== null && (
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            role="textbox"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={200}
            placeholder="Comentario opcional (máx. 200 caracteres)"
            className="w-full text-xs border border-graphite-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleEnviar}
            disabled={submitting}
            className="self-end text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      )}

      {/* Toast confirmation */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5"
        >
          Gracias por tu opinión
        </div>
      )}
    </div>
  )
}
