"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUserAuth } from "./UserAuthContext";
import UserSidebar from "./components/UserSidebar";
import { Button } from "@/shared/components";

export default function UserLayoutClient({ children }) {
  const { apiKey, userInfo, loading, logout } = useUserAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      <div className="h-screen w-full bg-bg flex items-center justify-center">
        <span className="material-symbols-outlined text-[32px] text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-text-main font-sans">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex shrink-0">
        <UserSidebar />
      </div>

      {/* Sidebar - Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform lg:hidden transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <UserSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Container */}
      <div className="flex flex-col flex-1 h-full min-w-0 relative">
        {/* Top Header */}
        <header className="h-14 border-b-2 border-border bg-surface px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-[0_2px_0px_var(--color-border)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded border-2 border-border text-text-muted hover:text-text-main hover:bg-surface-2"
              aria-label="Open navigation menu"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text-main capitalize">
                {pathname.replace("/user/", "").replace("-", " ") || "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {userInfo?.key && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="font-bold text-text-main hidden sm:inline">{userInfo.key.name}</span>
                <code className="text-text-muted font-mono bg-surface-2 px-1.5 py-0.5 rounded border border-border">
                  {userInfo.key.keyMasked}
                </code>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon="logout"
              onClick={logout}
              className="hidden sm:inline-flex"
            >
              Sign Out
            </Button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
