import { createServerClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL('/login?error=Missing+verification+parameters', origin)
    )
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, origin)
    )
  }

  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/reset-password', origin))
  }

  return NextResponse.redirect(new URL('/dashboard', origin))
}
