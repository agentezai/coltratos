// Primitives — branded IDs, enum const objects, and union types
export * from './domain/primitives'

// Zod schemas (runtime validators)
export { EmpresaSchema } from './domain/empresa'
export { ProcesoSchema } from './domain/proceso'
export { PliegoSchema } from './domain/pliego'
export { AnexoProcesoSchema } from './domain/anexo-proceso'
export { SegmentoSchema } from './domain/segmento'
export { AnalisisSchema } from './domain/analisis'
export { RequisitoSchema } from './domain/requisito'
export { PromptCacheSchema } from './domain/prompt-cache'

// TypeScript types inferred from Zod schemas (compile-time only)
export type { Empresa } from './domain/empresa'
export type { Proceso } from './domain/proceso'
export type { Pliego } from './domain/pliego'
export type { AnexoProceso } from './domain/anexo-proceso'
export type { Segmento } from './domain/segmento'
export type { Analisis } from './domain/analisis'
export type { Requisito } from './domain/requisito'
export type { PromptCache } from './domain/prompt-cache'

// Kysely Database interface and per-table types
export type {
  Database,
  ModelMetadata,
  EmpresaTable,       NewEmpresa,       EmpresaUpdate,
  EmpresaMemberTable, NewEmpresaMember,  EmpresaMemberUpdate,
  ProcesoTable,       NewProceso,        ProcesoUpdate,
  PliegoTable,        NewPliego,         PliegoUpdate,
  AnexoProcesoTable,  NewAnexoProceso,   AnexoProcesoUpdate,
  SegmentoTable,      NewSegmento,       SegmentoUpdate,
  AnalisisTable,      NewAnalisis,       AnalisisUpdate,
  RequisitoTable,     NewRequisito,      RequisitoUpdate,
  PromptCacheTable,   NewPromptCache,    PromptCacheUpdate,
} from './db'

// Extraction payload schema (LLM output contract — distinct from RequisitoSchema)
export { RequisitoExtractionPayloadSchema, RequisitoExtractionPayloadArraySchema } from './domain/extraction-payload'

export type { RequisitoExtractionPayload } from './domain/extraction-payload'

// Logger interface (consumed by lib/extraction; zero runtime)
export type { ExtractorLogger } from './logger'

// Semaforo aggregation types (pure TypeScript — no Zod schemas)
export type { Semaforo, SemaforoStats, RequisitoCategoria, IsHabilitanteSource } from './domain/semaforo'

// Habilitante pattern constants (runtime values)
export { HABILITANTE_HEADING_PATTERNS, HABILITANTE_PATTERNS_VERSION } from './domain/habilitante-patterns'
