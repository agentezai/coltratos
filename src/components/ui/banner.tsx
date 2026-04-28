import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";

export interface BannerProps {
  variant?: "info";
  icon?: IconName;
  className?: string;
  children: ReactNode;
}

export function Banner({
  icon,
  className = "",
  children,
}: BannerProps) {
  return (
    <div
      data-component="banner"
      className={[
        "flex gap-3 items-start px-[18px] py-3.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-[13px]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon && (
        <Icon name={icon} size={18} className="flex-none stroke-blue-600" />
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
