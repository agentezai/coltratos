/**
 * T15: POST /api/analyses/[id]/pliego-url route — unit test
 * Contract: NFR-07 (RLS isolation), REQ-022 (signed URL)
 *
 * Behaviors tested:
 *  - Returns 404 when analysis is owned by a different company (RLS)
 *  - Returns 401 when session is missing
 *  - Returns { url } on success
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock dependencies ─────────────────────────────────────────────────────────

// Mock auth context
vi.mock('@/lib/server/auth-context', () => ({
  auth: {
    company_id: vi.fn(),
  },
}))

// Mock signed-URL helper
vi.mock('@/lib/server/signed-url', () => ({
  getPliegoSignedUrl: vi.fn(),
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/analyses/[id]/pliego-url (T15 — NFR-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when session is missing (no company_id)', async () => {
    const { auth } = await import('@/lib/server/auth-context')
    vi.mocked(auth.company_id).mockResolvedValue(null)

    const { POST } = await import(
      '../../app/api/analyses/[id]/pliego-url/route'
    )
    const req = new Request('http://localhost/api/analyses/ana-001/pliego-url', {
      method: 'POST',
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'ana-001' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when analysis is owned by another company (RLS)', async () => {
    const { auth } = await import('@/lib/server/auth-context')
    vi.mocked(auth.company_id).mockResolvedValue('company_b')

    const { getPliegoSignedUrl } = await import('@/lib/server/signed-url')
    // Simulate RLS: helper returns null (analysis owned by company_a, not company_b)
    vi.mocked(getPliegoSignedUrl).mockResolvedValue(null)

    const { POST } = await import(
      '../../app/api/analyses/[id]/pliego-url/route'
    )
    const req = new Request('http://localhost/api/analyses/ana-001/pliego-url', {
      method: 'POST',
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'ana-001' }) })
    expect(res.status).toBe(404)
  })

  it('returns { url } with 200 on success', async () => {
    const { auth } = await import('@/lib/server/auth-context')
    vi.mocked(auth.company_id).mockResolvedValue('company_a')

    const { getPliegoSignedUrl } = await import('@/lib/server/signed-url')
    vi.mocked(getPliegoSignedUrl).mockResolvedValue(
      'https://supabase.co/storage/v1/signed/pliego.pdf?token=abc'
    )

    const { POST } = await import(
      '../../app/api/analyses/[id]/pliego-url/route'
    )
    const req = new Request('http://localhost/api/analyses/ana-001/pliego-url', {
      method: 'POST',
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'ana-001' }) })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('url')
    expect(body.url).toContain('supabase.co')
  })
})
