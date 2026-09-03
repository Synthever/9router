"use client";

import PropTypes from "prop-types";
import Card from "@/shared/components/Card";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(2)}`;

export default function OverviewCards({ stats }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 sm:gap-4">
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3 bg-surface border-2 border-border shadow-[3px_3px_0px_var(--color-border)]">
        <span className="text-text-muted text-xs uppercase font-bold tracking-wider">Total Requests</span>
        <span className="truncate text-2xl font-black text-text-main">{fmt(stats.totalRequests)}</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3 bg-surface border-2 border-border shadow-[3px_3px_0px_var(--color-border)]">
        <span className="text-text-muted text-xs uppercase font-bold tracking-wider">Input Tokens</span>
        <span className="truncate text-2xl font-black text-brand-500">{fmt(stats.totalPromptTokens)}</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3 bg-surface border-2 border-border shadow-[3px_3px_0px_var(--color-border)]">
        <span className="text-text-muted text-xs uppercase font-bold tracking-wider">Cached Tokens</span>
        <span className="truncate text-2xl font-black text-info">{fmt(stats.totalCachedTokens)}</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3 bg-surface border-2 border-border shadow-[3px_3px_0px_var(--color-border)]">
        <span className="text-text-muted text-xs uppercase font-bold tracking-wider">Output Tokens</span>
        <span className="truncate text-2xl font-black text-success">{fmt(stats.totalCompletionTokens)}</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3 bg-surface border-2 border-border shadow-[3px_3px_0px_var(--color-border)]">
        <span className="text-text-muted text-xs uppercase font-bold tracking-wider">Est. Cost</span>
        <span className="truncate text-2xl font-black text-warning">~{fmtCost(stats.totalCost)}</span>
        <span className="text-[10px] text-text-muted font-medium">Estimated, not actual billing</span>
      </Card>
    </div>
  );
}

OverviewCards.propTypes = {
  stats: PropTypes.object.isRequired,
};
