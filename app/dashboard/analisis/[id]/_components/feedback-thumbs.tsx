'use client'

/**
 * T18: FeedbackThumbs — page-level component (REQ-026)
 *
 * Wraps the DS primitive `FeedbackThumbs` with the `submitFeedback`
 * server action. Reads initial state from `AnalysisDetail.feedbackByMe`.
 *
 * NFR-01: 'use client' is required here (REQ-026 — feedback control).
 */

import { FeedbackThumbs as FeedbackThumbsPrimitive } from '@/components/ui/feedback-thumbs'
import { submitFeedback } from '../_actions/submit-feedback'
import type { AnalysisDetail } from '@/types/domain/analysis'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FeedbackThumbsProps {
  analysisId: string
  feedbackByMe: AnalysisDetail['feedbackByMe']
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function FeedbackThumbs({ analysisId, feedbackByMe }: FeedbackThumbsProps) {
  async function handleSubmit(
    rating: 'up' | 'down' | null,
    comment: string | null
  ): Promise<void> {
    await submitFeedback({ analysisId, rating, comment })
  }

  return (
    <FeedbackThumbsPrimitive
      initialRating={feedbackByMe.rating}
      initialComment={feedbackByMe.comment}
      onSubmit={handleSubmit}
    />
  )
}
