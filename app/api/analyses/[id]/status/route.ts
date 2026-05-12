/**
 * GET /api/analyses/[id]/status
 *
 * T20 — REQ-028
 *
 * Returns real-time extraction progress for a single analysis row.
 * Scoped to the requesting company's session (RLS via company_id filter).
 *
 * Cache-Control: no-store — this is a polling signal; never cache.
 *
 * Responses:
 *  200  { extraction_status, extraction_stage, pages_flagged, updated_at }
 *  401  { error: string }  — no authenticated session / no company_id
 *  404  { error: string }  — analysis not found or belongs to another company
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/server/auth-context'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const companyId = await auth.company_id()
  if (!companyId) {
    return NextResponse.json(
      { error: 'Unauthorized — no active session' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { id: analysisId } = await params

  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('extraction_status, extraction_stage, pages_flagged, updated_at')
    .eq('id', analysisId)
    .eq('company_id', companyId)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Not found — analysis does not exist or access denied' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return NextResponse.json(
    {
      extraction_status: data.extraction_status,
      extraction_stage: data.extraction_stage,
      pages_flagged: data.pages_flagged,
      updated_at: data.updated_at,
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  )
}
