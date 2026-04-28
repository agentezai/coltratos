import type { ReactNode } from "react";

export default function InternalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-[var(--surface-canvas)] min-h-screen">{children}</main>
  );
}
