/**
 * POST /api/analyses/[id]/pliego-url
 *
 * T15 — REQ-022, NFR-07
 *
 * Returns a 15-minute signed URL for the pliego file associated with the
 * analysis, scoped to the requesting company's session.
 *
 * MUST be POST (not GET) to:
 *  - Avoid URL caching by browsers or CDNs
 *  - Prevent signed URL leakage via Referer headers
 *
 * Responses:
 *  200  { url: string }   — signed URL successfully minted
 *  401  { error: ... }    — no authenticated session / no company_id
 *  404  { error: ... }    — analysis not found or belongs to another company
 *  500  { error: ... }    — storage error (signed URL could not be created)
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/server/auth-context'
import { getPliegoSignedUrl } from '@/lib/server/signed-url'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // Resolve company from session
  const companyId = await auth.company_id()
  if (!companyId) {
    return NextResponse.json(
      { error: 'Unauthorized — no active session' },
      { status: 401 }
    )
  }

  const { id: analysisId } = await params

  // Mint signed URL (RLS-scoped)
  const signedUrl = await getPliegoSignedUrl(analysisId, companyId)

  if (!signedUrl) {
    return NextResponse.json(
      { error: 'Not found — analysis does not exist or access denied' },
      { status: 404 }
    )
  }

  return NextResponse.json({ url: signedUrl }, { status: 200 })
}
