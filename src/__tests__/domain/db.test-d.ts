import { describe, it, expectTypeOf } from 'vitest'
import type { Kysely, Selectable } from 'kysely'
import type {
  Database,
  ProcesoTable,
  ModelMetadata,
} from '../../types/db'

// Cast: null at runtime, fully typed for tsc.
// All db interactions are guarded by TYPECHECK_ONLY so they never execute at runtime.
const db = null as unknown as Kysely<Database>
const TYPECHECK_ONLY = false as boolean

describe('Kysely Database interface — TC-004 (REQ-012)', () => {
  it('Selectable<ProcesoTable>[] is the return type of selectAll', () => {
    if (TYPECHECK_ONLY) {
      void db.selectFrom('proceso').selectAll().execute().then(rows => {
        const _typed: Selectable<ProcesoTable>[] = rows
        void _typed
      })
    }
  })

  it('all 9 tables are addressable in the Database type', () => {
    if (TYPECHECK_ONLY) {
      void db.selectFrom('empresa')
      void db.selectFrom('empresa_member')
      void db.selectFrom('proceso')
      void db.selectFrom('pliego')
      void db.selectFrom('anexo_proceso')
      void db.selectFrom('segmento')
      void db.selectFrom('analisis')
      void db.selectFrom('requisito')
      void db.selectFrom('prompt_cache')
    }
  })
})

// Kysely removes ColumnType<S, never, never> fields from Insertable/Updateable entirely.
// The constraint is enforced by object-literal excess-property checking in Kysely's API.

describe('EmpresaTable.profile_updated_at — TC-010 Kysely-side (REQ-011, RN-014)', () => {
  it('forbids profile_updated_at on INSERT', () => {
    if (TYPECHECK_ONLY) {
      // @ts-expect-error — profile_updated_at is not in Insertable<EmpresaTable> (insert side: never)
      void db.insertInto('empresa').values({ profile_updated_at: new Date() })
    }
  })

  it('forbids profile_updated_at on UPDATE', () => {
    if (TYPECHECK_ONLY) {
      // @ts-expect-error — profile_updated_at is not in Updateable<EmpresaTable> (update side: never)
      void db.updateTable('empresa').set({ profile_updated_at: new Date() })
    }
  })
})

describe('RequisitoTable.categoria — TC-012 (REQ-008, RN-016)', () => {
  it('forbids categoria on UPDATE', () => {
    if (TYPECHECK_ONLY) {
      // @ts-expect-error — categoria is not in Updateable<RequisitoTable> (update side: never)
      void db.updateTable('requisito').set({ categoria: 'tecnico' })
    }
  })
})

describe('ModelMetadata interface (REQ-012)', () => {
  it('has implementation_id, model_name, prompt_version fields', () => {
    expectTypeOf<ModelMetadata>().toHaveProperty('implementation_id')
    expectTypeOf<ModelMetadata>().toHaveProperty('model_name')
    expectTypeOf<ModelMetadata>().toHaveProperty('prompt_version')
  })
})
