'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

export async function signup(
  email: string,
  password: string
): Promise<{ error?: string }> {
  const supabase = await createServerClient()
  const headersList = await headers()
  const origin = headersList.get('origin') ?? ''

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  })

  if (error) return { error: error.message }
  return {}
}

export async function login(
  email: string,
  password: string,
  redirectTo?: string
): Promise<{ error?: string }> {
  const supabase = await createServerClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect(redirectTo ?? '/dashboard')
}

export async function signOut(): Promise<void> {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function forgotPassword(email: string): Promise<void> {
  const supabase = await createServerClient()
  const headersList = await headers()
  const origin = headersList.get('origin') ?? ''

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?type=recovery`,
  })
  // Always returns void — error suppressed to prevent email enumeration (RN-010).
}

export async function updatePassword(
  password: string
): Promise<{ error?: string }> {
  const supabase = await createServerClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
