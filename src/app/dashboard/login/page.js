"use client";

import { useState, useEffect } from "react";
import { Card, Button, Input } from "@/shared/components";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetHint, setResetHint] = useState("");
  const [retryAfter, setRetryAfter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(null);
  const [authMode, setAuthMode] = useState("password");
  const [ssoType, setSsoType] = useState("oidc");
  const [oidcConfigured, setOidcConfigured] = useState(false);
  const [oidcLoginLabel, setOidcLoginLabel] = useState("Sign in with OIDC");
  const [samlConfigured, setSamlConfigured] = useState(false);
  const [samlLoginLabel, setSamlLoginLabel] = useState("Sign in with SAML SSO");
  const [mustChange, setMustChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Countdown for rate-limit
  useEffect(() => {
    if (retryAfter <= 0) return;
    const id = setInterval(() => setRetryAfter((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [retryAfter]);

  useEffect(() => {
    async function checkAuth() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

      try {
        const res = await fetch(`${baseUrl}/api/auth/status`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated === true || data.requireLogin === false) {
            window.location.assign("/dashboard");
            return;
          }
          setHasPassword(!!data.hasPassword);
          setAuthMode(data.authMode || "password");
          setSsoType(data.ssoType || "oidc");
          setOidcConfigured(data.oidcConfigured === true);
          setOidcLoginLabel(data.oidcLoginLabel || "Sign in with OIDC");
          setSamlConfigured(data.samlConfigured === true);
          setSamlLoginLabel(data.samlLoginLabel || "Sign in with SAML SSO");
        } else {
          setHasPassword(true);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        setHasPassword(true);
      }
    }
    checkAuth();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResetHint("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.mustChangePassword) {
          setMustChange(true);
          return;
        }
        window.location.assign("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Invalid password");
        if (data.resetHint) setResetHint(data.resetHint);
        if (data.retryAfter) setRetryAfter(Number(data.retryAfter));
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, newPassword }),
      });

      if (res.ok) {
        window.location.assign("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-brand-500 text-white mb-3 shadow-[4px_4px_0px_var(--color-border)] border-2 border-border">
            <span className="material-symbols-outlined text-[36px]">shield_person</span>
          </div>
          <h1 className="text-2xl font-black text-text-main tracking-tight">9Router Admin Portal</h1>
          <p className="text-sm text-text-muted mt-1">Administrator authentication gateway</p>
        </div>

        {/* Card */}
        <Card className="p-6 border-2 border-border shadow-[6px_6px_0px_var(--color-border)]">
          {mustChange ? (
            <form onSubmit={handleSetNewPassword} className="flex flex-col gap-4">
              <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded p-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
                Default password detected. Please set a new secure password to proceed.
              </div>
              <Input
                label="New Password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                autoFocus
                required
              />
              <Button type="submit" disabled={loading || !newPassword.trim()} className="w-full mt-2" size="lg">
                {loading ? "Updating Password..." : "Save & Access Dashboard"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <Input
                label="Admin Password"
                type="password"
                placeholder="Enter dashboard master password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || retryAfter > 0}
                autoFocus
                error={error}
                hint={
                  resetHint ||
                  (retryAfter > 0
                    ? `Too many failed attempts. Try again in ${retryAfter}s.`
                    : "Enter master admin password to access infrastructure dashboard")
                }
              />

              <Button
                type="submit"
                disabled={loading || !password.trim() || retryAfter > 0}
                className="w-full mt-2"
                size="lg"
              >
                {loading ? "Authenticating..." : retryAfter > 0 ? `Locked (${retryAfter}s)` : "Sign In to Admin"}
              </Button>

              {authMode === "sso" && oidcConfigured && (
                <div className="pt-3 border-t-2 border-border flex flex-col gap-2">
                  <a
                    href="/api/auth/oidc/start"
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded border-2 border-border bg-surface-2 text-text-main font-bold text-sm shadow-[2px_2px_0px_var(--color-border)] hover:bg-brand-500 hover:text-white transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">lock_open</span>
                    {oidcLoginLabel}
                  </a>
                </div>
              )}

              {authMode === "sso" && samlConfigured && (
                <div className="pt-3 border-t-2 border-border flex flex-col gap-2">
                  <a
                    href="/api/auth/saml/start"
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded border-2 border-border bg-surface-2 text-text-main font-bold text-sm shadow-[2px_2px_0px_var(--color-border)] hover:bg-brand-500 hover:text-white transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">vpn_key</span>
                    {samlLoginLabel}
                  </a>
                </div>
              )}
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
