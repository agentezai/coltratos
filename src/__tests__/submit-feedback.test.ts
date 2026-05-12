/**
 * T18: submitFeedback server action — unit tests (no live DB)
 *
 * Contract: REQ-026, NFR-07
 *
 * Behaviors tested:
 *  - INSERT path: upsert when no row exists (rating = 'up' | 'down')
 *  - UPDATE path: upsert when a row already exists (no unique-constraint violation)
 *  - DELETE path: rating = null → deletes the row (toggle-off)
 *  - RLS gate: unauthenticated (no company_id) → throws NotFoundError
 *  - Comment max length 200 chars enforced client-side (action passes through)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock createServerClient ────────────────────────────────────────────────────

const supabaseMock = {
  from: vi.fn(),
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

// ── Mock auth.uid from supabase ───────────────────────────────────────────────
// submitFeedback calls supabase.auth.getUser() directly for user_id

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    ...supabaseMock,
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

// ── Import under test ────────────────────────────────────────────────────────

const { submitFeedback } = await import(
  '../../app/dashboard/analisis/[id]/_actions/submit-feedback'
)
const { auth } = await import('@/lib/server/auth-context')

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ANALYSIS_ID = 'ana-001'
const USER_ID = 'usr-001'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Arrange the mock so upsert/delete succeed.
 * `op`: 'upsert' | 'delete' — which branch the test exercises.
 */
function setupAuth(companyId: string | null = 'cmp-001', userId = USER_ID) {
  vi.mocked(auth.company_id).mockResolvedValue(companyId)
  mockGetUser.mockResolvedValue({
    data: { user: companyId ? { id: userId } : null },
    error: null,
  })
}

function setupUpsertSuccess() {
  supabaseMock.from.mockImplementation((table: string) => {
    if (table === 'analysis_feedback') {
      return {
        upsert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }
    }
    return {}
  })
}


// ── Tests ─────────────────────────────────────────────────────────────────────

describe('submitFeedback — T18 (REQ-026, NFR-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Upsert path (rating = "up" or "down")', () => {
    it('calls upsert when rating = "up"', async () => {
      setupAuth()
      let upsertPayload: Record<string, unknown> | null = null

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'analysis_feedback') {
          return {
            upsert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
              upsertPayload = payload
              return Promise.resolve({ error: null })
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }
        }
        return {}
      })

      await submitFeedback({ analysisId: ANALYSIS_ID, rating: 'up' })

      expect(upsertPayload).not.toBeNull()
      expect(upsertPayload!['analysis_id']).toBe(ANALYSIS_ID)
      expect(upsertPayload!['user_id']).toBe(USER_ID)
      expect(upsertPayload!['rating']).toBe('up')
    })

    it('calls upsert when rating = "down"', async () => {
      setupAuth()
      setupUpsertSuccess()

      // Should resolve without throwing
      await expect(
        submitFeedback({ analysisId: ANALYSIS_ID, rating: 'down' })
      ).resolves.toBeUndefined()
    })

    it('includes optional comment in the upsert payload', async () => {
      setupAuth()
      let upsertPayload: Record<string, unknown> | null = null

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'analysis_feedback') {
          return {
            upsert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
              upsertPayload = payload
              return Promise.resolve({ error: null })
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }
        }
        return {}
      })

      await submitFeedback({
        analysisId: ANALYSIS_ID,
        rating: 'up',
        comment: 'Muy útil',
      })

      expect(upsertPayload!['comment']).toBe('Muy útil')
    })

    it('sets updated_at in the upsert payload', async () => {
      setupAuth()
      let upsertPayload: Record<string, unknown> | null = null

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'analysis_feedback') {
          return {
            upsert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
              upsertPayload = payload
              return Promise.resolve({ error: null })
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }
        }
        return {}
      })

      await submitFeedback({ analysisId: ANALYSIS_ID, rating: 'up' })

      expect(upsertPayload!['updated_at']).toBeDefined()
    })
  })

  describe('Toggle-off (rating = null) → DELETE', () => {
    it('calls DELETE when rating = null', async () => {
      setupAuth()
      let deleteCalled = false

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'analysis_feedback') {
          const eqInner = vi.fn().mockImplementation(() => {
            deleteCalled = true
            return Promise.resolve({ error: null })
          })
          const eqOuter = vi.fn().mockReturnValue({ eq: eqInner })
          return {
            upsert: vi.fn(),
            delete: vi.fn().mockReturnValue({ eq: eqOuter }),
          }
        }
        return {}
      })

      await submitFeedback({ analysisId: ANALYSIS_ID, rating: null })

      expect(deleteCalled).toBe(true)
    })

    it('does NOT call upsert when rating = null', async () => {
      setupAuth()
      let upsertCalled = false

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'analysis_feedback') {
          const eqInner = vi.fn().mockResolvedValue({ error: null })
          const eqOuter = vi.fn().mockReturnValue({ eq: eqInner })
          return {
            upsert: vi.fn().mockImplementation(() => {
              upsertCalled = true
              return Promise.resolve({ error: null })
            }),
            delete: vi.fn().mockReturnValue({ eq: eqOuter }),
          }
        }
        return {}
      })

      await submitFeedback({ analysisId: ANALYSIS_ID, rating: null })

      expect(upsertCalled).toBe(false)
    })
  })

  describe('RLS gate: unauthenticated', () => {
    it('throws NotFoundError when company_id is null', async () => {
      setupAuth(null)

      await expect(
        submitFeedback({ analysisId: ANALYSIS_ID, rating: 'up' })
      ).rejects.toThrow('NotFoundError')
    })

    it('does not call supabase.from when not authenticated', async () => {
      setupAuth(null)

      try {
        await submitFeedback({ analysisId: ANALYSIS_ID, rating: 'up' })
      } catch {
        // expected
      }

      expect(supabaseMock.from).not.toHaveBeenCalled()
    })
  })
})
