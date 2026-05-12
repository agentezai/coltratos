/**
 * T11: getAnalysisDetail — unit tests (no live DB)
 *
 * Tests the RLS-isolation behavior and the shape returned by
 * getAnalysisDetail using a Supabase client mock.
 *
 * NFR-07: All Resultado del análisis queries enforce RLS on analyses.company_id.
 * Contract behavior: "Given an analysis owned by company_a, when
 * getAnalysisDetail(id, 'company_b') is called, it returns null."
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AnalysisDetail } from '../../src/types/domain/analysis'

// ---------------------------------------------------------------------------
// Mock the Supabase server client
// ---------------------------------------------------------------------------

const mockSingle = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()

const supabaseMock = {
  from: vi.fn(() => ({
    select: mockSelect,
  })),
  auth: {
    getUser: vi.fn(),
  },
}

vi.mock('../../src/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => supabaseMock),
}))

// ---------------------------------------------------------------------------
// Import the function under test (dynamic so mock is registered first)
// ---------------------------------------------------------------------------

const { getAnalysisDetail } = await import('../../src/lib/queries/analysis-detail')

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function buildDetail(overrides: Partial<AnalysisDetail> = {}): AnalysisDetail {
  return {
    id: 'ana-123',
    procesoId: 'proc-456',
    pliegoUploadId: 'plu-789',
    overallVerdict: 'verde',
    procesoLookupStatus: 'verified',
    procesoMetadata: {
      numero_proceso: 'LP-2024-00123',
      entidad: 'Alcaldía de Medellín',
      objeto_a_contratar: 'Suministro de equipos',
      modalidad: 'licitacion_publica',
      cuantia_proceso: 2450000000,
      fecha_de_publicacion_del_proceso: '2024-01-15',
      fecha_limite_de_recepcion: '2026-05-15',
      secop_url: 'https://secop.gov.co/...',
    },
    extractionStatus: 'completed',
    extractionStage: null,
    pagesFlagged: 0,
    flaggedPagesList: [],
    costUsd: 0.03,
    latencyMs: 4500,
    createdAt: '2026-04-28T10:34:00Z',
    pliegoSha256: 'abc123',
    pliegoStorageKey: 'companies/comp-1/pliegos/abc123.pdf',
    requisitos: [
      {
        id: 'req-001',
        tipo: 'juridico',
        texto: 'RUP activo y vigente',
        quoteFuente: 'El proponente debe acreditar RUP vigente.',
        paginaFuente: 12,
        verdict: { value: 'verde', reason: 'RUP activo', confidence: 0.95 },
      },
    ],
    feedbackByMe: { rating: null, comment: null },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getAnalysisDetail — RLS isolation (NFR-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when the analysis is not found (wrong company_id)', async () => {
    // Supabase returns empty result when RLS filters the row out
    const chainMock = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Row not found' } }),
    }
    supabaseMock.from.mockReturnValue({ select: vi.fn().mockReturnValue(chainMock) })

    const result = await getAnalysisDetail('ana-123', 'company_b')
    expect(result).toBeNull()
  })

  it('returns AnalysisDetail when analysis belongs to the correct company_id', async () => {
    const rawRow = {
      id: 'ana-123',
      proceso_id: 'proc-456',
      pliego_upload_id: 'plu-789',
      overall_verdict: 'verde',
      proceso_lookup_status: 'verified',
      proceso_metadata_snapshot: {
        numero_proceso: 'LP-2024-00123',
        entidad: 'Alcaldía de Medellín',
        objeto_a_contratar: 'Suministro de equipos',
        modalidad: 'licitacion_publica',
        cuantia_proceso: 2450000000,
        fecha_de_publicacion_del_proceso: '2024-01-15',
        fecha_limite_de_recepcion: '2026-05-15',
        secop_url: null,
      },
      extraction_status: 'completed',
      extraction_stage: null,
      pages_flagged: 0,
      flagged_pages_list: [],
      cost_usd: 0.03,
      latency_ms: 4500,
      created_at: '2026-04-28T10:34:00Z',
      pliego_uploads: {
        file_sha256: 'abc123',
        file_storage_key: 'companies/comp-1/pliegos/abc123.pdf',
      },
      verdicts: [
        {
          value: 'verde',
          reason: 'RUP activo',
          confidence: 0.95,
          requisitos: {
            id: 'req-001',
            tipo: 'juridico',
            texto: 'RUP activo y vigente',
            quote_fuente: 'El proponente debe acreditar RUP vigente.',
            pagina_fuente: 12,
          },
        },
      ],
      analysis_feedback: [],
    }

    const chainMock = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: rawRow, error: null }),
    }
    supabaseMock.from.mockReturnValue({ select: vi.fn().mockReturnValue(chainMock) })

    const result = await getAnalysisDetail('ana-123', 'company_a')

    expect(result).not.toBeNull()
    expect(result!.id).toBe('ana-123')
    expect(result!.procesoId).toBe('proc-456')
    expect(result!.overallVerdict).toBe('verde')
    expect(result!.procesoLookupStatus).toBe('verified')
    expect(result!.extractionStatus).toBe('completed')
    expect(result!.requisitos).toHaveLength(1)
    expect(result!.requisitos[0]!.tipo).toBe('juridico')
    expect(result!.requisitos[0]!.quoteFuente).toBe('El proponente debe acreditar RUP vigente.')
    expect(result!.requisitos[0]!.verdict?.value).toBe('verde')
    expect(result!.feedbackByMe).toEqual({ rating: null, comment: null })
  })

  it('returns feedbackByMe.rating when feedback exists', async () => {
    const rawRow = {
      id: 'ana-123',
      proceso_id: 'proc-456',
      pliego_upload_id: 'plu-789',
      overall_verdict: 'amarillo',
      proceso_lookup_status: 'verified',
      proceso_metadata_snapshot: {
        numero_proceso: 'LP-2024-00123',
        entidad: 'Alcaldía',
        objeto_a_contratar: 'Objeto',
        modalidad: 'licitacion_publica',
        cuantia_proceso: null,
        fecha_de_publicacion_del_proceso: null,
        fecha_limite_de_recepcion: null,
        secop_url: null,
      },
      extraction_status: 'completed',
      extraction_stage: null,
      pages_flagged: 0,
      flagged_pages_list: [],
      cost_usd: null,
      latency_ms: null,
      created_at: '2026-04-28T10:34:00Z',
      pliego_uploads: { file_sha256: 'abc', file_storage_key: 'companies/comp/pliegos/abc.pdf' },
      verdicts: [],
      analysis_feedback: [{ rating: 'up', comment: 'muy útil' }],
    }

    const chainMock = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: rawRow, error: null }),
    }
    supabaseMock.from.mockReturnValue({ select: vi.fn().mockReturnValue(chainMock) })

    const result = await getAnalysisDetail('ana-123', 'company_a')

    expect(result).not.toBeNull()
    expect(result!.feedbackByMe).toEqual({ rating: 'up', comment: 'muy útil' })
  })
})

describe('getAnalysisDetail — data mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps flagged_pages_list from raw row', async () => {
    const rawRow = {
      id: 'ana-999',
      proceso_id: 'proc-111',
      pliego_upload_id: 'plu-222',
      overall_verdict: 'rojo',
      proceso_lookup_status: 'unverified',
      proceso_metadata_snapshot: {
        numero_proceso: 'SA-2024-00099',
        entidad: 'INVIAS',
        objeto_a_contratar: 'Construcción vial',
        modalidad: 'seleccion_abreviada',
        cuantia_proceso: null,
        fecha_de_publicacion_del_proceso: null,
        fecha_limite_de_recepcion: null,
        secop_url: null,
      },
      extraction_status: 'partial',
      extraction_stage: null,
      pages_flagged: 3,
      flagged_pages_list: [5, 10, 14],
      cost_usd: 0.02,
      latency_ms: 3200,
      created_at: '2026-04-27T09:00:00Z',
      pliego_uploads: {
        file_sha256: 'def456',
        file_storage_key: 'companies/comp-2/pliegos/def456.pdf',
      },
      verdicts: [],
      analysis_feedback: [],
    }

    const chainMock = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: rawRow, error: null }),
    }
    supabaseMock.from.mockReturnValue({ select: vi.fn().mockReturnValue(chainMock) })

    const result = await getAnalysisDetail('ana-999', 'company_a')

    expect(result).not.toBeNull()
    expect(result!.pagesFlagged).toBe(3)
    expect(result!.flaggedPagesList).toEqual([5, 10, 14])
    expect(result!.extractionStatus).toBe('partial')
    expect(result!.procesoLookupStatus).toBe('unverified')
  })
})
