import type { ReactNode } from "react";

type Variant = "green" | "amber" | "red" | "blue" | "violet" | "gray";

const CHIP: Record<Variant, string> = {
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-blue-50 text-blue-700",
  violet: "bg-tint-violet text-[#6d28d9]",
  gray: "bg-graphite-100 text-graphite-700",
};

const DOT: Record<Variant, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-blue-600",
  violet: "bg-[#7c3aed]",
  gray: "bg-graphite-500",
};

export interface ChipProps {
  variant: Variant;
  /** Default `true`. The system relies on a dot + text label rather than
   * color alone (RN-007). */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Chip({ variant, dot = true, className = "", children }: ChipProps) {
  return (
    <span
      data-component="chip"
      className={[
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
        CHIP[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dot && (
        <span
          className={["w-2 h-2 rounded-full", DOT[variant]].join(" ")}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
