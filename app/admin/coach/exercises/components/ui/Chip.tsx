import type { ButtonHTMLAttributes, ReactNode } from "react";

type ChipVariant = "default" | "secondary" | "success" | "warning" | "danger";

type ChipSize = "sm" | "md";

type ChipProps = {
  children: ReactNode;
  variant?: ChipVariant;
  size?: ChipSize;
  isActive?: boolean;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variantClasses: Record<ChipVariant, string> = {
  default: "border border-sky-200 bg-sky-100 text-sky-700",

  secondary: "border border-slate-200 bg-slate-100 text-slate-700",

  success: "border border-emerald-200 bg-emerald-100 text-emerald-700",

  warning: "border border-amber-200 bg-amber-100 text-amber-700",

  danger: "border border-red-200 bg-red-100 text-red-700",
};

const sizeClasses: Record<ChipSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

const activeClasses = "border-sky-600 bg-sky-600 text-white shadow-md";

export default function Chip({
  children,
  variant = "default",
  size = "md",
  isActive = false,
  className = "",
  disabled = false,
  ...buttonProps
}: ChipProps) {
  const classes = [
    "inline-flex items-center justify-center rounded-full font-bold whitespace-nowrap transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    sizeClasses[size],
    isActive ? activeClasses : variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
