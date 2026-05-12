/**
 * T11: getAnalysisDetail — RLS integration test
 *
 * Contract behavior (from contract.md T11):
 *   "Given an analysis row owned by company_a,
 *    when getAnalysisDetail(id, 'company_b') is called,
 *    then it returns null and no verdicts/pliego_uploads rows are leaked."
 *
 * Requires a running local Supabase stack with domain-model-mvp rev 3
 * migrations applied (tables: analyses, verdicts, requisitos, pliego_uploads).
 *
 * Run: npm run test:integration
 * Prerequisites: npm run db:start && npm run db:push
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

function randomEmail() {
  return `t11-rls-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
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

async function getCompanyId(userId: string): Promise<string> {
  const { data, error } = await admin
    .from('empresa_member')
    .select('empresa_id')
    .eq('user_id', userId)
    .single()
  if (error) throw new Error(`getCompanyId: ${error.message}`)
  return data!.empresa_id
}

beforeAll(async () => {
  const { error } = await admin.from('analyses').select('id').limit(1)
  if (error?.message?.includes('ECONNREFUSED')) {
    throw new Error('Cannot reach Supabase — run `npm run db:start` first.')
  }
  // If table doesn't exist yet (domain-model-mvp rev 3 not migrated), skip gracefully
  if (error?.message?.includes('relation "public.analyses" does not exist')) {
    throw new Error(
      'Table `analyses` not found — apply domain-model-mvp rev 3 migration first.'
    )
  }
})

afterAll(async () => {
  for (const id of createdUserIds) {
    await admin.auth.admin.deleteUser(id)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// TC-T11-RLS-001: Foreign company returns null from getAnalysisDetail
// ─────────────────────────────────────────────────────────────────────────────

describe('T11 — RLS isolation: getAnalysisDetail with foreign company_id (NFR-07)', () => {
  it('returns null for analysis owned by a different company', async () => {
    const emailA = randomEmail()
    const emailB = randomEmail()
    const pw = 'password123!'

    const userA = await createVerifiedUser(emailA, pw)
    await createVerifiedUser(emailB, pw)

    const companyA = await getCompanyId(userA.id)

    // Insert a minimal análisis row for company A via admin (bypasses RLS)
    const { data: analysisRow, error: insertError } = await admin
      .from('analyses')
      .insert({
        company_id: companyA,
        // Other required fields populated with test defaults
        proceso_id: `TEST-RLS-${Date.now()}`,
        pliego_upload_id: `plu-${Date.now()}`,
        overall_verdict: null,
        proceso_lookup_status: 'unverified',
        proceso_metadata_snapshot: {
          numero_proceso: 'TEST-001',
          entidad: 'Entidad Test',
          objeto_a_contratar: 'Objeto RLS test',
          modalidad: 'licitacion_publica',
          cuantia_proceso: null,
          fecha_de_publicacion_del_proceso: null,
          fecha_limite_de_recepcion: null,
          secop_url: null,
        },
        extraction_status: 'completed',
        extraction_stage: null,
        pages_flagged: 0,
        flagged_pages_list: [],
        cost_usd: null,
        latency_ms: null,
      })
      .select('id')
      .single()

    expect(insertError).toBeNull()
    const analysisId = analysisRow!.id

    // getAnalysisDetail with company_b's ID should return null
    // Dynamic import to avoid top-level binding issues
    const { getAnalysisDetail } = await import('../lib/queries/analysis-detail')
    const result = await getAnalysisDetail(analysisId, 'company-b-id-that-does-not-own-this')

    expect(result).toBeNull()

    // Cleanup
    await admin.from('analyses').delete().eq('id', analysisId)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// TC-T11-HAPPY-001: Single-query aggregate returns all requisitos
// ─────────────────────────────────────────────────────────────────────────────

describe('T11 — single-query happy path: returns all requisitos', () => {
  it('returns the full aggregate with requisitos and their verdicts', async () => {
    const email = randomEmail()
    const pw = 'password123!'

    const user = await createVerifiedUser(email, pw)
    const companyId = await getCompanyId(user.id)

    // Insert análisis + pliego_upload + requisitos + verdicts via admin
    const procesoId = `TEST-HAPPY-${Date.now()}`

    const { data: analysisRow, error: aErr } = await admin
      .from('analyses')
      .insert({
        company_id: companyId,
        proceso_id: procesoId,
        pliego_upload_id: `plu-happy-${Date.now()}`,
        overall_verdict: 'verde',
        proceso_lookup_status: 'verified',
        proceso_metadata_snapshot: {
          numero_proceso: 'LP-TEST-001',
          entidad: 'Entidad Happy Test',
          objeto_a_contratar: 'Suministro de equipos',
          modalidad: 'licitacion_publica',
          cuantia_proceso: 1000000,
          fecha_de_publicacion_del_proceso: '2026-01-01',
          fecha_limite_de_recepcion: '2026-06-01',
          secop_url: null,
        },
        extraction_status: 'completed',
        extraction_stage: null,
        pages_flagged: 0,
        flagged_pages_list: [],
        cost_usd: 0.03,
        latency_ms: 3500,
      })
      .select('id, pliego_upload_id')
      .single()

    expect(aErr).toBeNull()
    const analysisId = (analysisRow as { id: string; pliego_upload_id: string })!.id

    // Insert 2 requisitos
    const { data: req1 } = await admin
      .from('requisitos')
      .insert({
        pliego_upload_id: (analysisRow as { id: string; pliego_upload_id: string })!.pliego_upload_id,
        tipo: 'juridico',
        texto: 'RUP activo y vigente',
        quote_fuente: 'El proponente debe acreditar RUP vigente.',
        pagina_fuente: 12,
      })
      .select('id')
      .single()

    const { data: req2 } = await admin
      .from('requisitos')
      .insert({
        pliego_upload_id: (analysisRow as { id: string; pliego_upload_id: string })!.pliego_upload_id,
        tipo: 'financiero',
        texto: 'Indicador de liquidez >= 1.5',
        quote_fuente: null,
        pagina_fuente: null,
      })
      .select('id')
      .single()

    // Insert verdicts
    await admin.from('verdicts').insert([
      { analysis_id: analysisId, requisito_id: req1!.id, value: 'verde', reason: 'RUP activo', confidence: 0.95 },
      { analysis_id: analysisId, requisito_id: req2!.id, value: 'amarillo', reason: 'Falta cita', confidence: 0.6 },
    ])

    const { getAnalysisDetail } = await import('../lib/queries/analysis-detail')
    const result = await getAnalysisDetail(analysisId, companyId)

    expect(result).not.toBeNull()
    expect(result!.id).toBe(analysisId)
    expect(result!.overallVerdict).toBe('verde')
    expect(result!.requisitos).toHaveLength(2)

    const juridico = result!.requisitos.find(r => r.tipo === 'juridico')
    expect(juridico).toBeDefined()
    expect(juridico!.quoteFuente).toBe('El proponente debe acreditar RUP vigente.')
    expect(juridico!.verdict?.value).toBe('verde')

    // Cleanup
    await admin.from('verdicts').delete().eq('analysis_id', analysisId)
    await admin.from('requisitos').delete().in('id', [req1!.id, req2!.id])
    await admin.from('analyses').delete().eq('id', analysisId)
  })
})
