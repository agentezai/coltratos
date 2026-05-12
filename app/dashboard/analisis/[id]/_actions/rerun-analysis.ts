'use server'

/**
 * T16: rerunAnalysis server action (REQ-024, RN-007, RLS)
 *
 * Inserts a new analyses row that carries the original pliego_upload_id and
 * proceso_id. The original row is NEVER mutated (RN-007).
 *
 * Returns { id: newAnalysisId }.
 *
 * Throws:
 *  - NotFoundError   — analysis not found or owned by another company (RLS)
 *  - ProfileMissingError — company has no empresa row (onboarding required)
 */

import { createServerClient } from '@/lib/supabase/server'
import { auth } from '@/lib/server/auth-context'
import { NotFoundError, ProfileMissingError } from '@/lib/errors/analysis-errors'

// ─────────────────────────────────────────────────────────────────────────────
// Action
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new analysis row from an existing one.
 *
 * Steps (per T16 plan):
 *  1. RLS-scoped lookup of the original analysis (SELECT filtered by company_id)
 *  2. If not found → throw NotFoundError
 *  3. Fetch current company profile snapshot for the authenticated company
 *  4. If profile missing → throw ProfileMissingError
 *  5. INSERT new analyses row: carries proceso_id + pliego_upload_id + refresh metadata
 *     (metadata refresh TTL logic deferred — carries existing snapshot for now)
 *  6. Return { id: newAnalysisId }
 *
 * Step 6 (enqueue extraction job) is a pipeline concern handled downstream.
 * The new row is inserted with extraction_status = 'pending', which the
 * existing extraction pipeline picks up.
 */
export async function rerunAnalysis(
  originalAnalysisId: string
): Promise<{ id: string }> {
  const companyId = await auth.company_id()
  if (!companyId) {
    throw new NotFoundError()
  }

  const supabase = await createServerClient()

  // ── Step 1: RLS-scoped lookup of original analysis ─────────────────────────
  const { data: original, error: lookupError } = await supabase
    .from('analyses')
    .select(
      'id, proceso_id, pliego_upload_id, proceso_lookup_status, proceso_metadata_snapshot'
    )
    .eq('id', originalAnalysisId)
    .eq('company_id', companyId)
    .single()

  if (lookupError || !original) {
    throw new NotFoundError()
  }

  // ── Step 3: Fetch company profile snapshot ────────────────────────────────
  const { data: empresa, error: profileError } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', companyId)
    .single()

  if (profileError || !empresa) {
    throw new ProfileMissingError()
  }

  // ── Step 5: INSERT new analyses row ───────────────────────────────────────
  // NOTE: The original row is NEVER read with .update() — RN-007 invariant.
  // Metadata refresh TTL (24h) is deferred to a follow-up enhancement (see T16 plan §4).
  // For now we carry the existing snapshot (safe — verdict reproducibility per database.md).
  const { data: newRow, error: insertError } = await supabase
    .from('analyses')
    .insert({
      proceso_id: original.proceso_id,
      pliego_upload_id: original.pliego_upload_id,
      company_id: companyId,
      company_profile_snapshot: empresa,
      proceso_metadata_snapshot: original.proceso_metadata_snapshot,
      proceso_lookup_status: original.proceso_lookup_status,
      extraction_status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !newRow) {
    throw new Error(`Failed to create new analysis: ${insertError?.message ?? 'unknown'}`)
  }

  return { id: newRow.id }
}
