import type { ReactNode } from "react";

type Tint = "blue" | "green" | "amber" | "red" | "violet" | "sky";

const TINT: Record<Tint, string> = {
  blue: "bg-tint-blue [&_svg]:stroke-blue-600",
  green: "bg-tint-green [&_svg]:stroke-green-600",
  amber: "bg-tint-amber [&_svg]:stroke-amber-700",
  red: "bg-tint-red [&_svg]:stroke-red-700",
  violet: "bg-tint-violet [&_svg]:stroke-[#6d28d9]",
  sky: "bg-tint-sky [&_svg]:stroke-[#0369a1]",
};

export interface WellProps {
  tint: Tint;
  /** Outer diameter in px. Default 42 (matches the bundle's KPI card wells). */
  size?: number;
  className?: string;
  children: ReactNode;
}

export function Well({ tint, size = 42, className = "", children }: WellProps) {
  return (
    <span
      data-component="well"
      style={{ width: size, height: size }}
      className={[
        "inline-flex items-center justify-center rounded-full flex-none",
        TINT[tint],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
