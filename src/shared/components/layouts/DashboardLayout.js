"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useNotificationStore } from "@/store/notificationStore";
import Sidebar from "../Sidebar";
import Header from "../Header";

function getToastStyle(type) {
  if (type === "success") {
    return {
      wrapper: "border-2 border-border bg-surface text-text-main shadow-[3px_3px_0px_var(--color-border)]",
      icon: "check_circle",
      iconColor: "text-success",
    };
  }
  if (type === "error") {
    return {
      wrapper: "border-2 border-border bg-surface text-text-main shadow-[3px_3px_0px_var(--color-border)]",
      icon: "error",
      iconColor: "text-danger",
    };
  }
  if (type === "warning") {
    return {
      wrapper: "border-2 border-border bg-surface text-text-main shadow-[3px_3px_0px_var(--color-border)]",
      icon: "warning",
      iconColor: "text-warning",
    };
  }
  return {
    wrapper: "border-2 border-border bg-surface text-text-main shadow-[3px_3px_0px_var(--color-border)]",
    icon: "info",
    iconColor: "text-info",
  };
}

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const notifications = useNotificationStore((state) => state.notifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-text-main">
      <div className="fixed top-4 right-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-2">
        {notifications.map((n) => {
          const style = getToastStyle(n.type);
          return (
            <div
              key={n.id}
              className={`rounded border-2 px-3.5 py-2.5 backdrop-blur-sm ${style.wrapper}`}
            >
              <div className="flex items-start gap-2.5">
                <span className={`material-symbols-outlined text-[20px] leading-5 ${style.iconColor}`}>{style.icon}</span>
                <div className="min-w-0 flex-1">
                  {n.title ? <p className="text-xs font-black mb-0.5">{n.title}</p> : null}
                  <p className="text-xs font-medium whitespace-pre-wrap break-words">{n.message}</p>
                </div>
                {n.dismissible ? (
                  <button
                    type="button"
                    onClick={() => removeNotification(n.id)}
                    className="p-0.5 rounded text-text-muted hover:text-text-main hover:bg-surface-2"
                    aria-label="Dismiss notification"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Sidebar - Mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform lg:hidden transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex flex-col flex-1 h-full min-w-0 relative transition-colors duration-200 isolate">
        <Header key={pathname} onMenuClick={() => setSidebarOpen(true)} />
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${pathname === "/dashboard/basic-chat" ? "" : "p-6 lg:p-8"} ${pathname === "/dashboard/basic-chat" ? "flex flex-col overflow-hidden" : ""}`}>
          <div className={`${pathname === "/dashboard/basic-chat" ? "flex-1 w-full h-full flex flex-col" : "max-w-7xl mx-auto"}`}>{children}</div>
        </div>
      </main>
    </div>
  );
}
