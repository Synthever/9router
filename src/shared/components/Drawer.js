"use client";

import { useEffect } from "react";
import { cn } from "@/shared/utils/cn";

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  width = "md",
  className
}) {
  const widths = {
    sm: "w-full sm:w-[400px]",
    md: "w-full sm:w-[500px]",
    lg: "w-full sm:w-[600px]",
    xl: "w-full sm:w-[800px]",
    full: "w-full",
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] fade-in cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className={cn(
        "absolute right-0 top-0 h-full max-w-full bg-surface flex flex-col",
        "shadow-[var(--shadow-elev)]",
        "slide-in-right",
        "border-l-2 border-border",
        widths[width] || widths.md,
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {title && (
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-text-main truncate">{title}</h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded border-2 border-border bg-surface text-text-muted hover:bg-brand-500 hover:text-white transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
