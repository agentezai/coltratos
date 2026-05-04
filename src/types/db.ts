import type { ColumnType, Insertable, Updateable } from 'kysely'
import type {
  EmpresaId,
  EmpresaMemberRole,
  ProcesoId,
  PliegoId,
  PliegoTipo,
  AnexoProcesoId,
  AnexoProcesoTipo,
  SegmentoId,
  SegmentoCategoria,
  AnalisisId,
  AnalisisEstado,
  SemaforoColor,
  RequisitoId,
  RequisitoCategoria,
  IsHabilitanteSource,
  PromptCacheId,
  ModalidadContratacion,
} from './domain/primitives'

// Canonical shape of the model_metadata JSONB column.
// Re-exported via @/types barrel. Downstream code MUST import from @/types, not redeclare.
export interface ModelMetadata {
  implementation_id: string
  model_name: string
  prompt_version: string
}

export interface EmpresaTable {
  id: EmpresaId
  nombre: string
  nit: string
  // Trigger-owned: set_empresa_profile_updated_at(). ColumnType<select, insert, update>.
  // Readable; INSERT and UPDATE are forbidden at the type layer (RN-014).
  profile_updated_at: ColumnType<Date, never, never>
  created_at: Date
  updated_at: Date
}
export type NewEmpresa    = Insertable<EmpresaTable>
export type EmpresaUpdate = Updateable<EmpresaTable>

export interface EmpresaMemberTable {
  id: string
  empresa_id: EmpresaId
  user_id: string
  role: EmpresaMemberRole
  created_at: Date
}
export type NewEmpresaMember    = Insertable<EmpresaMemberTable>
export type EmpresaMemberUpdate = Updateable<EmpresaMemberTable>

export interface ProcesoTable {
  id: ProcesoId
  secop_process_number: string
  entidad_contratante: string
  objeto: string
  modalidad: ModalidadContratacion
  valor_estimado: number | null
  cronograma: Record<string, unknown> | null
  created_at: Date
}
export type NewProceso    = Insertable<ProcesoTable>
export type ProcesoUpdate = Updateable<ProcesoTable>

export interface PliegoTable {
  id: PliegoId
  proceso_id: ProcesoId
  tipo: PliegoTipo
  file_path: string
  file_hash: string
  uploaded_by_empresa_id: EmpresaId | null
  page_count: number | null
  deleted_at: Date | null
  created_at: Date
}
export type NewPliego    = Insertable<PliegoTable>
export type PliegoUpdate = Updateable<PliegoTable>

export interface AnexoProcesoTable {
  id: AnexoProcesoId
  proceso_id: ProcesoId
  tipo: AnexoProcesoTipo
  file_path: string
  file_hash: string
  uploaded_by_empresa_id: EmpresaId | null
  page_count: number | null
  deleted_at: Date | null
  created_at: Date
}
export type NewAnexoProceso    = Insertable<AnexoProcesoTable>
export type AnexoProcesoUpdate = Updateable<AnexoProcesoTable>

export interface SegmentoTable {
  id: SegmentoId
  pliego_id: PliegoId
  categoria: SegmentoCategoria
  contenido: string
  orden: number
  page_range_start: number
  page_range_end: number
  heading_normalized: string | null
  heading_original: string | null
  // Optional on insert (DB default false); mutable on update.
  is_synthetic: ColumnType<boolean, boolean | undefined, boolean>
  created_at: Date
}
export type NewSegmento    = Insertable<SegmentoTable>
export type SegmentoUpdate = Updateable<SegmentoTable>

export interface AnalisisTable {
  id: AnalisisId
  proceso_id: ProcesoId
  empresa_id: EmpresaId
  pliego_ids: ColumnType<string[], string[], string[]>
  estado: AnalisisEstado
  semaforo: SemaforoColor | null
  error_message: string | null
  cost_usd: number | null
  model_metadata: ModelMetadata | null
  prompt_version: string | null
  semaforo_rules_version: string | null
  created_at: Date
  updated_at: Date
  completed_at: Date | null
}
export type NewAnalisis    = Insertable<AnalisisTable>
export type AnalisisUpdate = Updateable<AnalisisTable>

export interface RequisitoTable {
  id: RequisitoId
  analisis_id: AnalisisId
  segmento_id: SegmentoId
  // Immutable post-INSERT (RN-016). ColumnType<select, insert, update> = <R, R, never>.
  // Recategorization must go through orchestrator-level cache invalidation + re-extraction.
  categoria: ColumnType<RequisitoCategoria, RequisitoCategoria, never>
  descripcion: string
  cumple: boolean | null
  semaforo: SemaforoColor
  justificacion: string | null
  is_habilitante: boolean
  is_habilitante_source: IsHabilitanteSource
  citation_segment_id: SegmentoId
  citation_quote: string
  citation_verified: ColumnType<boolean, boolean | undefined, boolean>
  created_at: Date
}
export type NewRequisito    = Insertable<RequisitoTable>
export type RequisitoUpdate = Updateable<RequisitoTable>

export interface PromptCacheTable {
  id: PromptCacheId
  pliego_id: PliegoId
  empresa_id: EmpresaId
  hash: string
  prompt_tokens: number
  cached_at: Date
  expires_at: Date
}
export type NewPromptCache    = Insertable<PromptCacheTable>
export type PromptCacheUpdate = Updateable<PromptCacheTable>

export interface Database {
  empresa: EmpresaTable
  empresa_member: EmpresaMemberTable
  proceso: ProcesoTable
  pliego: PliegoTable
  anexo_proceso: AnexoProcesoTable
  segmento: SegmentoTable
  analisis: AnalisisTable
  requisito: RequisitoTable
  prompt_cache: PromptCacheTable
}
