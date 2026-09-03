"use client";

import { useTheme } from "@/shared/hooks/useTheme";
import { cn } from "@/shared/utils/cn";

export default function ThemeToggle({ className, variant = "default" }) {
  const { isDark, toggleTheme } = useTheme();

  const variants = {
    default: cn(
      "flex items-center justify-center size-9 rounded border-2 border-border",
      "bg-surface-2 text-text-main hover:bg-brand-500 hover:text-white shadow-[2px_2px_0px_var(--color-border)]",
      "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
    ),
    card: cn(
      "flex items-center justify-center size-10 rounded border-2 border-border",
      "bg-surface text-text-main hover:bg-brand-500 hover:text-white shadow-[2px_2px_0px_var(--color-border)]",
      "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer group"
    ),
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(variants[variant], className)}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span
        className={cn(
          "material-symbols-outlined text-[20px]",
          variant === "card" && "transition-transform duration-300 group-hover:rotate-45"
        )}
      >
        {isDark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
