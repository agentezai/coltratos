import type { ReactNode } from "react";

export interface CardProps {
  className?: string;
  children: ReactNode;
}

export function Card({ className = "", children }: CardProps) {
  return (
    <section
      data-component="card"
      className={[
        "bg-white border border-[var(--border-hairline)] rounded-lg shadow-[var(--shadow-sm)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  );
}

export interface CardHeadProps {
  title?: string;
  sub?: string;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function CardHead({
  title,
  sub,
  actions,
  className = "",
  children,
}: CardHeadProps) {
  return (
    <header
      data-component="card-head"
      className={[
        "flex items-center justify-between px-6 py-5 border-b border-[var(--border-hairline)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0">
        {title && (
          <h3 className="font-semibold text-[20px] tracking-[-0.01em] text-[var(--fg-1)] m-0">
            {title}
          </h3>
        )}
        {sub && (
          <p className="text-[13px] text-[var(--fg-3)] mt-0.5 m-0">{sub}</p>
        )}
        {children}
      </div>
      {actions && <div className="flex gap-2 items-center">{actions}</div>}
    </header>
  );
}

export interface CardBodyProps {
  className?: string;
  children: ReactNode;
}

export function CardBody({ className = "", children }: CardBodyProps) {
  return (
    <div
      data-component="card-body"
      className={["p-6", className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
