/**
 * getAnalysisDetail — RLS-scoped single-query read for Resultado del análisis.
 *
 * Spec: T11 (REQ-012, REQ-013, REQ-014, REQ-027, REQ-028, NFR-07)
 *
 * Joins:
 *   analyses (filtered by id + company_id for RLS)
 *     ↳ pliego_uploads (JOIN on pliego_upload_id)
 *     ↳ verdicts (LEFT JOIN on analysis_id)
 *         ↳ requisitos (JOIN on verdicts.requisito_id)
 *     ↳ analysis_feedback (LEFT JOIN, scoped to current user)
 *
 * Returns AnalysisDetail | null.
 * Returning null triggers notFound() in the page (NFR-07 contract).
 *
 * NFR-07: RLS on analyses.company_id is enforced by filtering the
 * Supabase PostgREST query with .eq('company_id', companyId).
 * When the session does not own the analysis, PostgREST returns
 * PGRST116 (no row found) → we return null.
 */

import { createServerClient } from '@/lib/supabase/server'
import type {
  AnalysisDetail,
  RequisitoView,
  ProcesoMetadataSnapshot,
} from '@/types/domain/analysis'

// ---------------------------------------------------------------------------
// Raw row shape as returned by PostgREST (before mapping to camelCase)
// ---------------------------------------------------------------------------

interface RawVerdict {
  value: 'verde' | 'amarillo' | 'rojo'
  reason: string
  confidence: number
  requisitos: {
    id: string
    tipo: 'juridico' | 'tecnico' | 'financiero'
    texto: string
    quote_fuente: string | null
    pagina_fuente: number | null
  } | null
}

interface RawFeedback {
  rating: 'up' | 'down'
  comment: string | null
}

interface RawAnalysisRow {
  id: string
  proceso_id: string
  pliego_upload_id: string
  overall_verdict: 'verde' | 'amarillo' | 'rojo' | null
  proceso_lookup_status: 'verified' | 'unverified' | 'failed'
  proceso_metadata_snapshot: ProcesoMetadataSnapshot
  extraction_status: 'pending' | 'extracting' | 'partial' | 'completed' | 'failed'
  extraction_stage: string | null
  pages_flagged: number
  flagged_pages_list: number[]
  cost_usd: number | null
  latency_ms: number | null
  created_at: string
  pliego_uploads: {
    file_sha256: string
    file_storage_key: string
  } | null
  verdicts: RawVerdict[]
  analysis_feedback: RawFeedback[]
}

// ---------------------------------------------------------------------------
// Supabase select string — single round-trip via PostgREST resource embedding
// ---------------------------------------------------------------------------

const ANALYSIS_SELECT = `
  id,
  proceso_id,
  pliego_upload_id,
  overall_verdict,
  proceso_lookup_status,
  proceso_metadata_snapshot,
  extraction_status,
  extraction_stage,
  pages_flagged,
  flagged_pages_list,
  cost_usd,
  latency_ms,
  created_at,
  pliego_uploads ( file_sha256, file_storage_key ),
  verdicts (
    value,
    reason,
    confidence,
    requisitos ( id, tipo, texto, quote_fuente, pagina_fuente )
  ),
  analysis_feedback ( rating, comment )
`.trim()

// ---------------------------------------------------------------------------
// Mapper — raw PostgREST row → AnalysisDetail
// ---------------------------------------------------------------------------

function mapToAnalysisDetail(row: RawAnalysisRow): AnalysisDetail {
  const requisitos: RequisitoView[] = row.verdicts
    .filter((v): v is RawVerdict & { requisitos: NonNullable<RawVerdict['requisitos']> } =>
      v.requisitos !== null
    )
    .map((v) => ({
      id: v.requisitos.id,
      tipo: v.requisitos.tipo,
      texto: v.requisitos.texto,
      quoteFuente: v.requisitos.quote_fuente,
      paginaFuente: v.requisitos.pagina_fuente,
      verdict: {
        value: v.value,
        reason: v.reason,
        confidence: v.confidence,
      },
    }))

  const fb = row.analysis_feedback[0] ?? null
  const feedbackByMe: AnalysisDetail['feedbackByMe'] = fb
    ? { rating: fb.rating, comment: fb.comment }
    : { rating: null, comment: null }

  return {
    id: row.id,
    procesoId: row.proceso_id,
    pliegoUploadId: row.pliego_upload_id,
    overallVerdict: row.overall_verdict,
    procesoLookupStatus: row.proceso_lookup_status,
    procesoMetadata: row.proceso_metadata_snapshot,
    extractionStatus: row.extraction_status,
    extractionStage: row.extraction_stage,
    pagesFlagged: row.pages_flagged,
    flaggedPagesList: row.flagged_pages_list ?? [],
    costUsd: row.cost_usd,
    latencyMs: row.latency_ms,
    createdAt: row.created_at,
    pliegoSha256: row.pliego_uploads?.file_sha256 ?? '',
    pliegoStorageKey: row.pliego_uploads?.file_storage_key ?? '',
    requisitos,
    feedbackByMe,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the full AnalysisDetail aggregate for the given analysis ID,
 * scoped to the given companyId for RLS enforcement.
 *
 * Returns null when:
 *  - The analysis does not exist.
 *  - The analysis exists but is owned by a different company (RLS).
 *  - The Supabase client returns any error (treated as not-found).
 */
export async function getAnalysisDetail(
  id: string,
  companyId: string
): Promise<AnalysisDetail | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('analyses')
    .select(ANALYSIS_SELECT)
    .eq('id', id)
    .eq('company_id', companyId)
    .single()

  if (error || !data) {
    return null
  }

  return mapToAnalysisDetail(data as unknown as RawAnalysisRow)
}
