import { Icon, type IconName } from "@/components/ui/icon";

type Tint = "blue" | "green" | "amber" | "purple" | "red";

const TINT: Record<Tint, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
  green: { bg: "bg-green-50", text: "text-green-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-600" },
  purple: { bg: "bg-violet-50", text: "text-violet-600" },
  red: { bg: "bg-red-50", text: "text-red-500" },
};

export interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  icon: IconName;
  tint: Tint;
  delta?: { direction: "up" | "down"; label: string };
}

export function StatCard({ label, value, unit, hint, icon, tint, delta }: StatCardProps) {
  const { bg, text } = TINT[tint];
  return (
    <div className="bg-white border border-[var(--border-hairline)] rounded-lg p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between mb-3">
        <div className={["w-11 h-11 rounded-full flex items-center justify-center flex-none", bg, text].join(" ")}>
          <Icon name={icon} size={20} />
        </div>
      </div>
      <div className="font-display font-bold text-[28px] leading-none text-graphite-900">
        {value}
        {unit && <span className="text-[16px] font-medium ml-1 text-graphite-500">{unit}</span>}
      </div>
      <div className="text-sm font-medium text-graphite-700 mt-1">{label}</div>
      {hint && <div className="text-xs text-graphite-400 mt-0.5">{hint}</div>}
      {delta && (
        <div className={["text-xs mt-2 font-medium", delta.direction === "up" ? "text-green-600" : "text-red-500"].join(" ")}>
          {delta.direction === "up" ? "↑" : "↓"} {delta.label}
        </div>
      )}
    </div>
  );
}
