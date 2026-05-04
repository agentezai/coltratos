// TC-005 negative: DocumentoSchema must NOT be a named export from @/types.
// The @ts-expect-error below is itself the test — if it ever becomes unused, the export was re-introduced.
// @ts-expect-error — DocumentoSchema is not exported from @/types (ADR-008: Pliego/AnexoProceso split)
import type { DocumentoSchema as _DocumentoSchemaGone } from '@/types'

import { describe, it, expect, expectTypeOf } from 'vitest'
import {
  ProcesoSchema,
  PliegoSchema,
  AnexoProcesoSchema,
  EmpresaSchema,
  SegmentoSchema,
  AnalisisSchema,
  RequisitoSchema,
  PromptCacheSchema,
} from '@/types'
import type {
  Proceso,
  Pliego,
  AnexoProceso,
  Empresa,
  Analisis,
  Requisito,
  Database,
  ModelMetadata,
  NewProceso,
  PliegoUpdate,
} from '@/types'

void (undefined as unknown as _DocumentoSchemaGone)

describe('Barrel exports — TC-005 (REQ-013)', () => {
  it('all 8 Zod schemas resolve and have a parse method', () => {
    expectTypeOf(ProcesoSchema.parse).toBeFunction()
    expectTypeOf(PliegoSchema.parse).toBeFunction()
    expectTypeOf(AnexoProcesoSchema.parse).toBeFunction()
    expectTypeOf(EmpresaSchema.parse).toBeFunction()
    expectTypeOf(SegmentoSchema.parse).toBeFunction()
    expectTypeOf(AnalisisSchema.parse).toBeFunction()
    expectTypeOf(RequisitoSchema.parse).toBeFunction()
    expectTypeOf(PromptCacheSchema.parse).toBeFunction()
  })

  it('entity TypeScript types resolve correctly', () => {
    expectTypeOf<Proceso>().toHaveProperty('secop_process_number')
    expectTypeOf<Pliego>().toHaveProperty('file_hash')
    expectTypeOf<AnexoProceso>().toHaveProperty('tipo')
    expectTypeOf<Empresa>().toHaveProperty('nit')
    expectTypeOf<Analisis>().toHaveProperty('estado')
    expectTypeOf<Requisito>().toHaveProperty('categoria')
  })

  it('Database and Kysely helper types resolve', () => {
    expectTypeOf<Database>().toHaveProperty('proceso')
    expectTypeOf<ModelMetadata>().toHaveProperty('model_name')
    expectTypeOf<NewProceso>().toHaveProperty('secop_process_number')
    expectTypeOf<PliegoUpdate>().toHaveProperty('tipo')
  })
})

describe('Barrel — legacy Documento export is absent (RN-012)', () => {
  it('@ts-expect-error at top of file guards against DocumentoSchema re-introduction', () => {
    // Verified at the top of this file via the @ts-expect-error import directive.
    // If DocumentoSchema is accidentally re-exported, that directive becomes "unused"
    // and tsc reports a TypeCheckError on this file.
    expect(true).toBe(true)
  })
})
