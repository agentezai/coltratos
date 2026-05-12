/**
 * T16: rerunAnalysis server action — unit tests (no live DB)
 *
 * Contract: RN-007 (original row never mutated), REQ-024 (re-run inserts new row),
 *           RN-006 (RLS — cross-company re-run throws NotFoundError, no insert)
 *
 * Behaviors tested:
 *  - Inserts a new analyses row with carried pliego_upload_id and proceso_id
 *  - Original row is never updated (RN-007)
 *  - Returns { id: newAnalysisId }
 *  - Throws NotFoundError when the analysis belongs to another company (RLS)
 *  - Throws ProfileMissingError when the company has no profile snapshot
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock createServerClient ────────────────────────────────────────────────────

const mockUpdateFn = vi.fn()

const supabaseMock = {
  from: vi.fn(),
  auth: { getUser: vi.fn() },
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => supabaseMock),
}))

// ── Mock auth.company_id ──────────────────────────────────────────────────────

vi.mock('@/lib/server/auth-context', () => ({
  auth: {
    company_id: vi.fn(),
  },
}))

// ── Import under test (dynamic, after mocks registered) ──────────────────────

const { rerunAnalysis } = await import(
  '../../app/dashboard/analisis/[id]/_actions/rerun-analysis'
)
const { auth } = await import('@/lib/server/auth-context')

// Error classes are in the shared errors file (not 'use server' module)
// Tests assert on thrown error .message which includes the class name

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ORIGINAL_ANALYSIS = {
  id: 'ana-001',
  proceso_id: 'proc-001',
  pliego_upload_id: 'plu-001',
  proceso_lookup_status: 'verified' as const,
  proceso_metadata_snapshot: {
    numero_proceso: 'LP-2024-001',
    entidad: 'INVIAS',
    objeto_a_contratar: 'Construcción vial',
    modalidad: 'licitacion_publica',
    cuantia_proceso: null,
    fecha_de_publicacion_del_proceso: null,
    fecha_limite_de_recepcion: null,
    secop_url: null,
  },
}

const COMPANY_PROFILE = {
  id: 'cmp-001',
  nombre: 'Empresa Test S.A.S',
  nit: '900123456-1',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Sets up the Supabase mock chain for the happy-path:
 *  1. analyses SELECT → finds original row (RLS pass)
 *  2. empresas SELECT → finds company profile
 *  3. analyses INSERT → returns new row id
 */
function setupHappyPath(newAnalysisId = 'ana-002') {
  vi.mocked(auth.company_id).mockResolvedValue('company_a')

  const updateChain = { eq: vi.fn().mockReturnThis() }
  mockUpdateFn.mockReturnValue(updateChain)

  supabaseMock.from.mockImplementation((table: string) => {
    if (table === 'analyses') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: ORIGINAL_ANALYSIS,
                error: null,
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: newAnalysisId },
              error: null,
            }),
          }),
        }),
        update: mockUpdateFn,
      }
    }
    if (table === 'empresas') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: COMPANY_PROFILE,
              error: null,
            }),
          }),
        }),
      }
    }
    return {}
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('rerunAnalysis — T16 (REQ-024, RN-007, RLS)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Happy path: new row inserted, original never mutated', () => {
    it('inserts a new analyses row and returns { id: newAnalysisId }', async () => {
      setupHappyPath('ana-002')

      const result = await rerunAnalysis('ana-001')

      expect(result).toEqual({ id: 'ana-002' })
    })

    it('never calls UPDATE on the analyses table (RN-007)', async () => {
      setupHappyPath('ana-002')

      await rerunAnalysis('ana-001')

      // update() must never have been called
      expect(mockUpdateFn).not.toHaveBeenCalled()
    })

    it('passes the original pliego_upload_id and proceso_id to the insert', async () => {
      vi.mocked(auth.company_id).mockResolvedValue('company_a')

      let capturedInsertPayload: Record<string, unknown> | null = null

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'analyses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: ORIGINAL_ANALYSIS,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
              capturedInsertPayload = payload
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'ana-002' },
                    error: null,
                  }),
                }),
              }
            }),
            update: mockUpdateFn,
          }
        }
        if (table === 'empresas') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: COMPANY_PROFILE,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      await rerunAnalysis('ana-001')

      expect(capturedInsertPayload).not.toBeNull()
      expect(capturedInsertPayload!['pliego_upload_id']).toBe('plu-001')
      expect(capturedInsertPayload!['proceso_id']).toBe('proc-001')
      expect(capturedInsertPayload!['company_id']).toBe('company_a')
      expect(capturedInsertPayload!['extraction_status']).toBe('pending')
    })
  })

  describe('RLS: cross-company re-run is rejected', () => {
    it('throws NotFoundError when analysis is owned by another company', async () => {
      vi.mocked(auth.company_id).mockResolvedValue('company_b')

      // Supabase returns null (RLS filtered out the row)
      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'analyses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116', message: 'No rows found' },
                  }),
                }),
              }),
            }),
            insert: vi.fn(),
            update: mockUpdateFn,
          }
        }
        return {}
      })

      await expect(rerunAnalysis('ana-001')).rejects.toThrow('NotFoundError')

      // Verify: update was never called on any table when lookup failed (RN-007)
      expect(mockUpdateFn).not.toHaveBeenCalled()
    })

    it('throws ProfileMissingError when company has no profile', async () => {
      vi.mocked(auth.company_id).mockResolvedValue('company_a')

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'analyses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: ORIGINAL_ANALYSIS,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: vi.fn(),
            update: mockUpdateFn,
          }
        }
        if (table === 'empresas') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116', message: 'No rows found' },
                }),
              }),
            }),
          }
        }
        return {}
      })

      await expect(rerunAnalysis('ana-001')).rejects.toThrow('ProfileMissingError')
    })
  })
})
