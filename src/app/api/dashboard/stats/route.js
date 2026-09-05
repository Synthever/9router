import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver";
import { parseJson } from "@/lib/db/helpers/jsonCol";
import { getApiKeys } from "@/lib/db/repos/apiKeysRepo";
import { getProviderConnections } from "@/lib/db/repos/connectionsRepo";
import { getProviderNodes } from "@/lib/db/repos/nodesRepo";
import { getCombos } from "@/lib/db/repos/combosRepo";
import { AI_PROVIDERS, getProviderByAlias } from "@/shared/constants/providers";

function resolveProviderDisplayName(providerId, nodesMap) {
  if (!providerId) return "Unknown";
  if (nodesMap[providerId]) return nodesMap[providerId];
  const p = getProviderByAlias(providerId) || AI_PROVIDERS[providerId];
  if (p?.name) return p.name;
  if (providerId.startsWith("openai-compatible-chat-")) {
    return "Custom OpenAI (" + providerId.slice(23, 29) + ")";
  }
  return providerId;
}

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";

    const db = await getAdapter();

    // Fetch related metadata
    const [apiKeys, connections, nodes, combos] = await Promise.all([
      getApiKeys().catch(() => []),
      getProviderConnections().catch(() => []),
      getProviderNodes().catch(() => []),
      getCombos().catch(() => []),
    ]);

    // Calculate time filter
    let timeFilter = "";
    const params = [];
    const now = new Date();

    if (period === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      timeFilter = "WHERE timestamp >= ?";
      params.push(startOfDay);
    } else if (period === "24h") {
      const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      timeFilter = "WHERE timestamp >= ?";
      params.push(past24h);
    } else if (period === "7d") {
      const past7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      timeFilter = "WHERE timestamp >= ?";
      params.push(past7d);
    } else if (period === "30d") {
      const past30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      timeFilter = "WHERE timestamp >= ?";
      params.push(past30d);
    } else if (period === "60d") {
      const past60d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
      timeFilter = "WHERE timestamp >= ?";
      params.push(past60d);
    }

    // Aggregated stats from usageHistory
    const aggQuery = `
      SELECT 
        COUNT(*) as totalRequests,
        SUM(CASE WHEN status = 'ok' OR status = 'success' OR status IS NULL THEN 1 ELSE 0 END) as successfulRequests,
        SUM(CASE WHEN status != 'ok' AND status != 'success' AND status IS NOT NULL THEN 1 ELSE 0 END) as failedRequests,
        SUM(promptTokens) as totalPromptTokens,
        SUM(completionTokens) as totalCompletionTokens,
        SUM(cost) as totalCost
      FROM usageHistory ${timeFilter}
    `;
    const summary = db.get(aggQuery, params) || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalCost: 0,
    };

    // By Provider
    const providerRows = db.all(`
      SELECT 
        COALESCE(provider, 'unknown') as provider,
        COUNT(*) as count,
        SUM(promptTokens) as promptTokens,
        SUM(completionTokens) as completionTokens,
        SUM(cost) as cost
      FROM usageHistory ${timeFilter}
      GROUP BY provider
      ORDER BY count DESC
      LIMIT 10
    `, params);

    // By Model
    const modelRows = db.all(`
      SELECT 
        COALESCE(model, 'unknown') as model,
        COALESCE(provider, 'unknown') as provider,
        COUNT(*) as count,
        SUM(promptTokens) as promptTokens,
        SUM(completionTokens) as completionTokens,
        SUM(cost) as cost
      FROM usageHistory ${timeFilter}
      GROUP BY model
      ORDER BY count DESC
      LIMIT 10
    `, params);

    // By Status
    const statusRows = db.all(`
      SELECT 
        CASE 
          WHEN status = 'ok' OR status = 'success' OR status IS NULL THEN 'Success (200 OK)' 
          ELSE COALESCE(status, 'Error') 
        END as status,
        COUNT(*) as count
      FROM usageHistory ${timeFilter}
      GROUP BY status
    `, params);

    // Timeline Trend (grouped by hour for today/24h, or by day for 7d/30d/60d/all)
    let timelineRows = [];
    if (period === "today" || period === "24h") {
      timelineRows = db.all(`
        SELECT 
          strftime('%Y-%m-%d %H:00', timestamp) as timeBucket,
          COUNT(*) as requests,
          SUM(promptTokens + completionTokens) as tokens,
          SUM(cost) as cost
        FROM usageHistory ${timeFilter}
        GROUP BY timeBucket
        ORDER BY timeBucket ASC
      `, params);
    } else {
      timelineRows = db.all(`
        SELECT 
          strftime('%Y-%m-%d', timestamp) as timeBucket,
          COUNT(*) as requests,
          SUM(promptTokens + completionTokens) as tokens,
          SUM(cost) as cost
        FROM usageHistory ${timeFilter}
        GROUP BY timeBucket
        ORDER BY timeBucket ASC
      `, params);
    }

    // Recent 10 Requests
    const recentRows = db.all(`
      SELECT id, timestamp, provider, model, promptTokens, completionTokens, cost, status, tokens
      FROM usageHistory
      ORDER BY id DESC
      LIMIT 10
    `);

    const nodesMap = {};
    for (const n of nodes) {
      if (n.id && n.name) nodesMap[n.id] = n.name;
    }

    return NextResponse.json({
      summary: {
        totalRequests: summary.totalRequests || 0,
        successfulRequests: summary.successfulRequests || 0,
        failedRequests: summary.failedRequests || 0,
        successRate: summary.totalRequests > 0 
          ? (((summary.successfulRequests || 0) / summary.totalRequests) * 100).toFixed(1) 
          : "100.0",
        totalPromptTokens: summary.totalPromptTokens || 0,
        totalCompletionTokens: summary.totalCompletionTokens || 0,
        totalTokens: (summary.totalPromptTokens || 0) + (summary.totalCompletionTokens || 0),
        totalCost: summary.totalCost || 0,
      },
      counts: {
        apiKeys: apiKeys.length,
        activeApiKeys: apiKeys.filter(k => k.isActive !== false).length,
        connections: connections.length,
        activeConnections: connections.filter(c => c.disabled !== true).length,
        nodes: nodes.length,
        combos: combos.length,
      },
      byProvider: providerRows.map(r => ({
        name: resolveProviderDisplayName(r.provider, nodesMap),
        rawProvider: r.provider,
        count: r.count,
        tokens: (r.promptTokens || 0) + (r.completionTokens || 0),
        cost: r.cost || 0,
      })),
      byModel: modelRows.map(r => ({
        name: r.model,
        provider: resolveProviderDisplayName(r.provider, nodesMap),
        count: r.count,
        tokens: (r.promptTokens || 0) + (r.completionTokens || 0),
        cost: r.cost || 0,
      })),
      byStatus: statusRows.map(r => ({
        name: r.status,
        value: r.count,
      })),
      timeline: timelineRows.map(r => ({
        time: r.timeBucket,
        requests: r.requests,
        tokens: r.tokens || 0,
        cost: r.cost || 0,
      })),
      recentRequests: recentRows.map(r => {
        const t = parseJson(r.tokens, {}) || {};
        return {
          id: r.id,
          timestamp: r.timestamp,
          provider: resolveProviderDisplayName(r.provider, nodesMap),
          model: r.model || "unknown",
          tokens: (r.promptTokens || 0) + (r.completionTokens || 0),
          cachedTokens: t.cached_tokens || t.cache_read_input_tokens || 0,
          cost: r.cost || 0,
          status: r.status || "ok",
        };
      }),
    });
  } catch (error) {
    console.error("[API] Failed to get dashboard overview stats:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}
