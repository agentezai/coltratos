import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_PREFIXES = ['/dashboard', '/analisis', '/empresa']
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password']
const RATE_LIMITED_ROUTES = ['/login', '/signup']
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

// In-memory store: ip → { count, windowStart }
const rateLimitStore = new Map<string, { count: number; windowStart: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now })
    return false
  }

  entry.count += 1
  return entry.count > RATE_LIMIT_MAX
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (request.method === 'POST' && RATE_LIMITED_ROUTES.includes(pathname)) {
    const ip = (request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1').trim()
    if (isRateLimited(ip)) {
      return new NextResponse('Too many requests', { status: 429 })
    }
  }

  const { response, user } = await updateSession(request)

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthRoute = AUTH_ROUTES.includes(pathname)

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Guard /reset-password: requires a Supabase recovery session.
  // Without one, updatePassword silently fails — redirect early instead.
  if (pathname === '/reset-password' && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/forgot-password'
    return NextResponse.redirect(url)
  }

  return response
}

export default proxy

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
