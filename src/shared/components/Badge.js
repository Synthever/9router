"use client";

import { cn } from "@/shared/utils/cn";

const variants = {
  default: "bg-surface-2 text-text-main border-2 border-border shadow-[1px_1px_0px_var(--color-border)]",
  primary: "bg-brand-500 text-white border-2 border-border shadow-[1px_1px_0px_var(--color-border)]",
  success: "bg-success text-white border-2 border-border shadow-[1px_1px_0px_var(--color-border)]",
  warning: "bg-warning text-white border-2 border-border shadow-[1px_1px_0px_var(--color-border)]",
  error: "bg-danger text-white border-2 border-border shadow-[1px_1px_0px_var(--color-border)]",
  info: "bg-info text-white border-2 border-border shadow-[1px_1px_0px_var(--color-border)]",
};

const sizes = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export default function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  icon,
  className,
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded font-bold tracking-tight",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "size-2 rounded-full border border-black dark:border-white",
            variant === "success" && "bg-green-300",
            variant === "warning" && "bg-yellow-300",
            variant === "error" && "bg-red-300",
            variant === "info" && "bg-blue-300",
            variant === "primary" && "bg-white",
            variant === "default" && "bg-brand-500"
          )}
        />
      )}
      {icon && <span className="material-symbols-outlined text-[14px]">{icon}</span>}
      {children}
    </span>
  );
}
