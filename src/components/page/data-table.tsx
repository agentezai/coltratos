import type { ReactNode } from "react";

export interface DataTableProps {
  children: ReactNode;
  className?: string;
}

export function DataTable({ children, className = "" }: DataTableProps) {
  return (
    <div className={["bg-white border border-graphite-200 rounded-xl overflow-hidden", className].filter(Boolean).join(" ")}>
      <table className="w-full text-sm">
        {children}
      </table>
    </div>
  );
}
