"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, Button, Badge, SegmentedControl, CardSkeleton } from "@/shared/components";
import { cn } from "@/shared/utils/cn";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
  { value: "all", label: "All Time" },
];

const CLAUDE_COLORS = [
  "#cc785c", // Primary Coral
  "#5db8a6", // Accent Teal
  "#e8a55a", // Accent Amber
  "#5db872", // Success Green
  "#a9583e", // Primary Active
  "#8e8b82", // Muted Soft
  "#3d3d3a", // Body Ink
  "#c64545", // Error Red
];

const fmtTokens = (n) => {
  if (!n) return "0";
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(2)}B`;
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
};

const fmtCost = (n) => {
  if (!n) return "$0.00";
  if (n < 0.01 && n > 0) return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function DashboardOverview() {
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState("requests"); // "requests" | "tokens" | "cost"

  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard stats:", e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6">
        <CardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const counts = data?.counts || {};
  const timeline = data?.timeline || [];
  const byProvider = data?.byProvider || [];
  const byModel = data?.byModel || [];
  const recentRequests = data?.recentRequests || [];

  return (
    <div className="flex flex-col gap-6 min-w-0">
      {/* Header & Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-text-main">
            Overview Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Real-time proxy routing analytics, upstream performance, and traffic insights
          </p>
        </div>
        <div className="flex items-center gap-2 max-w-full">
          <div className="overflow-x-auto no-scrollbar py-0.5">
            <SegmentedControl
              options={PERIODS}
              value={period}
              onChange={setPeriod}
              size="sm"
              className="no-scrollbar shrink-0"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            icon="refresh"
            onClick={fetchDashboardStats}
            loading={loading}
            title="Refresh statistics"
            className="shrink-0"
          />
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <Card className="border-2 border-border shadow-[3px_3px_0px_var(--color-border)] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Total Requests
            </span>
            <div className="p-1.5 rounded bg-brand-500/10 text-brand-500">
              <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-text-main">
              {(summary.totalRequests || 0).toLocaleString()}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-text-muted">Success Rate</span>
            <span className="font-bold text-success font-mono">{summary.successRate}%</span>
          </div>
        </Card>

        {/* Total Tokens */}
        <Card className="border-2 border-border shadow-[3px_3px_0px_var(--color-border)] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Total Tokens
            </span>
            <div className="p-1.5 rounded bg-[#5db8a6]/10 text-[#5db8a6]">
              <span className="material-symbols-outlined text-[20px]">data_usage</span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-text-main">
              {fmtTokens(summary.totalTokens || 0)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-text-muted">
            <span>In: {fmtTokens(summary.totalPromptTokens || 0)}</span>
            <span>Out: {fmtTokens(summary.totalCompletionTokens || 0)}</span>
          </div>
        </Card>

        {/* Total Cost */}
        <Card className="border-2 border-border shadow-[3px_3px_0px_var(--color-border)] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Estimated Cost
            </span>
            <div className="p-1.5 rounded bg-[#e8a55a]/10 text-[#e8a55a]">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-text-main">
              {fmtCost(summary.totalCost || 0)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-text-muted">Active API Keys</span>
            <span className="font-bold text-text-main font-mono">{counts.activeApiKeys || 0} / {counts.apiKeys || 0}</span>
          </div>
        </Card>

        {/* Active Accounts & Infrastructure */}
        <Card className="border-2 border-border shadow-[3px_3px_0px_var(--color-border)] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Connections & Nodes
            </span>
            <div className="p-1.5 rounded bg-brand-500/10 text-brand-500">
              <span className="material-symbols-outlined text-[20px]">hub</span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-text-main">
              {counts.activeConnections || 0}
            </span>
            <span className="text-xs font-bold text-text-muted">Active Connections</span>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-text-muted">
            <span>{counts.nodes || 0} Nodes</span>
            <span>{counts.combos || 0} Combos</span>
          </div>
        </Card>
      </div>

      {/* Traffic & Volume Trend Chart */}
      <Card className="border-2 border-border shadow-[3px_3px_0px_var(--color-border)] p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-main flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-brand-500">timeline</span>
              Activity & Throughput Over Time
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Time-series breakdown of request volume, token usage, and costs</p>
          </div>
          <div className="inline-flex p-1 rounded border-2 border-border bg-surface-2 shadow-[2px_2px_0px_var(--color-border)] self-start sm:self-auto overflow-x-auto no-scrollbar">
            {["requests", "tokens", "cost"].map((m) => (
              <button
                key={m}
                onClick={() => setChartMetric(m)}
                className={cn(
                  "px-3 py-1 rounded text-xs font-bold capitalize transition-all",
                  chartMetric === m
                    ? "bg-brand-500 text-white border-2 border-border shadow-[1px_1px_0px_var(--color-border)]"
                    : "text-text-muted hover:text-text-main border-2 border-transparent"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          {timeline.length === 0 ? (
            <div className="h-full flex items-center justify-center text-text-muted text-sm">
              No traffic recorded in this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="coralArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#cc785c" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#cc785c" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-border)" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-border)" }}
                  tickFormatter={
                    chartMetric === "tokens"
                      ? fmtTokens
                      : chartMetric === "cost"
                      ? fmtCost
                      : (n) => Number(n).toLocaleString()
                  }
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                    borderWidth: "2px",
                    borderRadius: "4px",
                    boxShadow: "3px 3px 0px var(--color-border)",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [
                    chartMetric === "tokens"
                      ? fmtTokens(value)
                      : chartMetric === "cost"
                      ? fmtCost(value)
                      : `${Number(value).toLocaleString()} reqs`,
                    chartMetric.toUpperCase(),
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey={chartMetric}
                  stroke="#cc785c"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#coralArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Visual Analytics: Top Models Bar Chart & Provider Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Models Bar Chart (2 Cols) */}
        <Card className="lg:col-span-2 border-2 border-border shadow-[3px_3px_0px_var(--color-border)] p-4 sm:p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-main flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#5db8a6]">bar_chart</span>
              Top Models by Volume
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Most queried models and prompt distribution</p>
          </div>

          <div className="h-64 w-full">
            {byModel.length === 0 ? (
              <div className="h-full flex items-center justify-center text-text-muted text-sm">
                No model data recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byModel.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                    tickFormatter={(v) => Number(v).toLocaleString()}
                    axisLine={{ stroke: "var(--color-border)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--color-text-main)", fontWeight: 600 }}
                    width={130}
                    axisLine={{ stroke: "var(--color-border)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-surface)",
                      borderColor: "var(--color-border)",
                      borderWidth: "2px",
                      borderRadius: "4px",
                      boxShadow: "3px 3px 0px var(--color-border)",
                      fontSize: "12px",
                    }}
                    formatter={(value, name, item) => [
                      `${Number(value).toLocaleString()} reqs (${fmtTokens(item.payload.tokens)} tokens)`,
                      item.payload.provider,
                    ]}
                  />
                  <Bar dataKey="count" fill="#5db8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Provider Distribution Donut Chart (1 Col) */}
        <Card className="border-2 border-border shadow-[3px_3px_0px_var(--color-border)] p-4 sm:p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-main flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#e8a55a]">pie_chart</span>
              Provider Distribution
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Traffic share across active upstreams</p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="h-48 w-full flex items-center justify-center">
              {byProvider.length === 0 ? (
                <div className="h-full flex items-center justify-center text-text-muted text-sm">
                  No provider data recorded.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byProvider}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {byProvider.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CLAUDE_COLORS[index % CLAUDE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-surface)",
                        borderColor: "var(--color-border)",
                        borderWidth: "2px",
                        borderRadius: "4px",
                        boxShadow: "3px 3px 0px var(--color-border)",
                        fontSize: "12px",
                      }}
                      formatter={(value, name, item) => [
                        `${Number(value).toLocaleString()} reqs (${fmtTokens(item.payload.tokens)} tokens)`,
                        item.payload.name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Structured Custom Legend (Anti-Overflow & Mobile Friendly) */}
            {byProvider.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-border/50 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                {byProvider.map((p, idx) => {
                  const percent = summary.totalRequests > 0
                    ? ((p.count / summary.totalRequests) * 100).toFixed(1)
                    : "0.0";
                  return (
                    <div key={p.name + idx} className="flex items-center justify-between text-xs gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: CLAUDE_COLORS[idx % CLAUDE_COLORS.length] }}
                        />
                        <span className="font-semibold text-text-main truncate" title={p.name}>
                          {p.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                        <span className="text-text-muted">{p.count} reqs</span>
                        <span className="font-bold text-text-main">({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Live Recent Traffic Table */}
      <Card padding="none" className="border-2 border-border shadow-[3px_3px_0px_var(--color-border)] overflow-hidden">
        <div className="p-4 sm:p-6 border-b-2 border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-main flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-brand-500">history</span>
              Latest Processed Requests
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Most recent upstream completions across all connections</p>
          </div>
          <Link href="/dashboard/usage?tab=details" className="self-start sm:self-auto">
            <Button variant="outline" size="sm" icon="open_in_new">
              View All Details
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b-2 border-border bg-black/[0.02] dark:bg-white/[0.02]">
                <th className="text-left p-3.5 sm:p-4 text-xs font-bold uppercase tracking-wider text-text-main">Timestamp</th>
                <th className="text-left p-3.5 sm:p-4 text-xs font-bold uppercase tracking-wider text-text-main">Model</th>
                <th className="text-left p-3.5 sm:p-4 text-xs font-bold uppercase tracking-wider text-text-main">Provider</th>
                <th className="text-right p-3.5 sm:p-4 text-xs font-bold uppercase tracking-wider text-text-main">Tokens</th>
                <th className="text-right p-3.5 sm:p-4 text-xs font-bold uppercase tracking-wider text-text-main">Est. Cost</th>
                <th className="text-center p-3.5 sm:p-4 text-xs font-bold uppercase tracking-wider text-text-main">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-xs">
              {recentRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-text-muted font-sans">
                    No requests logged yet.
                  </td>
                </tr>
              ) : (
                recentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 sm:p-4 text-text-main whitespace-nowrap">
                      {new Date(req.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-3.5 sm:p-4 text-text-main font-bold truncate max-w-[180px]" title={req.model}>
                      {req.model}
                    </td>
                    <td className="p-3.5 sm:p-4 text-text-muted truncate max-w-[140px]" title={req.provider}>
                      {req.provider}
                    </td>
                    <td className="p-3.5 sm:p-4 text-right text-text-main font-bold">
                      {req.tokens.toLocaleString()}
                    </td>
                    <td className="p-3.5 sm:p-4 text-right text-text-main">
                      {fmtCost(req.cost)}
                    </td>
                    <td className="p-3.5 sm:p-4 text-center">
                      <Badge
                        variant={req.status === "ok" || req.status === "success" ? "success" : "error"}
                        size="sm"
                      >
                        {req.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
