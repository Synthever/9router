"use client";

import { cn } from "@/shared/utils/cn";

const variants = {
  primary:
    "bg-brand-500 hover:bg-brand-600 text-white border-2 border-border shadow-[2px_2px_0px_var(--color-border)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:bg-surface-3 disabled:text-text-muted disabled:border-border/50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0",
  secondary:
    "bg-surface-2 hover:bg-surface-3 text-text-main border-2 border-border shadow-[2px_2px_0px_var(--color-border)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0",
  outline:
    "bg-surface border-2 border-border text-text-main shadow-[2px_2px_0px_var(--color-border)] hover:bg-surface-2 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
  ghost:
    "text-text-muted hover:bg-surface-2 hover:text-text-main border border-transparent hover:border-border",
  danger:
    "bg-danger hover:brightness-95 text-white border-2 border-border shadow-[2px_2px_0px_var(--color-border)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:bg-surface-3 disabled:text-text-muted disabled:shadow-none",
  success:
    "bg-success hover:brightness-95 text-white border-2 border-border shadow-[2px_2px_0px_var(--color-border)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:bg-surface-3 disabled:text-text-muted disabled:shadow-none",
};

const sizes = {
  sm: "h-8 px-3 text-xs rounded",
  md: "h-9 px-4 text-sm rounded-md",
  lg: "h-11 px-6 text-base rounded-md",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  disabled = false,
  loading = false,
  fullWidth = false,
  className,
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold tracking-tight transition-all duration-100 ease-out cursor-pointer",
        "disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
      ) : icon ? (
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className="material-symbols-outlined text-[18px]">{iconRight}</span>
      )}
    </button>
  );
}
