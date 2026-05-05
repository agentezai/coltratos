import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-start mb-7">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-graphite-900 m-0">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-graphite-500 mt-1 m-0">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex gap-2 items-center flex-shrink-0">{actions}</div>}
    </div>
  );
}
