import type { SemaforoColor, RequisitoCategoria } from './primitives'
import type { Requisito } from './requisito'

export type { RequisitoCategoria, IsHabilitanteSource } from './primitives'

export type SemaforoStats = {
  total: number
  cumple: number
  noCumple: number
  sinInfo: number
  cumplePct: number
}

export type Semaforo = {
  overall: SemaforoColor
  byCategoria: Record<RequisitoCategoria, SemaforoColor>
  blockers: Requisito[]
  stats: SemaforoStats
}
