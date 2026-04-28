import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./icon";

type Variant = "primary" | "secondary" | "ghost" | "success";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white border-transparent hover:bg-blue-700 active:bg-blue-800",
  secondary:
    "bg-white text-graphite-800 border border-graphite-300 hover:bg-graphite-100",
  ghost:
    "bg-transparent text-graphite-700 border-transparent hover:bg-graphite-100",
  success:
    "bg-green-600 text-white border-transparent hover:bg-green-700",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[13px]",
  md: "px-[18px] py-2.5 text-[14px]",
  lg: "px-[22px] py-[13px] text-[15px]",
};

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  variant?: Variant;
  size?: Size;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    leadingIcon,
    trailingIcon,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  const iconSize = size === "lg" ? 18 : 16;
  return (
    <button
      ref={ref}
      data-component="button"
      className={[
        "inline-flex items-center gap-2 font-semibold leading-none rounded-md whitespace-nowrap",
        "transition-[background-color,color,box-shadow] duration-180",
        "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {leadingIcon && <Icon name={leadingIcon} size={iconSize} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={iconSize} />}
    </button>
  );
});
