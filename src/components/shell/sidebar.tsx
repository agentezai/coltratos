"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";

interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  badge?: string;
}

const PRINCIPAL: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "chart", href: "/dashboard" },
  { id: "procesos", label: "Procesos", icon: "file-text", href: "/dashboard/procesos" },
  { id: "subir", label: "Subir pliego", icon: "upload", href: "/dashboard/upload" },
  { id: "analisis", label: "Mis análisis", icon: "file", href: "/dashboard/analisis", badge: "147" },
  { id: "alertas", label: "Alertas", icon: "bell", href: "/dashboard/alertas", badge: "3" },
];

const CUENTA: NavItem[] = [
  { id: "creditos", label: "Créditos", icon: "card", href: "/dashboard/creditos" },
  { id: "equipo", label: "Mi equipo", icon: "users", href: "/dashboard/equipo" },
  { id: "config", label: "Configuración", icon: "settings", href: "/dashboard/config" },
];

export interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  user?: { name: string; email: string; initials: string };
  credits?: { used: number; total: number };
}

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  user = {
    name: "María Rodríguez",
    email: "m.rodriguez@constru.co",
    initials: "MR",
  },
  credits = { used: 23, total: 50 },
}: SidebarProps) {
  const pathname = usePathname();
  const pct = Math.round((credits.used / credits.total) * 100);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : (pathname?.startsWith(href) ?? false);

  const linkClass = (href: string) =>
    [
      "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border-0 w-full cursor-pointer transition-colors no-underline",
      collapsed ? "justify-center px-3" : "",
      isActive(href)
        ? "bg-navy-800 text-white shadow-[inset_2px_0_0_var(--blue-500)]"
        : "bg-transparent text-[var(--fg-on-dark-2)] hover:bg-navy-800 hover:text-white",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <aside
      data-component="sidebar"
      className={[
        "bg-navy-900 text-white px-3.5 pt-5 pb-4 flex flex-col gap-1.5 sticky top-0 h-screen transition-all duration-200",
        collapsed ? "w-[76px]" : "w-[244px]",
      ].join(" ")}
    >
      <div className={["flex items-center gap-2.5 px-2.5 pt-1.5 pb-4", collapsed ? "justify-center px-0" : ""].join(" ")}>
        <Image src="/logo/coltratos-mark.svg" alt="" width={34} height={34} priority />
        {!collapsed && (
          <span className="font-display font-extrabold tracking-[0.06em] text-[17px]">
            COLTRATOS
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--fg-on-dark-3)] px-3 pt-3.5 pb-1.5">
          Principal
        </div>
      )}

      {PRINCIPAL.map((it) => (
        <Link
          key={it.id}
          href={it.href}
          data-nav-item="true"
          data-active={isActive(it.href) ? "true" : undefined}
          className={linkClass(it.href)}
        >
          <Icon name={it.icon} className="stroke-current flex-none" />
          {!collapsed && <span>{it.label}</span>}
          {!collapsed && it.badge && (
            <span className="ml-auto bg-blue-600 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
              {it.badge}
            </span>
          )}
        </Link>
      ))}

      {!collapsed && (
        <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--fg-on-dark-3)] px-3 pt-3.5 pb-1.5">
          Cuenta
        </div>
      )}

      {CUENTA.map((it) => (
        <Link
          key={it.id}
          href={it.href}
          data-nav-item="true"
          data-active={isActive(it.href) ? "true" : undefined}
          className={linkClass(it.href)}
        >
          <Icon name={it.icon} className="stroke-current flex-none" />
          {!collapsed && <span>{it.label}</span>}
        </Link>
      ))}

      <div className="mt-auto flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-full py-1.5 text-[var(--fg-on-dark-3)] hover:text-white transition-colors"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          <Icon
            name="chev-right"
            size={16}
            className={["stroke-current transition-transform", collapsed ? "" : "rotate-180"].join(" ")}
          />
        </button>

        {!collapsed && (
          <div className="bg-navy-800 border border-[var(--border-on-dark)] rounded-xl p-3.5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-[var(--fg-on-dark-3)]">Créditos restantes</span>
            </div>
            <div className="font-display font-bold text-[22px]">
              {credits.used}{" "}
              <span className="text-[13px] font-medium text-[var(--fg-on-dark-3)]">
                / {credits.total}
              </span>
            </div>
            <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden mb-2.5">
              <i
                className="block h-full"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, #4ade80, #22c55e)",
                }}
              />
            </div>
            <div className="text-xs font-semibold text-[#4ade80] cursor-pointer">
              Comprar créditos →
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="flex items-center gap-2.5 p-2.5 rounded-[10px] bg-navy-800" data-sidebar-user-info>
            <div
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white font-bold text-[13px] flex-none"
              style={{ background: "linear-gradient(135deg, #2563eb, #4ade80)" }}
            >
              {user.initials}
            </div>
            <div className="flex-1 min-w-0 leading-[1.2]">
              <div className="text-[13px] font-semibold text-white truncate">{user.name}</div>
              <div className="text-[11px] text-[var(--fg-on-dark-3)] truncate">{user.email}</div>
            </div>
            <Icon name="chev-down" size={14} className="stroke-[var(--fg-on-dark-3)] flex-none" />
          </div>
        )}
      </div>
    </aside>
  );
}
