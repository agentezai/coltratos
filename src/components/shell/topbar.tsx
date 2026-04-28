import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export interface TopbarProps {
  className?: string;
}

export function Topbar({ className = "" }: TopbarProps) {
  return (
    <header
      data-component="topbar"
      className={[
        "h-[72px] bg-white border-b border-[var(--border-subtle)] flex items-center gap-[18px] px-8",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <label className="flex-1 max-w-[460px] flex items-center gap-2.5 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[10px] px-3 py-2.5">
        <Icon name="search" size={16} className="stroke-[var(--fg-3)]" />
        <input
          className="flex-1 bg-transparent border-0 outline-none text-[var(--fg-1)] text-sm"
          placeholder="Buscar análisis, procesos, entidades..."
          aria-label="Buscar"
        />
      </label>
      <div className="ml-auto flex gap-2.5 items-center">
        <button
          type="button"
          aria-label="Notificaciones"
          className="relative w-[38px] h-[38px] rounded-[10px] inline-flex items-center justify-center border border-[var(--border-subtle)] bg-white hover:bg-graphite-100 transition-colors"
        >
          <Icon name="bell" className="stroke-graphite-700" />
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white"
          />
        </button>
        <button
          type="button"
          aria-label="Configuración"
          className="w-[38px] h-[38px] rounded-[10px] inline-flex items-center justify-center border border-[var(--border-subtle)] bg-white hover:bg-graphite-100 transition-colors"
        >
          <Icon name="settings" className="stroke-graphite-700" />
        </button>
        <Button variant="primary" leadingIcon="plus">
          Subir pliego
        </Button>
      </div>
    </header>
  );
}
