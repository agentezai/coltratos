import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockVerifyOtp = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: { verifyOtp: mockVerifyOtp },
  }),
}))

const { GET } = await import('../../app/auth/confirm/route')

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost:3000/auth/confirm')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url.toString())
}

describe('GET /auth/confirm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('redirects to /dashboard on valid email token (REQ-009, TC-004)', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })
    const req = makeRequest({ token_hash: 'valid-token', type: 'email' })
    const res = await GET(req as never)
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get('location')).toContain('/dashboard')
  })

  it('redirects to /reset-password on valid recovery token (REQ-009, RN-009)', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })
    const req = makeRequest({ token_hash: 'valid-token', type: 'recovery' })
    const res = await GET(req as never)
    expect(res.headers.get('location')).toContain('/reset-password')
  })

  it('redirects to /login with error on invalid token (REQ-009)', async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: 'Token has expired' } })
    const req = makeRequest({ token_hash: 'bad-token', type: 'email' })
    const res = await GET(req as never)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/login')
    expect(location).toContain('error')
  })

  it('redirects to /login when token_hash is missing', async () => {
    const req = makeRequest({ type: 'email' })
    const res = await GET(req as never)
    expect(res.headers.get('location')).toContain('/login')
  })
})
