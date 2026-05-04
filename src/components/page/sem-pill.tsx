import { Chip } from "@/components/ui/chip";

export type Semaforo = "eligible" | "conditional" | "not-eligible";

const MAP: Record<Semaforo, { variant: "green" | "amber" | "red"; label: string }> = {
  eligible: { variant: "green", label: "Elegible" },
  conditional: { variant: "amber", label: "Con observaciones" },
  "not-eligible": { variant: "red", label: "No elegible" },
};

export function SemPill({ status }: { status: Semaforo }) {
  const { variant, label } = MAP[status];
  return <Chip variant={variant}>{label}</Chip>;
}
