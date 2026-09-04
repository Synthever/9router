"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUserAuth } from "../UserAuthContext";
import { Card, Badge, Button } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

function fmt(n) {
  if (n === null || n === undefined) return "0";
  return Number(n).toLocaleString();
}

function fmtCost(c) {
  if (c === null || c === undefined) return "$0.0000";
  return `$${Number(c).toFixed(4)}`;
}

export default function UserDashboardPage() {
  const { apiKey, userInfo, refreshUserInfo, loading } = useUserAuth();
  const { copied, copy } = useCopyToClipboard();
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    refreshUserInfo();
  }, [refreshUserInfo]);

  if (loading && !userInfo) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <span className="material-symbols-outlined text-[32px] animate-spin">progress_activity</span>
      </div>
    );
  }

  const gov = userInfo?.governance || {};
  const current = userInfo?.currentCycleUsage || {};
  const lifetime = userInfo?.lifetimeUsage || {};
  const keyInfo = userInfo?.key || {};

  // Token Quota calculations
  const maxTokens = gov.maxTokens;
  const remainingTokens = gov.remainingTokens;
  const tokenUsed = current.totalTokens || 0;
  const tokenPercent = maxTokens ? Math.min(100, (tokenUsed / maxTokens) * 100) : null;

  // Cost Quota calculations
  const maxCost = gov.maxCost;
  const remainingCost = gov.remainingCost;
  const costUsed = current.cost || 0;
  const costPercent = maxCost ? Math.min(100, (costUsed / maxCost) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome & Status Banner */}
      <div className="bg-surface border-2 border-border p-6 rounded-lg shadow-[4px_4px_0px_var(--color-border)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-text-main">{keyInfo.name}</h1>
            {keyInfo.isActive ? (
              <Badge variant="success" size="sm">Active</Badge>
            ) : (
              <Badge variant="warning" size="sm">Paused / Suspended</Badge>
            )}
            {keyInfo.isExpired && (
              <Badge variant="danger" size="sm">Expired</Badge>
            )}
          </div>
          <p className="text-sm text-text-muted">
            Quota cycle: <b className="capitalize text-text-main">{gov.resetPeriod || "Lifetime"}</b>
            {keyInfo.expiresAt && ` • Expires: ${new Date(keyInfo.expiresAt).toLocaleDateString()}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={copied === "my_key" ? "check" : "content_copy"}
            onClick={() => copy(apiKey, "my_key")}
          >
            {copied === "my_key" ? "API Key Copied" : "Copy API Key"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon="refresh"
            onClick={() => refreshUserInfo()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Quota & Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Token Balance Card */}
        <Card className="p-5 border-2 border-border shadow-[4px_4px_0px_var(--color-border)] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">toll</span>
              Token Quota & Remaining
            </span>
            <span className="text-xs font-semibold text-text-muted capitalize">{gov.resetPeriod} cycle</span>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-3xl font-extrabold font-mono text-text-main">
                {maxTokens ? fmt(remainingTokens) : "Unlimited"}
              </span>
              <span className="text-xs text-text-muted font-mono">
                {maxTokens ? `${fmt(tokenUsed)} / ${fmt(maxTokens)} used` : `${fmt(tokenUsed)} tokens used`}
              </span>
            </div>

            {maxTokens && (
              <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    tokenPercent >= 90 ? "bg-red-500" : tokenPercent >= 70 ? "bg-amber-500" : "bg-primary"
                  }`}
                  style={{ width: `${tokenPercent}%` }}
                />
              </div>
            )}
          </div>

          <div className="text-xs text-text-muted flex items-center justify-between pt-2 border-t border-border">
            <span>Lifetime total: <b>{fmt(lifetime.totalTokens)}</b> tokens</span>
            <span>{maxTokens ? `${(100 - tokenPercent).toFixed(1)}% remaining` : "No limit"}</span>
          </div>
        </Card>

        {/* Cost / Budget Card */}
        <Card className="p-5 border-2 border-border shadow-[4px_4px_0px_var(--color-border)] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-success">payments</span>
              Budget & Cost Remaining
            </span>
            <span className="text-xs font-semibold text-text-muted capitalize">{gov.resetPeriod} cycle</span>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-3xl font-extrabold font-mono text-success">
                {maxCost ? fmtCost(remainingCost) : "Unlimited"}
              </span>
              <span className="text-xs text-text-muted font-mono">
                {maxCost ? `${fmtCost(costUsed)} / ${fmtCost(maxCost)} used` : `${fmtCost(costUsed)} used`}
              </span>
            </div>

            {maxCost && (
              <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    costPercent >= 90 ? "bg-red-500" : costPercent >= 70 ? "bg-amber-500" : "bg-success"
                  }`}
                  style={{ width: `${costPercent}%` }}
                />
              </div>
            )}
          </div>

          <div className="text-xs text-text-muted flex items-center justify-between pt-2 border-t border-border">
            <span>Lifetime cost: <b>{fmtCost(lifetime.cost)}</b></span>
            <span>{maxCost ? `${(100 - costPercent).toFixed(1)}% remaining` : "No limit"}</span>
          </div>
        </Card>
      </div>

      {/* Governance & Restrictions Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 border-2 border-border shadow-[2px_2px_0px_var(--color-border)] flex flex-col gap-1">
          <span className="text-xs font-bold uppercase text-text-muted flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">speed</span>
            Rate Limits
          </span>
          <span className="text-lg font-bold font-mono text-text-main">
            {gov.rateLimitRpm ? `${gov.rateLimitRpm} RPM` : "Unlimited RPM"}
          </span>
          <span className="text-[11px] text-text-muted">
            {gov.rateLimitTpm ? `${fmt(gov.rateLimitTpm)} TPM` : "Unlimited TPM"}
          </span>
        </Card>

        <Card className="p-4 border-2 border-border shadow-[2px_2px_0px_var(--color-border)] flex flex-col gap-1">
          <span className="text-xs font-bold uppercase text-text-muted flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">vertical_align_top</span>
            Max Output Tokens
          </span>
          <span className="text-lg font-bold font-mono text-text-main">
            {gov.maxTokensPerRequest ? `${fmt(gov.maxTokensPerRequest)}` : "Uncapped"}
          </span>
          <span className="text-[11px] text-text-muted">Per request ceiling</span>
        </Card>

        <Card className="p-4 border-2 border-border shadow-[2px_2px_0px_var(--color-border)] flex flex-col gap-1">
          <span className="text-xs font-bold uppercase text-text-muted flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">percent</span>
            Token Multiplier
          </span>
          <span className="text-lg font-bold font-mono text-text-main">
            {gov.multiplier ?? "1.0"}x
          </span>
          <span className="text-[11px] text-text-muted">Billing usage rate</span>
        </Card>

        <Card className="p-4 border-2 border-border shadow-[2px_2px_0px_var(--color-border)] flex flex-col gap-1">
          <span className="text-xs font-bold uppercase text-text-muted flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">hub</span>
            Allowed Endpoints
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {(gov.allowedEndpoints || []).map((ep) => (
              <span key={ep} className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {ep}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <Link href="/user/usage" className="group">
          <Card className="p-5 border-2 border-border shadow-[3px_3px_0px_var(--color-border)] group-hover:shadow-[5px_5px_0px_var(--color-primary)] transition-all flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-primary text-[28px]">bar_chart</span>
              <span className="material-symbols-outlined text-text-muted group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
            <h3 className="font-bold text-base text-text-main">Detailed Usage History</h3>
            <p className="text-xs text-text-muted">View your breakdown per model, prompt vs cached tokens, and live request logs.</p>
          </Card>
        </Link>

        <Link href="/user/models" className="group">
          <Card className="p-5 border-2 border-border shadow-[3px_3px_0px_var(--color-border)] group-hover:shadow-[5px_5px_0px_var(--color-primary)] transition-all flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-primary text-[28px]">view_in_ar</span>
              <span className="material-symbols-outlined text-text-muted group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
            <h3 className="font-bold text-base text-text-main">Permitted Models</h3>
            <p className="text-xs text-text-muted">Browse all AI models available to your key with their identifiers and capabilities.</p>
          </Card>
        </Link>

        <Link href="/user/docs" className="group">
          <Card className="p-5 border-2 border-border shadow-[3px_3px_0px_var(--color-border)] group-hover:shadow-[5px_5px_0px_var(--color-primary)] transition-all flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-primary text-[28px]">integration_instructions</span>
              <span className="material-symbols-outlined text-text-muted group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
            <h3 className="font-bold text-base text-text-main">Quick Start & Presets</h3>
            <p className="text-xs text-text-muted">Ready-to-use cURL, Python, Next.js, and Cursor/Cline setup snippets with your API key.</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
