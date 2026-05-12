import { Chip } from "@/components/ui/chip";

/**
 * Legacy semáforo values — kept for backwards compatibility during T11+ transition.
 * New code must use the canonical form (RN-002, contract T13).
 */
export type LegacySemaforo = "eligible" | "conditional" | "not-eligible";

/**
 * Canonical semáforo values (contratacion-publica.md, RN-002).
 * Used by T11+ Resultado del análisis real-data wiring.
 */
export type CanonicalSemaforo = "verde" | "amarillo" | "rojo";

/**
 * Semaforo accepts both canonical and legacy forms during the transition.
 * Canonical form must be used for all new wiring (RN-002).
 */
export type Semaforo = CanonicalSemaforo | LegacySemaforo;

const MAP: Record<Semaforo, { variant: "green" | "amber" | "red"; label: string }> = {
  // Canonical values (T11+ wiring)
  verde: { variant: "green", label: "Cumple" },
  amarillo: { variant: "amber", label: "Con observaciones" },
  rojo: { variant: "red", label: "No cumple" },
  // Legacy values (T1–T10 mock-backed screens)
  eligible: { variant: "green", label: "Elegible" },
  conditional: { variant: "amber", label: "Con observaciones" },
  "not-eligible": { variant: "red", label: "No elegible" },
};

export function SemPill({ status }: { status: Semaforo }) {
  const { variant, label } = MAP[status];
  return <Chip variant={variant}>{label}</Chip>;
}
