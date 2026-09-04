"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUserAuth } from "./UserAuthContext";
import UserSidebar from "./components/UserSidebar";
import UserHeader from "./components/UserHeader";

export default function UserLayoutClient({ children }) {
  const { apiKey, userInfo, loading } = useUserAuth();
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
      {/* Mobile sidebar backdrop overlay */}
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
      <main className="flex flex-col flex-1 h-full min-w-0 relative transition-colors duration-200 isolate">
        {/* Header with Title, Dark/Light Mode Theme Toggle, and User Key Profile */}
        <UserHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Scrollable Page Content area identical to Admin Dashboard */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
