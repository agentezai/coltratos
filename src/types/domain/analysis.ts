/**
 * View types for the Resultado del análisis page (T11+).
 *
 * These types represent the aggregate read model returned by
 * `getAnalysisDetail`. They are distinct from the Zod-schema domain
 * types in `analisis.ts` / `requisito.ts` — those model the existing
 * extraction pipeline tables; these model the domain-model-mvp rev 3
 * table shapes that T11+ targets.
 *
 * Naming follows contratacion-publica.md conventions:
 * Spanish terms in identifiers (proceso, requisito, etc.)
 */

/** JSONB snapshot of the datos.gov.co Proceso metadata stored at analysis time. */
export interface ProcesoMetadataSnapshot {
  numero_proceso: string
  entidad: string
  objeto_a_contratar: string
  modalidad: string
  cuantia_proceso: number | null
  fecha_de_publicacion_del_proceso: string | null
  fecha_limite_de_recepcion: string | null
  secop_url: string | null
  [key: string]: unknown
}

/** One requisito + its verdict, as a denormalized view row. */
export interface RequisitoView {
  id: string
  tipo: 'juridico' | 'tecnico' | 'financiero'
  texto: string
  quoteFuente: string | null
  paginaFuente: number | null
  verdict: {
    value: 'verde' | 'amarillo' | 'rojo'
    reason: string
    confidence: number
  } | null
}

/** Aggregate returned by getAnalysisDetail. */
export interface AnalysisDetail {
  id: string
  procesoId: string
  pliegoUploadId: string
  overallVerdict: 'verde' | 'amarillo' | 'rojo' | null
  procesoLookupStatus: 'verified' | 'unverified' | 'failed'
  procesoMetadata: ProcesoMetadataSnapshot
  extractionStatus: 'pending' | 'extracting' | 'partial' | 'completed' | 'failed'
  extractionStage: string | null
  pagesFlagged: number
  flaggedPagesList: number[]
  costUsd: number | null
  latencyMs: number | null
  createdAt: string
  pliegoSha256: string
  pliegoStorageKey: string
  requisitos: RequisitoView[]
  feedbackByMe: { rating: 'up' | 'down' | null; comment: string | null }
}
