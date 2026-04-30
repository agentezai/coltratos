/**
 * Integration tests for auth-and-tenancy.
 * Requires a running local Supabase stack: npm run db:start
 *
 * TC-001: Signup trigger creates empresa + empresa_member (REQ-006, RN-007)
 * TC-007: RLS prevents cross-tenant SELECT on analisis (NFR-04)
 * TC-008: RLS prevents cross-tenant SELECT on requisito (NFR-04)
 * TC-009: /auth/confirm OTP verification establishes session (REQ-009, RN-009)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error(
    'Integration tests require SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Run `npm run db:start` and set env vars from `npm run db:status`.'
  )
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function anonClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function randomEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
}

const createdUserIds: string[] = []

async function createVerifiedUser(email: string, password: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error
  createdUserIds.push(data.user.id)
  return data.user
}

beforeAll(async () => {
  // Verify the local Supabase stack is reachable
  const { error } = await admin.from('empresa').select('id').limit(1)
  if (error?.message?.includes('ECONNREFUSED')) {
    throw new Error('Cannot reach Supabase — run `npm run db:start` first.')
  }
})

afterAll(async () => {
  // Clean up created users (cascade deletes empresa + empresa_member via FK)
  for (const id of createdUserIds) {
    await admin.auth.admin.deleteUser(id)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// TC-001: Signup trigger creates empresa + empresa_member
// ────────────────────────────────────────────────────────────────────────────

describe('TC-001 — signup trigger (REQ-006, RN-007)', () => {
  it('creates one empresa and one empresa_member(owner) on auth.users insert', async () => {
    const email = randomEmail()
    const user = await createVerifiedUser(email, 'password123!')

    const { data: members, error } = await admin
      .from('empresa_member')
      .select('empresa_id, role')
      .eq('user_id', user.id)

    expect(error).toBeNull()
    expect(members).toHaveLength(1)
    expect(members![0]!.role).toBe('owner')

    const { data: empresa } = await admin
      .from('empresa')
      .select('id')
      .eq('id', members![0]!.empresa_id)

    expect(empresa).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// TC-007: RLS prevents cross-tenant SELECT on analisis
// ────────────────────────────────────────────────────────────────────────────

describe('TC-007 — RLS cross-tenant isolation on analisis (NFR-04)', () => {
  it('empresa A cannot select analisis rows belonging to empresa B', async () => {
    const emailA = randomEmail()
    const emailB = randomEmail()
    const pw = 'password123!'

    await createVerifiedUser(emailA, pw)
    await createVerifiedUser(emailB, pw)

    // Get empresa_id for user B
    const clientB = anonClient()
    const { data: { session: sessionB } } = await clientB.auth.signInWithPassword({
      email: emailB, password: pw,
    })
    expect(sessionB).not.toBeNull()

    const { data: memberB } = await admin
      .from('empresa_member')
      .select('empresa_id')
      .eq('user_id', sessionB!.user.id)
      .single()

    // Insert an analisis row for empresa B using admin (bypasses RLS)
    await admin.from('analisis').insert({
      empresa_id: memberB!.empresa_id,
      proceso_lookup_status: 'unverified',
      verdict: 'amarillo',
    })

    // Now sign in as user A and try to read empresa B's analisis
    const clientA = anonClient()
    await clientA.auth.signInWithPassword({ email: emailA, password: pw })

    const { data: rows, error } = await clientA
      .from('analisis')
      .select('id')
      .eq('empresa_id', memberB!.empresa_id)

    expect(error).toBeNull()
    expect(rows).toHaveLength(0) // RLS must return empty, not an error
  })
})

// ────────────────────────────────────────────────────────────────────────────
// TC-008: RLS prevents cross-tenant SELECT on requisito
// ────────────────────────────────────────────────────────────────────────────

describe('TC-008 — RLS cross-tenant isolation on requisito (NFR-04)', () => {
  it('empresa A cannot select requisito rows belonging to empresa B analisis', async () => {
    const emailA = randomEmail()
    const emailB = randomEmail()
    const pw = 'password123!'

    await createVerifiedUser(emailA, pw)
    await createVerifiedUser(emailB, pw)

    const clientB = anonClient()
    await clientB.auth.signInWithPassword({ email: emailB, password: pw })

    const { data: memberB } = await admin
      .from('empresa_member')
      .select('empresa_id')
      .eq('user_id', (await clientB.auth.getUser()).data.user!.id)
      .single()

    // Insert analisis + requisito for empresa B via admin
    const { data: analisis } = await admin.from('analisis').insert({
      empresa_id: memberB!.empresa_id,
      proceso_lookup_status: 'unverified',
      verdict: 'verde',
    }).select('id').single()

    await admin.from('requisito').insert({
      analisis_id: analisis!.id,
      tipo: 'juridico',
      descripcion: 'Test requisito',
      semaforo: 'verde',
    })

    // Sign in as user A and try to read empresa B's requisito
    const clientA = anonClient()
    await clientA.auth.signInWithPassword({ email: emailA, password: pw })

    const { data: rows, error } = await clientA
      .from('requisito')
      .select('id')
      .eq('analisis_id', analisis!.id)

    expect(error).toBeNull()
    expect(rows).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// TC-009: /auth/confirm OTP → session is established (structural check)
// ────────────────────────────────────────────────────────────────────────────

describe('TC-009 — signInWithPassword returns a valid session (REQ-009 proxy)', () => {
  it('a verified user can sign in and gets a session with user.id (TC-009 structural)', async () => {
    const email = randomEmail()
    const pw = 'password123!'
    const user = await createVerifiedUser(email, pw)

    const client = anonClient()
    const { data, error } = await client.auth.signInWithPassword({ email, password: pw })

    expect(error).toBeNull()
    expect(data.session).not.toBeNull()
    expect(data.session!.user.id).toBe(user.id)
  })
})
