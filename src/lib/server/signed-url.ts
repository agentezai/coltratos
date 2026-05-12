/**
 * getPliegoSignedUrl — server-only helper (T15 — REQ-022, NFR-07)
 *
 * Mints a 15-minute signed URL for the pliego file associated with an analysis,
 * after verifying the analysis is owned by the requesting company (RLS).
 *
 * RLS enforcement:
 *  - Queries `analyses` filtered by BOTH `id` and `company_id`.
 *  - If the analysis is not found or belongs to a different company, returns null.
 *  - Only then calls storage to create a signed URL.
 *
 * Returns:
 *  - The signed URL string on success.
 *  - null when the analysis is not found, belongs to another company, or storage fails.
 */

import { createServerClient } from '@/lib/supabase/server'

const SIGNED_URL_EXPIRY_SECONDS = 15 * 60 // 15 minutes

/**
 * Mint a signed URL for the pliego file belonging to `analysisId`,
 * scoped to `companyId` for RLS enforcement.
 */
export async function getPliegoSignedUrl(
  analysisId: string,
  companyId: string
): Promise<string | null> {
  const supabase = await createServerClient()

  // Step 1: RLS-scoped lookup — fetch pliego storage key
  const { data: analysis, error } = await supabase
    .from('analyses')
    .select('pliego_uploads ( file_storage_key )')
    .eq('id', analysisId)
    .eq('company_id', companyId)
    .single()

  if (error || !analysis) {
    // Not found or access denied (RLS)
    return null
  }

  // PostgREST returns embedded objects; handle both array and single shapes
  const uploads = analysis.pliego_uploads as
    | { file_storage_key: string }
    | { file_storage_key: string }[]
    | null

  let storageKey: string | null = null
  if (Array.isArray(uploads)) {
    storageKey = uploads[0]?.file_storage_key ?? null
  } else if (uploads && typeof uploads === 'object') {
    storageKey = uploads.file_storage_key ?? null
  }

  if (!storageKey) {
    return null
  }

  // Step 2: Mint signed URL via Supabase storage
  // Bucket name convention: pliegos (per storage policy spec)
  const { data: signedData, error: signedError } = await supabase.storage
    .from('pliegos')
    .createSignedUrl(storageKey, SIGNED_URL_EXPIRY_SECONDS)

  if (signedError || !signedData?.signedUrl) {
    return null
  }

  return signedData.signedUrl
}
