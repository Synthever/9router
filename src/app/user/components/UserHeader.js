"use client";

import { usePathname } from "next/navigation";
import PropTypes from "prop-types";
import ThemeToggle from "@/shared/components/ThemeToggle";
import { useUserAuth } from "../UserAuthContext";

const USER_PAGE_INFO = {
  "/user/dashboard": {
    title: "User Dashboard",
    description: "Overview of your API key quotas, remaining limits, and active status",
    icon: "dashboard",
  },
  "/user/usage": {
    title: "Usage Analytics",
    description: "Detailed consumption history, token usage per model, and request logs",
    icon: "bar_chart",
  },
  "/user/models": {
    title: "Available Models",
    description: "AI models available to your API key with capabilities and IDs",
    icon: "view_in_ar",
  },
  "/user/docs": {
    title: "Quick Start & Presets",
    description: "Connection parameters and ready-to-use code integration snippets",
    icon: "integration_instructions",
  },
};

export default function UserHeader({ onMenuClick }) {
  const pathname = usePathname();
  const { apiKey, userInfo, logout } = useUserAuth();

  const pageInfo = USER_PAGE_INFO[pathname] || {
    title: "User Portal",
    description: "9Router AI API Gateway",
    icon: "router",
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b-2 border-border bg-surface px-4 py-3 sm:px-6 transition-colors duration-200">
      <div className="flex min-w-0 items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex lg:hidden items-center justify-center size-9 rounded border-2 border-border bg-surface-2 text-text-main shadow-[2px_2px_0px_var(--color-border)] hover:bg-brand-500 hover:text-white transition-all cursor-pointer"
          aria-label="Open sidebar"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        {/* Page title & icon */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="hidden sm:flex items-center justify-center size-8 rounded border-2 border-border bg-primary/10 text-primary shadow-[1px_1px_0px_var(--color-border)]">
            <span className="material-symbols-outlined text-[18px]">{pageInfo.icon}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-text-main truncate">
              {pageInfo.title}
            </h1>
            <p className="hidden md:block text-xs text-text-muted truncate">
              {pageInfo.description}
            </p>
          </div>
        </div>
      </div>

      {/* Right actions: Live key status, Theme Toggle, Logout */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {userInfo?.key && (
          <div className="flex items-center gap-2 bg-surface-2 px-2.5 py-1 rounded border-2 border-border shadow-[1px_1px_0px_var(--color-border)]">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
            <span className="text-xs font-bold text-text-main hidden sm:inline truncate max-w-[120px]">
              {userInfo.key.name}
            </span>
            <code className="text-[10px] text-text-muted font-mono">
              {userInfo.key.keyMasked}
            </code>
          </div>
        )}

        {/* Dark / Light Mode Toggle Button */}
        <ThemeToggle />

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="flex items-center justify-center size-9 rounded border-2 border-border bg-surface-2 text-text-muted hover:text-red-500 hover:border-red-500 hover:bg-red-500/10 shadow-[2px_2px_0px_var(--color-border)] transition-all cursor-pointer"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
        </button>
      </div>
    </header>
  );
}

UserHeader.propTypes = {
  onMenuClick: PropTypes.func,
};
