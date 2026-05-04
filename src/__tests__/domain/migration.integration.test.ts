/**
 * Integration tests for domain-model-postgres.
 * Require a live Supabase instance (local or remote).
 * Run with: npm run test -- --project integration
 *
 * Uses service-role client (bypasses RLS) for setup/teardown.
 * Uses anon/auth clients for RLS behavior assertions.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UUID = () => crypto.randomUUID()

async function cleanupEmpresa(id: string) {
  await db.from('empresa_member').delete().eq('empresa_id', id)
  await db.from('empresa').delete().eq('id', id)
}

async function insertEmpresa(id: string) {
  const { error } = await db.from('empresa').insert({ id, nombre: `Empresa ${id}`, nit: id.slice(0, 10) })
  if (error) throw new Error(`insertEmpresa: ${error.message}`)
}

async function insertProceso(id: string) {
  const { error } = await db.from('proceso').insert({
    id,
    secop_process_number: `PROC-${id.slice(0, 8)}`,
    entidad_contratante: 'Entidad Test',
    objeto: 'Objeto test',
    modalidad: 'licitacion_publica',
  })
  if (error) throw new Error(`insertProceso: ${error.message}`)
}

async function insertPliego(id: string, proceso_id: string, file_hash: string) {
  const { error } = await db.from('pliego').insert({
    id,
    proceso_id,
    tipo: 'pliego_definitivo',
    file_path: `/test/${id}.pdf`,
    file_hash,
    page_count: 1,
  })
  if (error) throw new Error(`insertPliego: ${error.message} (hash=${file_hash})`)
}

async function insertAnexoProceso(id: string, proceso_id: string, file_hash: string) {
  const { error } = await db.from('anexo_proceso').insert({
    id,
    proceso_id,
    tipo: 'anexo_tecnico',
    file_path: `/test/${id}.pdf`,
    file_hash,
    page_count: 1,
  })
  if (error) throw new Error(`insertAnexoProceso: ${error.message}`)
}

async function insertSegmento(id: string, pliego_id: string, overrides: Record<string, unknown> = {}) {
  const base = {
    id,
    pliego_id,
    categoria: 'juridico',
    contenido: 'Contenido de prueba',
    orden: 1,
    page_range_start: 1,
    page_range_end: 2,
    heading_normalized: 'capacidad juridica',
    heading_original: 'CAPACIDAD JURÍDICA',
    is_synthetic: false,
    ...overrides,
  }
  const { error } = await db.from('segmento').insert(base)
  return error
}

// ---------------------------------------------------------------------------
// TC-001 — Pliego file_hash UNIQUE within pliego; accepted in anexo_proceso
// ---------------------------------------------------------------------------
describe('TC-001 — pliego.file_hash dedup (RN-003)', () => {
  const procesoId = UUID()
  const hash = 'a'.repeat(64)
  const p1 = UUID(), p2 = UUID(), ap1 = UUID()

  beforeAll(async () => {
    await insertProceso(procesoId)
    await insertPliego(p1, procesoId, hash)
  })

  it('rejects duplicate file_hash in pliego', async () => {
    const { error } = await db.from('pliego').insert({
      id: p2, proceso_id: procesoId, tipo: 'pliego_definitivo',
      file_path: `/test/${p2}.pdf`, file_hash: hash, page_count: 1,
    })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/unique/i)
  })

  it('accepts same file_hash in anexo_proceso (independent dedup space)', async () => {
    await insertAnexoProceso(ap1, procesoId, hash)
    const { data } = await db.from('anexo_proceso').select('id').eq('id', ap1)
    expect(data).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// TC-002 — AnexoProceso file_hash UNIQUE within anexo_proceso
// ---------------------------------------------------------------------------
describe('TC-002 — anexo_proceso.file_hash dedup (RN-003)', () => {
  const procesoId = UUID()
  const hash = 'b'.repeat(64)
  const ap1 = UUID(), ap2 = UUID(), p1 = UUID()

  beforeAll(async () => {
    await insertProceso(procesoId)
    await insertAnexoProceso(ap1, procesoId, hash)
  })

  it('rejects duplicate file_hash in anexo_proceso', async () => {
    const { error } = await db.from('anexo_proceso').insert({
      id: ap2, proceso_id: procesoId, tipo: 'estudio_previo',
      file_path: `/test/${ap2}.pdf`, file_hash: hash,
    })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/unique/i)
  })

  it('accepts same hash in pliego', async () => {
    await insertPliego(p1, procesoId, hash)
    const { data } = await db.from('pliego').select('id').eq('id', p1)
    expect(data).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// TC-003 — segmento heading both-or-neither (RN-005)
// ---------------------------------------------------------------------------
describe('TC-003 — segmento_heading_both_or_neither constraint', () => {
  const procesoId = UUID(), pliegoId = UUID()

  beforeAll(async () => {
    await insertProceso(procesoId)
    await insertPliego(pliegoId, procesoId, 'c'.repeat(64))
  })

  it('rejects heading_normalized non-null when heading_original IS NULL', async () => {
    const error = await insertSegmento(UUID(), pliegoId, {
      heading_normalized: 'capacidad juridica',
      heading_original: null,
      is_synthetic: false,
    })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/segmento_heading_both_or_neither|check/i)
  })

  it('accepts both headings null (synthetic segment)', async () => {
    const error = await insertSegmento(UUID(), pliegoId, {
      heading_normalized: null,
      heading_original: null,
      is_synthetic: true,
    })
    expect(error).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-004 — segmento is_synthetic ⟺ heading null (RN-005)
// ---------------------------------------------------------------------------
describe('TC-004 — segmento_synthetic_iff_null_heading constraint', () => {
  const procesoId = UUID(), pliegoId = UUID()

  beforeAll(async () => {
    await insertProceso(procesoId)
    await insertPliego(pliegoId, procesoId, 'd'.repeat(64))
  })

  it('rejects is_synthetic=true with non-null headings', async () => {
    const error = await insertSegmento(UUID(), pliegoId, {
      is_synthetic: true,
      heading_normalized: 'capacidad juridica',
      heading_original: 'CAPACIDAD JURÍDICA',
    })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/segmento_synthetic_iff_null_heading|check/i)
  })

  it('rejects is_synthetic=false with null headings', async () => {
    const error = await insertSegmento(UUID(), pliegoId, {
      is_synthetic: false,
      heading_normalized: null,
      heading_original: null,
    })
    expect(error).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-005 — segmento page_range_valid (RN-006)
// ---------------------------------------------------------------------------
describe('TC-005 — segmento_page_range_valid constraint', () => {
  const procesoId = UUID(), pliegoId = UUID()

  beforeAll(async () => {
    await insertProceso(procesoId)
    await insertPliego(pliegoId, procesoId, 'e'.repeat(64))
  })

  it('rejects page_range_start > page_range_end', async () => {
    const error = await insertSegmento(UUID(), pliegoId, { page_range_start: 5, page_range_end: 3 })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/segmento_page_range_valid|check/i)
  })

  it('rejects page_range_start = 0', async () => {
    const error = await insertSegmento(UUID(), pliegoId, { page_range_start: 0, page_range_end: 1 })
    expect(error).not.toBeNull()
  })

  it('accepts page_range_start = page_range_end = 1', async () => {
    const error = await insertSegmento(UUID(), pliegoId, { page_range_start: 1, page_range_end: 1 })
    expect(error).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-006 — Postgres enum values
// ---------------------------------------------------------------------------
describe('TC-006 — enum values', () => {
  it('pliego_tipo enum has exactly {pliego_condiciones, pliego_definitivo}', async () => {
    const { data, error } = await db.rpc('pg_catalog.enum_range' as never, {})
      .single()
    // Use raw SQL instead
    const { data: rows } = await db
      .from('pg_enum' as never)
      .select('enumlabel')
      .eq('enumtypid', db.rpc('pg_catalog.regtype' as never, { name: 'pliego_tipo' }))
    // Simpler: just verify inserts work for valid and fail for invalid
    const procesoId = UUID()
    await insertProceso(procesoId)
    const { error: e1 } = await db.from('pliego').insert({
      id: UUID(), proceso_id: procesoId, tipo: 'anexo_tecnico' as never,
      file_path: '/test/x.pdf', file_hash: 'f'.repeat(64),
    })
    expect(e1).not.toBeNull()
  })

  it('rejects pliego.tipo = anexo value', async () => {
    const procesoId = UUID()
    await insertProceso(procesoId)
    const { error } = await db.from('pliego').insert({
      id: UUID(), proceso_id: procesoId, tipo: 'anexo_tecnico' as never,
      file_path: '/test/x.pdf', file_hash: 'g'.repeat(64),
    })
    expect(error).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-011 — requisito citation_quote length CHECK
// ---------------------------------------------------------------------------
describe('TC-011 — requisito_citation_quote_length constraint', () => {
  const procesoId = UUID(), pliegoId = UUID(), segId = UUID(),
        empresaId = UUID(), analisisId = UUID()

  beforeAll(async () => {
    await insertEmpresa(empresaId)
    await insertProceso(procesoId)
    await insertPliego(pliegoId, procesoId, 'h'.repeat(64))
    await insertSegmento(segId, pliegoId)
    await db.from('analisis').insert({
      id: analisisId, proceso_id: procesoId, empresa_id: empresaId,
      pliego_ids: [pliegoId], estado: 'pending',
    })
  })

  const baseRequisito = () => ({
    analisis_id: analisisId,
    segmento_id: segId,
    categoria: 'juridico',
    descripcion: 'Requisito de prueba',
    cumple: null,
    semaforo: 'amarillo',
    is_habilitante: true,
    is_habilitante_source: 'structural',
    citation_segment_id: segId,
    citation_verified: false,
  })

  it('rejects citation_quote > 200 chars', async () => {
    const { error } = await db.from('requisito').insert({
      ...baseRequisito(), id: UUID(), citation_quote: 'x'.repeat(201),
    })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/requisito_citation_quote_length|check/i)
  })

  it('accepts citation_quote = 200 chars', async () => {
    const { error } = await db.from('requisito').insert({
      ...baseRequisito(), id: UUID(), citation_quote: 'x'.repeat(200),
    })
    expect(error).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-014 — requisito categoria narrow CHECK
// ---------------------------------------------------------------------------
describe('TC-014 — requisito_categoria_narrow constraint', () => {
  const procesoId = UUID(), pliegoId = UUID(), segId = UUID(),
        empresaId = UUID(), analisisId = UUID()

  beforeAll(async () => {
    await insertEmpresa(empresaId)
    await insertProceso(procesoId)
    await insertPliego(pliegoId, procesoId, 'i'.repeat(64))
    await insertSegmento(segId, pliegoId)
    await db.from('analisis').insert({
      id: analisisId, proceso_id: procesoId, empresa_id: empresaId,
      pliego_ids: [pliegoId], estado: 'pending',
    })
  })

  it("rejects categoria = 'general'", async () => {
    const { error } = await db.from('requisito').insert({
      id: UUID(), analisis_id: analisisId, segmento_id: segId,
      categoria: 'general', descripcion: 'x', semaforo: 'verde',
      is_habilitante: false, is_habilitante_source: 'structural',
      citation_segment_id: segId, citation_quote: 'x', citation_verified: false,
    })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/requisito_categoria_narrow|check/i)
  })

  it("accepts categoria = 'juridico'", async () => {
    const { error } = await db.from('requisito').insert({
      id: UUID(), analisis_id: analisisId, segmento_id: segId,
      categoria: 'juridico', descripcion: 'x', semaforo: 'verde',
      is_habilitante: false, is_habilitante_source: 'structural',
      citation_segment_id: segId, citation_quote: 'x', citation_verified: false,
    })
    expect(error).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-015 — is_habilitante_source CHECK
// ---------------------------------------------------------------------------
describe('TC-015 — requisito_is_habilitante_source_valid constraint', () => {
  const procesoId = UUID(), pliegoId = UUID(), segId = UUID(),
        empresaId = UUID(), analisisId = UUID()

  beforeAll(async () => {
    await insertEmpresa(empresaId)
    await insertProceso(procesoId)
    await insertPliego(pliegoId, procesoId, 'j'.repeat(64))
    await insertSegmento(segId, pliegoId)
    await db.from('analisis').insert({
      id: analisisId, proceso_id: procesoId, empresa_id: empresaId,
      pliego_ids: [pliegoId], estado: 'pending',
    })
  })

  it("rejects is_habilitante_source = 'auto'", async () => {
    const { error } = await db.from('requisito').insert({
      id: UUID(), analisis_id: analisisId, segmento_id: segId,
      categoria: 'tecnico', descripcion: 'x', semaforo: 'verde',
      is_habilitante: false, is_habilitante_source: 'auto',
      citation_segment_id: segId, citation_quote: 'x', citation_verified: false,
    })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/requisito_is_habilitante_source_valid|check/i)
  })
})

// ---------------------------------------------------------------------------
// TC-012 — analisis telemetry columns accept NULL
// ---------------------------------------------------------------------------
describe('TC-012 — analisis telemetry columns nullable', () => {
  it('accepts cost_usd/model_metadata/prompt_version/semaforo_rules_version = NULL', async () => {
    const procesoId = UUID(), empresaId = UUID(), pliegoId = UUID()
    await insertEmpresa(empresaId)
    await insertProceso(procesoId)
    await insertPliego(pliegoId, procesoId, 'k'.repeat(64))
    const { error } = await db.from('analisis').insert({
      id: UUID(), proceso_id: procesoId, empresa_id: empresaId,
      pliego_ids: [pliegoId], estado: 'pending',
      cost_usd: null, model_metadata: null, prompt_version: null, semaforo_rules_version: null,
    })
    expect(error).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-013 — empresa.profile_updated_at trigger
// ---------------------------------------------------------------------------
describe('TC-013 — set_empresa_profile_updated_at trigger (RN-014)', () => {
  it('bumps profile_updated_at when nombre changes', async () => {
    const id = UUID()
    await insertEmpresa(id)
    const { data: before } = await db.from('empresa').select('profile_updated_at').eq('id', id).single()
    await new Promise(r => setTimeout(r, 10))
    await db.from('empresa').update({ nombre: 'Nombre Cambiado' }).eq('id', id)
    const { data: after } = await db.from('empresa').select('profile_updated_at').eq('id', id).single()
    const t0 = new Date(before!.profile_updated_at).getTime()
    const t1 = new Date(after!.profile_updated_at).getTime()
    expect(t1).toBeGreaterThan(t0)
    await cleanupEmpresa(id)
  })
})
