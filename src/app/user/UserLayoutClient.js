"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUserAuth } from "./UserAuthContext";
import { Button, Badge } from "@/shared/components";

export default function UserLayoutClient({ children }) {
  const { apiKey, userInfo, loading, logout } = useUserAuth();
  const pathname = usePathname();
  const router = useRouter();

  // If not logged in and not on login page, redirect to /user/login
  useEffect(() => {
    if (!loading && !apiKey && pathname !== "/user/login") {
      router.push("/user/login");
    }
  }, [apiKey, loading, pathname, router]);

  if (pathname === "/user/login") {
    return <>{children}</>;
  }

  if (loading && !userInfo) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <span className="material-symbols-outlined text-[32px] text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  const navItems = [
    { href: "/user/dashboard", label: "Overview", icon: "dashboard" },
    { href: "/user/usage", label: "Usage History", icon: "bar_chart" },
    { href: "/user/models", label: "Available Models", icon: "view_in_ar" },
    { href: "/user/docs", label: "Quick Start & Presets", icon: "integration_instructions" },
  ];

  return (
    <div className="min-h-screen bg-bg text-text-main flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-surface border-b-2 border-border shadow-[0_2px_0px_var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/user/dashboard" className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
              <span className="material-symbols-outlined text-[26px]">router</span>
              <span>9Router User Portal</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                      isActive
                        ? "bg-primary text-white shadow-[2px_2px_0px_var(--color-border)]"
                        : "text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {userInfo?.key && (
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-text-main">{userInfo.key.name}</span>
                <span className="text-[10px] font-mono text-text-muted">{userInfo.key.keyMasked}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" icon="logout" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center justify-around border-t border-border bg-surface-2 px-2 py-1 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-border bg-surface py-4 text-center text-xs text-text-muted">
        <p>9Router Public Gateway User Portal • Powered by 9Router Engine</p>
      </footer>
    </div>
  );
}
