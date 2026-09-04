"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, Badge, Button, Input, Modal } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import ApiKeyConfigModal from "@/app/(dashboard)/dashboard/endpoint/components/ApiKeyConfigModal";

function fmt(n) {
  if (n === null || n === undefined) return "0";
  return Number(n).toLocaleString();
}

function fmtCost(c) {
  if (c === null || c === undefined) return "$0.0000";
  return `$${Number(c).toFixed(4)}`;
}

function timeAgo(timestamp) {
  if (!timestamp) return "Never";
  const diff = Math.floor((Date.now() - new Date(timestamp)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ApiKeysUsageTab({ period = "7d" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [selectedKeyForConfig, setSelectedKeyForConfig] = useState(null);
  const { copied, copy } = useCopyToClipboard();

  const fetchKeyUsage = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/usage/keys?period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load API key usage:", e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchKeyUsage();
  }, [fetchKeyUsage]);

  const toggleExpand = (id) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredKeys = useMemo(() => {
    if (!data?.keys) return [];
    if (!search.trim()) return data.keys;
    const q = search.toLowerCase().trim();
    return data.keys.filter((k) =>
      (k.name || "").toLowerCase().includes(q) ||
      (k.key || "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const handleUpdateKeyConfig = async (payload) => {
    try {
      const res = await fetch(`/api/keys/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchKeyUsage();
      }
    } catch (e) {
      console.error("Failed to update key config:", e);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted">
        <span className="material-symbols-outlined text-[32px] animate-spin">progress_activity</span>
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Cards for Keys */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 flex flex-col gap-1 border-2 border-border shadow-[3px_3px_0px_var(--color-border)]">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">vpn_key</span>
            Active Keys
          </span>
          <div className="text-2xl font-bold text-text-main flex items-baseline gap-1.5">
            <span>{summary.activeKeys ?? 0}</span>
            <span className="text-xs font-normal text-text-muted">/ {summary.totalKeys ?? 0} registered</span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-1 border-2 border-border shadow-[3px_3px_0px_var(--color-border)]">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">send</span>
            Period Requests
          </span>
          <div className="text-2xl font-bold text-text-main">
            {fmt(summary.totalRequests)}
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-1 border-2 border-border shadow-[3px_3px_0px_var(--color-border)]">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">data_usage</span>
            Total Tokens
          </span>
          <div className="text-2xl font-bold text-text-main">
            {fmt(summary.totalTokens)}
          </div>
          <span className="text-[11px] text-text-muted truncate">
            {fmt(summary.totalPromptTokens)} In • {fmt(summary.totalCompletionTokens)} Out
          </span>
        </Card>

        <Card className="p-4 flex flex-col gap-1 border-2 border-border shadow-[3px_3px_0px_var(--color-border)]">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">payments</span>
            Estimated Cost
          </span>
          <div className="text-2xl font-bold text-text-main">
            {fmtCost(summary.totalCost)}
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            icon="search"
            placeholder="Search API Key name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon="refresh"
          onClick={fetchKeyUsage}
          disabled={loading}
        >
          Refresh Data
        </Button>
      </div>

      {/* Keys Usage List / Table */}
      <div className="flex flex-col gap-3">
        {filteredKeys.length === 0 ? (
          <Card className="py-12 text-center text-text-muted border-2 border-border">
            No API key usage found for this period.
          </Card>
        ) : (
          filteredKeys.map((k) => {
            const isExpanded = expandedKeys.has(k.id);
            const quotaTokens = k.config?.maxTokens ? Number(k.config.maxTokens) : null;
            const quotaCost = k.config?.maxCost ? Number(k.config.maxCost) : null;
            const tokenPercent = quotaTokens ? Math.min(100, (k.totalTokens / quotaTokens) * 100) : null;
            const costPercent = quotaCost ? Math.min(100, (k.cost / quotaCost) * 100) : null;

            return (
              <Card
                key={k.id}
                className="overflow-hidden border-2 border-border shadow-[3px_3px_0px_var(--color-border)] transition-all"
                padding="none"
              >
                {/* Key Summary Header Bar */}
                <div
                  className="p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  onClick={() => toggleExpand(k.id)}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <button
                      type="button"
                      className="mt-0.5 sm:mt-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-text-muted shrink-0"
                    >
                      <span
                        className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${
                          isExpanded ? "rotate-90 text-primary" : ""
                        }`}
                      >
                        chevron_right
                      </span>
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base text-text-main truncate">{k.name}</span>
                        {k.isActive === false && (
                          <Badge variant="warning" size="sm">Paused</Badge>
                        )}
                        {k.key && (
                          <code className="text-xs text-text-muted font-mono bg-black/[0.04] dark:bg-white/[0.04] px-1.5 py-0.5 rounded border border-border">
                            {k.key.slice(0, 8)}...{k.key.slice(-4)}
                          </code>
                        )}
                        {k.config?.resetPeriod && k.config.resetPeriod !== "none" && (
                          <Badge variant="neutral" size="sm" className="capitalize">
                            {k.config.resetPeriod} reset
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mt-1">
                        <span>Last used: <b>{timeAgo(k.lastUsed)}</b></span>
                        {k.createdAt && (
                          <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metrics Badges / Grid */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 self-start lg:self-center shrink-0 pl-8 lg:pl-0">
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Requests</span>
                      <span className="text-sm font-bold font-mono text-text-main">{fmt(k.totalRequests)}</span>
                    </div>

                    <div className="flex flex-col text-right min-w-28">
                      <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Total Tokens</span>
                      <span className="text-sm font-bold font-mono text-primary">{fmt(k.totalTokens)}</span>
                      {quotaTokens && (
                        <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${tokenPercent >= 90 ? "bg-red-500" : tokenPercent >= 70 ? "bg-amber-500" : "bg-primary"}`}
                            style={{ width: `${tokenPercent}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col text-right min-w-24">
                      <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Cost</span>
                      <span className="text-sm font-bold font-mono text-success">{fmtCost(k.cost)}</span>
                      {quotaCost && (
                        <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${costPercent >= 90 ? "bg-red-500" : costPercent >= 70 ? "bg-amber-500" : "bg-success"}`}
                            style={{ width: `${costPercent}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {k.id !== "unauthenticated" && (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedKeyForConfig(k)}
                          className="p-1.5 hover:bg-primary/10 rounded-lg text-text-muted hover:text-primary transition-colors"
                          title="Key Settings & Limits"
                        >
                          <span className="material-symbols-outlined text-[18px]">tune</span>
                        </button>
                        {k.key && (
                          <button
                            onClick={() => copy(k.key, k.id)}
                            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-text-muted hover:text-primary transition-colors"
                            title="Copy API Key"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {copied === k.id ? "check" : "content_copy"}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Detailed Usage Breakdown */}
                {isExpanded && (
                  <div className="border-t-2 border-border bg-surface-2 p-4 sm:p-6 flex flex-col gap-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Breakdown by Model */}
                      <div className="flex flex-col gap-2 bg-surface p-3.5 rounded border-2 border-border">
                        <span className="text-xs font-bold uppercase tracking-wider text-text-main flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-primary">view_in_ar</span>
                          Model Usage Breakdown
                        </span>
                        {Object.keys(k.models || {}).length === 0 ? (
                          <span className="text-xs text-text-muted py-2">No model activity recorded.</span>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="border-b border-border text-text-muted">
                                  <th className="py-1.5 font-semibold">Model</th>
                                  <th className="py-1.5 text-right font-semibold">Reqs</th>
                                  <th className="py-1.5 text-right font-semibold">Tokens</th>
                                  <th className="py-1.5 text-right font-semibold">Cost</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40 font-mono">
                                {Object.entries(k.models).map(([modelName, m]) => (
                                  <tr key={modelName} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                                    <td className="py-1.5 font-sans font-medium truncate max-w-[140px]" title={modelName}>
                                      {modelName}
                                    </td>
                                    <td className="py-1.5 text-right text-text-muted">{fmt(m.requests)}</td>
                                    <td className="py-1.5 text-right text-primary">{fmt(m.tokens)}</td>
                                    <td className="py-1.5 text-right text-success">{fmtCost(m.cost)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Breakdown by Endpoint / Modality */}
                      <div className="flex flex-col gap-2 bg-surface p-3.5 rounded border-2 border-border">
                        <span className="text-xs font-bold uppercase tracking-wider text-text-main flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-primary">hub</span>
                          Modality & Endpoint Breakdown
                        </span>
                        {Object.keys(k.endpoints || {}).length === 0 ? (
                          <span className="text-xs text-text-muted py-2">No endpoint activity recorded.</span>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="border-b border-border text-text-muted">
                                  <th className="py-1.5 font-semibold">Endpoint</th>
                                  <th className="py-1.5 text-right font-semibold">Reqs</th>
                                  <th className="py-1.5 text-right font-semibold">Tokens</th>
                                  <th className="py-1.5 text-right font-semibold">Cost</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40 font-mono">
                                {Object.entries(k.endpoints).map(([epName, ep]) => (
                                  <tr key={epName} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                                    <td className="py-1.5 font-sans font-medium uppercase text-text-main">
                                      {epName}
                                    </td>
                                    <td className="py-1.5 text-right text-text-muted">{fmt(ep.requests)}</td>
                                    <td className="py-1.5 text-right text-primary">{fmt(ep.tokens)}</td>
                                    <td className="py-1.5 text-right text-success">{fmtCost(ep.cost)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Token Breakdown Details (Prompt vs Cached vs Completion) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border text-xs">
                      <div className="flex flex-col">
                        <span className="text-text-muted font-medium">Input Tokens:</span>
                        <span className="font-mono font-bold text-text-main">{fmt(k.promptTokens)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-text-muted font-medium">Cached Tokens:</span>
                        <span className="font-mono font-bold text-text-main">{fmt(k.cachedTokens)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-text-muted font-medium">Output Tokens:</span>
                        <span className="font-mono font-bold text-text-main">{fmt(k.completionTokens)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-text-muted font-medium">Token Multiplier:</span>
                        <span className="font-mono font-bold text-text-main">{k.config?.multiplier ?? "1.0"}x</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Key Config Modal */}
      {selectedKeyForConfig && (
        <ApiKeyConfigModal
          isOpen={!!selectedKeyForConfig}
          apiKey={selectedKeyForConfig}
          onClose={() => setSelectedKeyForConfig(null)}
          onSave={handleUpdateKeyConfig}
        />
      )}
    </div>
  );
}
