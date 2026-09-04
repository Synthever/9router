"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserAuth } from "../UserAuthContext";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

const userNavItems = [
  { href: "/user/dashboard", label: "Overview", icon: "dashboard" },
  { href: "/user/usage", label: "Usage History", icon: "bar_chart" },
  { href: "/user/models", label: "Available Models", icon: "view_in_ar" },
  { href: "/user/docs", label: "Quick Start & Presets", icon: "integration_instructions" },
];

export default function UserSidebar({ onClose }) {
  const pathname = usePathname();
  const { apiKey, userInfo, logout } = useUserAuth();
  const { copied, copy } = useCopyToClipboard(2000);

  const isActive = (href) => pathname === href;

  return (
    <aside className="flex w-72 flex-col border-r-2 border-border bg-sidebar transition-colors duration-200 min-h-full h-screen sticky top-0">
      {/* Traffic lights header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] border border-border" />
          <div className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] border border-border" />
          <div className="w-3.5 h-3.5 rounded-full bg-[#27C93F] border border-border" />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded border-2 border-border text-text-muted hover:text-text-main"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Brand Logo & Portal Tag */}
      <div className="px-6 py-4 flex flex-col gap-1 border-b-2 border-border">
        <Link href="/user/dashboard" className="flex items-center gap-3 group">
          <div className="flex items-center justify-center size-9 rounded border-2 border-border bg-primary shadow-[2px_2px_0px_var(--color-border)] group-hover:translate-x-[-1px] group-hover:translate-y-[-1px] transition-transform">
            <span className="material-symbols-outlined text-white text-[20px]">router</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-black tracking-tight text-text-main">
              9Router Portal
            </h1>
            <span className="text-[10px] uppercase font-bold text-primary tracking-wider">User Dashboard</span>
          </div>
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
          User Menu
        </div>
        {userNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onClose && onClose()}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded font-bold text-xs uppercase tracking-wider transition-all ${
                active
                  ? "bg-primary text-white border-2 border-border shadow-[2px_2px_0px_var(--color-border)] translate-x-[-1px] translate-y-[-1px]"
                  : "text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${active ? "text-white" : "text-text-muted"}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User API Key Profile & Sign Out Footer */}
      <div className="p-4 border-t-2 border-border bg-surface-2 flex flex-col gap-3">
        {userInfo?.key && (
          <div className="flex flex-col gap-1 bg-surface p-2.5 rounded border-2 border-border shadow-[2px_2px_0px_var(--color-border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-main truncate" title={userInfo.key.name}>
                {userInfo.key.name}
              </span>
              <button
                onClick={() => copy(apiKey, "user_key_sidebar")}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary transition-colors cursor-pointer"
                title="Copy API Key"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {copied === "user_key_sidebar" ? "check" : "content_copy"}
                </span>
              </button>
            </div>
            <code className="text-[10px] font-mono text-text-muted">
              {userInfo.key.keyMasked}
            </code>
          </div>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded border-2 border-border bg-surface text-text-muted hover:text-red-500 hover:border-red-500 hover:bg-red-500/10 font-bold text-xs uppercase tracking-wider transition-all shadow-[2px_2px_0px_var(--color-border)] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
