"use client";

import { useEffect, useState, useCallback } from "react";
import { useUserAuth } from "../UserAuthContext";
import { Card, Button, SegmentedControl, Input } from "@/shared/components";

function fmt(n) {
  if (n === null || n === undefined) return "0";
  return Number(n).toLocaleString();
}

function fmtCost(c) {
  if (c === null || c === undefined) return "$0.0000";
  return `$${Number(c).toFixed(4)}`;
}

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
  { value: "all", label: "All Time" },
];

export default function UserUsagePage() {
  const { apiKey } = useUserAuth();
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modelSearch, setModelSearch] = useState("");

  const fetchUsage = useCallback(async () => {
    if (!apiKey) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/user/usage?period=${period}`, {
        headers: { "x-api-key": apiKey },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to fetch usage:", e);
    } finally {
      setLoading(false);
    }
  }, [apiKey, period]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const summary = data?.summary || {};
  const models = data?.models || {};
  const endpoints = data?.endpoints || {};
  const recentRequests = data?.recentRequests || [];

  const filteredModels = Object.entries(models).filter(([name]) =>
    name.toLowerCase().includes(modelSearch.toLowerCase().trim())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Usage Analytics</h1>
          <p className="text-xs text-text-muted mt-0.5">Track your API consumption, token distribution, and latency logs</p>
        </div>

        <div className="flex items-center gap-2">
          <SegmentedControl
            options={PERIODS}
            value={period}
            onChange={setPeriod}
            size="sm"
          />
          <Button variant="secondary" size="sm" icon="refresh" onClick={fetchUsage} disabled={loading} />
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 border-2 border-border shadow-[3px_3px_0px_var(--color-border)] flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">send</span>
            Total Requests
          </span>
          <span className="text-2xl font-bold font-mono text-text-main">{fmt(summary.totalRequests)}</span>
        </Card>

        <Card className="p-4 border-2 border-border shadow-[3px_3px_0px_var(--color-border)] flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">data_usage</span>
            Total Tokens
          </span>
          <span className="text-2xl font-bold font-mono text-primary">{fmt(summary.totalTokens)}</span>
          <span className="text-[11px] text-text-muted truncate">
            {fmt(summary.totalPromptTokens)} In • {fmt(summary.totalCompletionTokens)} Out
          </span>
        </Card>

        <Card className="p-4 border-2 border-border shadow-[3px_3px_0px_var(--color-border)] flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">memory</span>
            Cached Tokens
          </span>
          <span className="text-2xl font-bold font-mono text-text-main">{fmt(summary.totalCachedTokens)}</span>
          <span className="text-[11px] text-text-muted">Prompt Cache Saved</span>
        </Card>

        <Card className="p-4 border-2 border-border shadow-[3px_3px_0px_var(--color-border)] flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-success">payments</span>
            Estimated Cost
          </span>
          <span className="text-2xl font-bold font-mono text-success">{fmtCost(summary.totalCost)}</span>
        </Card>
      </div>

      {/* Model & Endpoint Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Breakdown (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-text-main flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">view_in_ar</span>
              Usage by Model
            </h2>
            <div className="w-48">
              <Input
                placeholder="Search model..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
              />
            </div>
          </div>

          <Card className="overflow-hidden border-2 border-border shadow-[3px_3px_0px_var(--color-border)]" padding="none">
            {filteredModels.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted">No usage recorded for this model or period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-2 border-b-2 border-border text-text-muted uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Model Name</th>
                      <th className="py-3 px-4 text-right">Requests</th>
                      <th className="py-3 px-4 text-right">Input / Cached</th>
                      <th className="py-3 px-4 text-right">Output</th>
                      <th className="py-3 px-4 text-right">Total Tokens</th>
                      <th className="py-3 px-4 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {filteredModels.map(([name, m]) => (
                      <tr key={name} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-sans font-bold text-text-main truncate max-w-[180px]" title={name}>
                          {name}
                        </td>
                        <td className="py-3 px-4 text-right text-text-main">{fmt(m.requests)}</td>
                        <td className="py-3 px-4 text-right text-text-muted">
                          {fmt(m.promptTokens)} <span className="text-[10px] text-primary">({fmt(m.cachedTokens)})</span>
                        </td>
                        <td className="py-3 px-4 text-right text-text-main">{fmt(m.completionTokens)}</td>
                        <td className="py-3 px-4 text-right font-bold text-primary">{fmt(m.tokens)}</td>
                        <td className="py-3 px-4 text-right font-bold text-success">{fmtCost(m.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Modality & Endpoint Breakdown (1 col) */}
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-text-main flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
            Modality Breakdown
          </h2>

          <Card className="overflow-hidden border-2 border-border shadow-[3px_3px_0px_var(--color-border)]" padding="none">
            {Object.keys(endpoints).length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted">No modality usage recorded yet.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 border-b-2 border-border text-text-muted uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Endpoint</th>
                    <th className="py-3 px-4 text-right">Reqs</th>
                    <th className="py-3 px-4 text-right">Tokens</th>
                    <th className="py-3 px-4 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {Object.entries(endpoints).map(([ep, item]) => (
                    <tr key={ep} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-sans font-bold uppercase text-primary">{ep}</td>
                      <td className="py-3 px-4 text-right text-text-main">{fmt(item.requests)}</td>
                      <td className="py-3 px-4 text-right text-text-main">{fmt(item.tokens)}</td>
                      <td className="py-3 px-4 text-right font-bold text-success">{fmtCost(item.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>

      {/* Recent Request History */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-text-main flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">history</span>
          Recent Request Log (Latest 50)
        </h2>

        <Card className="overflow-hidden border-2 border-border shadow-[3px_3px_0px_var(--color-border)]" padding="none">
          {recentRequests.length === 0 ? (
            <div className="py-12 text-center text-xs text-text-muted">No recent requests recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 border-b-2 border-border text-text-muted uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4 w-6"></th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Model</th>
                    <th className="py-3 px-4">Endpoint</th>
                    <th className="py-3 px-4 text-right">In Tokens</th>
                    <th className="py-3 px-4 text-right">Out Tokens</th>
                    <th className="py-3 px-4 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {recentRequests.map((r, i) => {
                    const isOk = !r.status || r.status === "ok" || r.status === "success";
                    return (
                      <tr key={i} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <span className={`block w-2 h-2 rounded-full ${isOk ? "bg-success" : "bg-red-500"}`} />
                        </td>
                        <td className="py-3 px-4 font-sans text-text-muted whitespace-nowrap">
                          {new Date(r.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-text-main truncate max-w-[200px]" title={r.model}>
                          {r.model}
                        </td>
                        <td className="py-3 px-4 uppercase text-[10px] font-bold text-primary font-sans">{r.endpoint || "chat"}</td>
                        <td className="py-3 px-4 text-right text-text-muted">{fmt(r.promptTokens)}</td>
                        <td className="py-3 px-4 text-right text-text-main">{fmt(r.completionTokens)}</td>
                        <td className="py-3 px-4 text-right font-bold text-success">{fmtCost(r.cost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
