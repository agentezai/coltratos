// Branded ID types — one per aggregate root; prevents mixing IDs across entity boundaries
export type EmpresaId      = string & { readonly __brand: 'EmpresaId' }
export type ProcesoId      = string & { readonly __brand: 'ProcesoId' }
export type PliegoId       = string & { readonly __brand: 'PliegoId' }
export type AnexoProcesoId = string & { readonly __brand: 'AnexoProcesoId' }
export type SegmentoId     = string & { readonly __brand: 'SegmentoId' }
export type AnalisisId     = string & { readonly __brand: 'AnalisisId' }
export type RequisitoId    = string & { readonly __brand: 'RequisitoId' }
export type PromptCacheId  = string & { readonly __brand: 'PromptCacheId' }

export const branded = <T>(id: string) => id as T

// AnalisisEstado
export const AnalisisEstado = {
  pending:    'pending',
  extracting: 'extracting',
  analyzing:  'analyzing',
  completed:  'completed',
  failed:     'failed',
} as const
export type AnalisisEstado = typeof AnalisisEstado[keyof typeof AnalisisEstado]

// SegmentoCategoria — wide union including 'general' (used by pdf-ingestion categorizer)
export const SegmentoCategoria = {
  juridico:    'juridico',
  financiero:  'financiero',
  tecnico:     'tecnico',
  experiencia: 'experiencia',
  general:     'general',
} as const
export type SegmentoCategoria = typeof SegmentoCategoria[keyof typeof SegmentoCategoria]

// RequisitoCategoria — narrow union; 'general' excluded (RN-017, RN-002)
// Extraction is gated upstream: segments with categoria='general' are never extracted.
export const RequisitoCategoria = {
  juridico:    'juridico',
  financiero:  'financiero',
  tecnico:     'tecnico',
  experiencia: 'experiencia',
} as const
export type RequisitoCategoria = typeof RequisitoCategoria[keyof typeof RequisitoCategoria]

// SemaforoColor
export const SemaforoColor = {
  verde:    'verde',
  amarillo: 'amarillo',
  rojo:     'rojo',
} as const
export type SemaforoColor = typeof SemaforoColor[keyof typeof SemaforoColor]

// IsHabilitanteSource — classifier tier that produced the is_habilitante verdict
export const IsHabilitanteSource = {
  structural: 'structural',
  llm:        'llm',
  manual:     'manual',
} as const
export type IsHabilitanteSource = typeof IsHabilitanteSource[keyof typeof IsHabilitanteSource]

// ModalidadContratacion
export const ModalidadContratacion = {
  licitacion_publica:   'licitacion_publica',
  seleccion_abreviada:  'seleccion_abreviada',
  minima_cuantia:       'minima_cuantia',
  concurso_meritos:     'concurso_meritos',
  contratacion_directa: 'contratacion_directa',
} as const
export type ModalidadContratacion = typeof ModalidadContratacion[keyof typeof ModalidadContratacion]

// PliegoTipo — narrow per RN-012; covers only documents with requisitos habilitantes
export const PliegoTipo = {
  pliego_condiciones: 'pliego_condiciones',
  pliego_definitivo:  'pliego_definitivo',
} as const
export type PliegoTipo = typeof PliegoTipo[keyof typeof PliegoTipo]

// AnexoProcesoTipo — covers all other proceso documents (not pliegos)
export const AnexoProcesoTipo = {
  anexo_tecnico:  'anexo_tecnico',
  estudio_previo: 'estudio_previo',
  resolucion:     'resolucion',
  otro:           'otro',
} as const
export type AnexoProcesoTipo = typeof AnexoProcesoTipo[keyof typeof AnexoProcesoTipo]

// EmpresaMemberRole
export const EmpresaMemberRole = {
  owner:  'owner',
  member: 'member',
} as const
export type EmpresaMemberRole = typeof EmpresaMemberRole[keyof typeof EmpresaMemberRole]
