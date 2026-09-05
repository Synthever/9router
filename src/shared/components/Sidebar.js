"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG, UPDATER_CONFIG } from "@/shared/constants/config";
import { MEDIA_PROVIDER_KINDS } from "@/shared/constants/providers";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import Button from "./Button";
import { ConfirmModal } from "./Modal";
import NineRemotePromoModal from "./NineRemotePromoModal";

const VISIBLE_MEDIA_KINDS = ["embedding", "image", "video", "tts", "stt"];
const COMBINED_WEB_ITEM = { id: "web", label: "Web Fetch & Search", icon: "travel_explore", href: "/dashboard/media-providers/web" };

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/endpoint", label: "Endpoint & Key", icon: "api" },
  { href: "/dashboard/providers", label: "Providers", icon: "dns" },
  { href: "/dashboard/combos", label: "Combo & Vision Adapter", icon: "layers" },
  { href: "/dashboard/usage", label: "Usage", icon: "bar_chart" },
  { href: "/dashboard/quota", label: "Quota Tracker", icon: "data_usage" },
  { href: "/dashboard/token-saver", label: "Token Saver", icon: "savings" },
  { href: "/dashboard/cli-tools", label: "CLI Tools", icon: "terminal" },
];

const debugItems = [
  { href: "/dashboard/console-log", label: "Console Log", icon: "terminal" },
  { href: "/dashboard/translator", label: "Translator", icon: "translate" },
];

