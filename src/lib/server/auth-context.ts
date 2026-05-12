/**
 * Server-side auth context helpers.
 *
 * auth.company_id() — resolves the empresa_id / company_id for the
 * currently-authenticated Supabase user. Queries `empresa_member`
 * to find the company this user belongs to.
 *
 * Returns null when:
 *  - The session is missing or expired.
 *  - No empresa_member row exists for the user.
 *
 * Usage in Server Components:
 *   const companyId = await auth.company_id()
 *   if (!companyId) redirect('/login')
 */

import { createServerClient } from '@/lib/supabase/server'

export const auth = {
  /**
   * Returns the company_id for the current Supabase session,
   * or null if the user is unauthenticated or has no empresa row.
   */
  async company_id(): Promise<string | null> {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    // The domain-model-mvp uses `empresa_member` (existing) with empresa_id.
    // The T11 new tables use `company_id` as the column name on `analyses`.
    // The signup trigger provisions empresa + empresa_member; empresa.id == company_id.
    const { data } = await supabase
      .from('empresa_member')
      .select('empresa_id')
      .eq('user_id', user.id)
      .single()

    return data?.empresa_id ?? null
  },
}
