"use client";

import { cn } from "@/shared/utils/cn";

export default function SegmentedControl({
  options = [],
  value,
  onChange,
  size = "md",
  className,
}) {
  const sizes = {
    sm: "h-7 text-xs",
    md: "h-8 text-sm",
    lg: "h-10 text-base",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center p-1 rounded border-2 border-border overflow-x-auto",
        "bg-surface-2 shadow-[2px_2px_0px_var(--color-border)]",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "shrink-0 px-3 rounded font-bold transition-all",
            sizes[size],
            value === option.value
              ? "bg-brand-500 text-white border-2 border-border shadow-[1px_1px_0px_var(--color-border)]"
              : "text-text-muted hover:text-text-main border-2 border-transparent"
          )}
        >
          {option.icon && (
            <span className="material-symbols-outlined text-[16px] mr-1.5 align-middle">
              {option.icon}
            </span>
          )}
          {option.label}
        </button>
      ))}
    </div>
  );
}
