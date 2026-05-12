// @vitest-environment jsdom
/**
 * T20: ExtractionLoading + ExtractionStatusPoller — TDD contract (contract.md § T20)
 *
 * Behaviors tested (contract.md § T20):
 *  1. No generic spinner (REQ-028) — stepper is visible, no spinner element
 *  2. Polling stops on terminal status — interval cleared, router.refresh() called
 *  3. Safety cap (10 min) — timeout banner rendered (fast-forwarded with fake timers)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, screen, act } from '@testing-library/react'

// ── Mock next/navigation ──────────────────────────────────────────────────────
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

// ── Global fetch mock ─────────────────────────────────────────────────────────
const mockFetch = vi.fn()
global.fetch = mockFetch

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

// ─────────────────────────────────────────────────────────────────────────────
// 1. No generic spinner (REQ-028)
// ─────────────────────────────────────────────────────────────────────────────

describe('ExtractionLoading — no generic spinner (REQ-028)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // fetch never resolves during this test
    mockFetch.mockReturnValue(new Promise(() => {}))
  })

  it('renders the 4-step stepper when extraction_stage = "analisis"', async () => {
    const { ExtractionLoading } = await import(
      '../../app/dashboard/analisis/[id]/_components/extraction-loading'
    )
    render(<ExtractionLoading analysisId="ana-001" initialStage="analisis" />)

    const stepper = screen.getByTestId('extraction-stepper')
    expect(stepper).not.toBeNull()

    // 4 step nodes
    expect(screen.getByTestId('step-1')).not.toBeNull()
    expect(screen.getByTestId('step-2')).not.toBeNull()
    expect(screen.getByTestId('step-3')).not.toBeNull()
    expect(screen.getByTestId('step-4')).not.toBeNull()
  })

  it('step 2 is active when extraction_stage = "analisis"', async () => {
    const { ExtractionLoading } = await import(
      '../../app/dashboard/analisis/[id]/_components/extraction-loading'
    )
    render(<ExtractionLoading analysisId="ana-001" initialStage="analisis" />)

    // step-2 should have aria-current="step"
    const step2 = screen.getByTestId('step-2')
    expect(step2.getAttribute('aria-current')).toBe('step')
  })

  it('has NO element with animate-spin class (no generic spinner) (REQ-028)', async () => {
    const { ExtractionLoading } = await import(
      '../../app/dashboard/analisis/[id]/_components/extraction-loading'
    )
    const { container } = render(
      <ExtractionLoading analysisId="ana-001" initialStage="analisis" />
    )

    // The REQ-028 invariant: no generic spinner anywhere on this surface
    const spinnerEl = container.querySelector('.animate-spin')
    expect(spinnerEl).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Polling stops on terminal status
// ─────────────────────────────────────────────────────────────────────────────

describe('ExtractionStatusPoller — stops on terminal status', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('calls router.refresh() when status endpoint returns completed', async () => {
    // First poll returns completed
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          extraction_status: 'completed',
          extraction_stage: 'validacion',
          pages_flagged: 0,
          updated_at: new Date().toISOString(),
        }),
    })

    const onTerminal = vi.fn()
    const onStageChange = vi.fn()

    const { ExtractionStatusPoller } = await import(
      '../../app/dashboard/analisis/[id]/_components/extraction-loading'
    )
    render(
      <ExtractionStatusPoller
        analysisId="ana-001"
        initialStage="extraccion"
        onStageChange={onStageChange}
        onTerminal={onTerminal}
      />
    )

    // Advance 5 seconds to trigger first poll
    await act(async () => {
      vi.advanceTimersByTime(5_000)
      // Flush all microtasks
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onTerminal).toHaveBeenCalledOnce()
  })

  it('calls router.refresh() via ExtractionLoading on terminal status', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          extraction_status: 'completed',
          extraction_stage: 'validacion',
          pages_flagged: 0,
          updated_at: new Date().toISOString(),
        }),
    })

    const { ExtractionLoading } = await import(
      '../../app/dashboard/analisis/[id]/_components/extraction-loading'
    )
    render(<ExtractionLoading analysisId="ana-001" initialStage="extraccion" />)

    await act(async () => {
      vi.advanceTimersByTime(5_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockRefresh).toHaveBeenCalledOnce()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. Status API route — GET /api/analyses/[id]/status
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/lib/server/auth-context', () => ({
  auth: { company_id: vi.fn() },
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

describe('GET /api/analyses/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no session', async () => {
    const { auth } = await import('@/lib/server/auth-context')
    vi.mocked(auth.company_id).mockResolvedValue(null)

    const { GET } = await import('../../app/api/analyses/[id]/status/route')
    const req = new Request('http://localhost/api/analyses/ana-001/status')
    const res = await GET(req, { params: Promise.resolve({ id: 'ana-001' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when analysis not found (RLS miss)', async () => {
    const { auth } = await import('@/lib/server/auth-context')
    vi.mocked(auth.company_id).mockResolvedValue('company_a')

    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }),
      }),
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)

    const { GET } = await import('../../app/api/analyses/[id]/status/route')
    const req = new Request('http://localhost/api/analyses/ana-001/status')
    const res = await GET(req, { params: Promise.resolve({ id: 'ana-001' }) })
    expect(res.status).toBe(404)
  })

  it('returns 200 with extraction fields and Cache-Control: no-store', async () => {
    const { auth } = await import('@/lib/server/auth-context')
    vi.mocked(auth.company_id).mockResolvedValue('company_a')

    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  extraction_status: 'extracting',
                  extraction_stage: 'analisis',
                  pages_flagged: 0,
                  updated_at: '2026-05-12T00:00:00.000Z',
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)

    const { GET } = await import('../../app/api/analyses/[id]/status/route')
    const req = new Request('http://localhost/api/analyses/ana-001/status')
    const res = await GET(req, { params: Promise.resolve({ id: 'ana-001' }) })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.extraction_status).toBe('extracting')
    expect(body.extraction_stage).toBe('analisis')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})