const systemItems = [
  { href: "/dashboard/proxy-pools", label: "Proxy Pools", icon: "lan" },
  { href: "/dashboard/skills", label: "Skills", icon: "extension" },
];

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [shutdownCountdown, setShutdownCountdown] = useState(0);
  const [enableTranslator, setEnableTranslator] = useState(false);
  const { copied, copy } = useCopyToClipboard(2000);

  const INSTALL_CMD = UPDATER_CONFIG.installCmdLatest;

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => { if (data.enableTranslator) setEnableTranslator(true); })
      .catch(() => {});
  }, []);

  // Lazy check for new npm version on mount
  useEffect(() => {
    fetch("/api/version")
      .then(res => res.json())
      .then(data => { if (data.hasUpdate) setUpdateInfo(data); })
      .catch(() => {});
  }, []);

  const isActive = (href) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (href === "/dashboard/endpoint") {
      return pathname.startsWith("/dashboard/endpoint");
    }
    return pathname.startsWith(href);
  };

  const handleUpdate = () => {
    setShowUpdateModal(false);
    setIsUpdating(true);
  };

  const handleCopyAndShutdown = async () => {
    try { await navigator.clipboard.writeText(INSTALL_CMD); } catch { /* clipboard blocked */ }
    copy(INSTALL_CMD);
    let remaining = UPDATER_CONFIG.shutdownCountdownSec;
    setShutdownCountdown(remaining);
    const timer = setInterval(() => {
      remaining -= 1;
      setShutdownCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        fetch("/api/version/shutdown", { method: "POST" }).catch(() => {});
        setIsDisconnected(true);
      }
    }, 1000);
  };

  const handleCancelUpdate = () => {
    setIsUpdating(false);
    setShutdownCountdown(0);
  };

  return (
    <>
      <aside className="flex w-72 flex-col border-r-2 border-border bg-sidebar transition-colors duration-200 min-h-full">
        {/* Traffic lights */}
        <div className="flex items-center gap-2 px-6 pt-5 pb-2">
          <div className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] border border-border" />
          <div className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] border border-border" />
          <div className="w-3.5 h-3.5 rounded-full bg-[#27C93F] border border-border" />
        </div>

        {/* Logo */}
        <div className="px-6 py-4 flex flex-col gap-2">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center size-9 rounded border-2 border-border bg-brand-500 shadow-[2px_2px_0px_var(--color-border)] group-hover:translate-x-[-1px] group-hover:translate-y-[-1px] transition-transform">
              <span className="material-symbols-outlined text-white text-[20px]">hub</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tight text-text-main">
                {APP_CONFIG.name}
              </h1>
              <span className="text-xs font-mono text-text-muted">v{APP_CONFIG.version}</span>
            </div>
          </Link>
          {updateInfo && (
            <div className="flex flex-col gap-1.5 rounded border-2 border-border bg-surface p-2 shadow-[2px_2px_0px_var(--color-border)]">
              <span className="text-xs font-bold text-success">
                ↑ New update: v{updateInfo.latestVersion}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="px-2 py-1 rounded border border-border bg-success text-white text-[11px] font-bold shadow-[1px_1px_0px_var(--color-border)] cursor-pointer"
                >
                  Update now
                </button>
                <button
                  onClick={() => copy(INSTALL_CMD)}
                  title="Copy install command"
                  className="flex-1 text-left hover:opacity-80 transition-opacity cursor-pointer min-w-0"
                >
                  <code className="block text-[10px] text-text-muted font-mono truncate">
                    {copied ? "✓ copied!" : INSTALL_CMD}
                  </code>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-1.5 rounded font-bold text-[13px] border-2 transition-all group",
                isActive(item.href)
                  ? "bg-brand-500 text-white border-border shadow-[2px_2px_0px_var(--color-border)]"
                  : "border-transparent text-text-muted hover:text-text-main hover:bg-surface-2 hover:border-border/50"
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[18px]",
                  isActive(item.href) ? "fill-1" : "group-hover:text-brand-500 transition-colors"
                )}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}

          {/* System section */}
          <div className="pt-3 mt-2 space-y-1">
            <p className="px-3 text-[11px] font-black text-text-muted uppercase tracking-wider mb-2">
              System
            </p>

            {/* Media Providers accordion */}
            <button
              onClick={() => setMediaOpen((v) => !v)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-1.5 rounded font-bold text-[13px] border-2 transition-all group",
                pathname.startsWith("/dashboard/media-providers")
                  ? "bg-brand-500 text-white border-border shadow-[2px_2px_0px_var(--color-border)]"
                  : "border-transparent text-text-muted hover:text-text-main hover:bg-surface-2 hover:border-border/50"
              )}
            >
              <span className="material-symbols-outlined text-[18px]">perm_media</span>
              <span className="flex-1 text-left">Media Providers</span>
              <span className="material-symbols-outlined text-[14px] transition-transform" style={{ transform: mediaOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                expand_more
              </span>
            </button>
            {mediaOpen && (
              <div className="pl-4 space-y-1 mt-1 border-l-2 border-border/40 ml-2">
                {MEDIA_PROVIDER_KINDS.filter((k) => VISIBLE_MEDIA_KINDS.includes(k.id)).map((kind) => (
                  <Link
                    key={kind.id}
                    href={`/dashboard/media-providers/${kind.id}`}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1 rounded font-medium text-xs border transition-all",
                      pathname.startsWith(`/dashboard/media-providers/${kind.id}`)
                        ? "bg-surface text-brand-500 border-border font-bold shadow-[1px_1px_0px_var(--color-border)]"
                        : "border-transparent text-text-muted hover:text-text-main hover:bg-surface-2"
                    )}
                  >
                    <span className="material-symbols-outlined text-[15px]">{kind.icon}</span>
                    <span>{kind.label}</span>
                  </Link>
                ))}
                <Link
                  key={COMBINED_WEB_ITEM.id}
                  href={COMBINED_WEB_ITEM.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-1 rounded font-medium text-xs border transition-all",
                    pathname.startsWith(COMBINED_WEB_ITEM.href)
                      ? "bg-surface text-brand-500 border-border font-bold shadow-[1px_1px_0px_var(--color-border)]"
                      : "border-transparent text-text-muted hover:text-text-main hover:bg-surface-2"
                  )}
                >
                  <span className="material-symbols-outlined text-[15px]">{COMBINED_WEB_ITEM.icon}</span>
                  <span>{COMBINED_WEB_ITEM.label}</span>
                </Link>
              </div>
            )}

            {systemItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-1.5 rounded font-bold text-[13px] border-2 transition-all group",
                  isActive(item.href)
                    ? "bg-brand-500 text-white border-border shadow-[2px_2px_0px_var(--color-border)]"
                    : "border-transparent text-text-muted hover:text-text-main hover:bg-surface-2 hover:border-border/50"
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined text-[18px]",
                    isActive(item.href) ? "fill-1" : "group-hover:text-brand-500 transition-colors"
                  )}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}

            {enableTranslator && (
              <div className="pt-2">
                <p className="px-3 text-[11px] font-black text-text-muted uppercase tracking-wider mb-2">
                  Debug
                </p>
                {debugItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-1.5 rounded font-bold text-[13px] border-2 transition-all group",
                      isActive(item.href)
                        ? "bg-brand-500 text-white border-border shadow-[2px_2px_0px_var(--color-border)]"
                        : "border-transparent text-text-muted hover:text-text-main hover:bg-surface-2 hover:border-border/50"
                    )}
                  >
                    <span
                      className={cn(
                        "material-symbols-outlined text-[18px]",
                        isActive(item.href) ? "fill-1" : "group-hover:text-brand-500 transition-colors"
                      )}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Footer info & promo button */}
        <div className="p-4 border-t-2 border-border bg-surface-2 flex flex-col gap-2">
          <Link
            href="/dashboard/profile"
            onClick={onClose}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded font-bold text-xs border-2 border-border bg-surface shadow-[2px_2px_0px_var(--color-border)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all",
              pathname.startsWith("/dashboard/profile") && "bg-brand-500 text-white"
            )}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">settings</span>
              <span>Settings</span>
            </span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>
      </aside>

      {showUpdateModal && (
        <ConfirmModal
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          onConfirm={handleUpdate}
          title="Update Available"
          message={`A new version (${updateInfo?.latestVersion}) is available. Would you like to view update instructions?`}
          confirmText="View Instructions"
          variant="primary"
        />
      )}
    </>
  );
}

Sidebar.propTypes = {
  onClose: PropTypes.func,
};
