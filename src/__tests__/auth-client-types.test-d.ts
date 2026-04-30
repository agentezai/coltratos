import { describe, it, assertType } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('auth client types (REQ-001, REQ-002)', () => {
  it('createServerClient is a callable async factory', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    assertType<() => Promise<SupabaseClient>>(createServerClient)
  })

  it('createBrowserClient is a callable synchronous factory', async () => {
    const { createBrowserClient } = await import('@/lib/supabase/client')
    assertType<() => SupabaseClient>(createBrowserClient)
  })
})
