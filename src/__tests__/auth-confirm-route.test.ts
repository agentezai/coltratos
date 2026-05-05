import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockExchangeCodeForSession = vi.fn()
const mockVerifyOtp = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      verifyOtp: mockVerifyOtp,
    },
  }),
}))

// Import after mocks are registered (top-level await, ESM hoisting is handled by vi.mock)
const { GET } = await import('../../app/auth/confirm/route')

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/auth/confirm')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString())
}

function locationOf(res: Response): string {
  return res.headers.get('location') ?? ''
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /auth/confirm', () => {
  beforeEach(() => vi.clearAllMocks())

  // TC-001 ── PKCE happy path
  it('TC-001: PKCE code param — redirects to /dashboard on success', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })

    const res = await GET(makeRequest({ code: 'valid-pkce-code' }) as never)

    expect(mockExchangeCodeForSession).toHaveBeenCalledOnce()
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('valid-pkce-code')
    expect(mockVerifyOtp).not.toHaveBeenCalled()
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(locationOf(res)).toContain('/dashboard')
  })

  // TC-002 ── PKCE error path
  it('TC-002: PKCE code param — redirects to /login?error=<message> on exchangeCodeForSession failure', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: { message: 'invalid grant' } })

    const res = await GET(makeRequest({ code: 'bad-or-expired-code' }) as never)

    expect(mockExchangeCodeForSession).toHaveBeenCalledOnce()
    const location = locationOf(res)
    expect(location).toContain('/login')
    expect(location).toContain('error')
    expect(decodeURIComponent(location)).toContain('invalid grant')
  })

  // TC-003 ── OTP happy path (email)
  it('TC-003: OTP token_hash + type=email — redirects to /dashboard on success', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })

    const res = await GET(makeRequest({ token_hash: 'abc123', type: 'email' }) as never)

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
    expect(mockVerifyOtp).toHaveBeenCalledOnce()
    expect(mockVerifyOtp).toHaveBeenCalledWith({ token_hash: 'abc123', type: 'email' })
    expect(locationOf(res)).toContain('/dashboard')
  })

  // TC-004 ── OTP recovery path
  it('TC-004: OTP token_hash + type=recovery — redirects to /reset-password on success', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })

    const res = await GET(makeRequest({ token_hash: 'abc123', type: 'recovery' }) as never)

    expect(mockVerifyOtp).toHaveBeenCalledOnce()
    expect(mockVerifyOtp).toHaveBeenCalledWith({ token_hash: 'abc123', type: 'recovery' })
    expect(locationOf(res)).toContain('/reset-password')
  })

  // TC-005 ── OTP error path
  it('TC-005: OTP token_hash + type — redirects to /login?error=<message> on verifyOtp failure', async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: 'Token has expired' } })

    const res = await GET(makeRequest({ token_hash: 'bad-token', type: 'email' }) as never)

    expect(mockVerifyOtp).toHaveBeenCalledOnce()
    const location = locationOf(res)
    expect(location).toContain('/login')
    expect(location).toContain('error')
    expect(decodeURIComponent(location)).toContain('Token has expired')
  })

  // TC-006 ── Missing params (no code, no token_hash)
  it('TC-006: No params — redirects to /login?error=Missing+verification+parameters', async () => {
    const res = await GET(makeRequest() as never)

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
    expect(mockVerifyOtp).not.toHaveBeenCalled()
    const location = locationOf(res)
    expect(location).toContain('/login')
    // The route uses literal '+' as space separator (not %20); decode accordingly.
    expect(decodeURIComponent(location.replace(/\+/g, ' '))).toContain(
      'Missing verification parameters'
    )
  })

  // TC-006b ── Partial OTP params (token_hash without type) — also hits missing-params guard
  it('TC-006b: token_hash without type — redirects to /login?error=Missing+verification+parameters', async () => {
    const res = await GET(makeRequest({ token_hash: 'abc123' }) as never)

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
    expect(mockVerifyOtp).not.toHaveBeenCalled()
    const location = locationOf(res)
    expect(location).toContain('/login')
    // The route uses literal '+' as space separator (not %20); decode accordingly.
    expect(decodeURIComponent(location.replace(/\+/g, ' '))).toContain(
      'Missing verification parameters'
    )
  })
})
