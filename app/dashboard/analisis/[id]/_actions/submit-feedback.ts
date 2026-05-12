'use server'

/**
 * T18: submitFeedback server action (REQ-026, NFR-07)
 *
 * Writes relevance feedback to `analysis_feedback`.
 * One row per (analysis_id, user_id); upserts allowed; delete on toggle-off.
 *
 * Input: { analysisId: string; rating: 'up' | 'down' | null; comment?: string }
 *
 * Behavior:
 *  - rating = null → DELETE the existing row (toggle-off)
 *  - Otherwise     → UPSERT on (analysis_id, user_id) with updated_at = now()
 *
 * RLS policies on analysis_feedback scope all writes — MUST NOT use service role.
 *
 * Throws NotFoundError when unauthenticated (company_id is null).
 */

import { createServerClient } from '@/lib/supabase/server'
import { auth } from '@/lib/server/auth-context'
import { NotFoundError } from '@/lib/errors/analysis-errors'

// ─────────────────────────────────────────────────────────────────────────────
// Input type
// ─────────────────────────────────────────────────────────────────────────────

export interface SubmitFeedbackInput {
  analysisId: string
  rating: 'up' | 'down' | null
  comment?: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Action
// ─────────────────────────────────────────────────────────────────────────────

export async function submitFeedback(input: SubmitFeedbackInput): Promise<void> {
  const companyId = await auth.company_id()
  if (!companyId) {
    throw new NotFoundError()
  }

  const supabase = await createServerClient()

  // Resolve user_id from the session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new NotFoundError()
  }

  const { analysisId, rating, comment } = input

  // ── Toggle-off: rating = null → DELETE ────────────────────────────────────
  if (rating === null) {
    const { error } = await supabase
      .from('analysis_feedback')
      .delete()
      .eq('analysis_id', analysisId)
      .eq('user_id', user.id)

    if (error) {
      throw new Error(`Failed to delete feedback: ${error.message}`)
    }
    return
  }

  // ── Upsert path: insert or update on (analysis_id, user_id) ──────────────
  const { error } = await supabase.from('analysis_feedback').upsert(
    {
      analysis_id: analysisId,
      user_id: user.id,
      rating,
      comment: comment ?? null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'analysis_id,user_id',
    }
  )

  if (error) {
    throw new Error(`Failed to upsert feedback: ${error.message}`)
  }
}
