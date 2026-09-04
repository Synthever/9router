import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver";
import { parseJson } from "@/lib/db/helpers/jsonCol";
import { getApiKeyByKey } from "@/lib/db/repos/apiKeysRepo";

export const dynamic = "force-dynamic";

const PERIOD_MS = {
  "today": 0,
  "24h": 86400000,
  "7d": 604800000,
  "30d": 2592000000,
  "60d": 5184000000,
  "all": null,
};

function extractApiKey(request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7).trim();
  const apiKeyHeader = request.headers.get("x-api-key");
  if (apiKeyHeader) return apiKeyHeader.trim();
  return request.nextUrl.searchParams?.get("key") || null;
}

/**
 * GET /api/user/usage?period=today|24h|7d|30d|60d|all
 * Returns usage history breakdown specifically for the authenticated user's API Key.
 */
export async function GET(request) {
  try {
    const key = extractApiKey(request);
    if (!key) {
      return NextResponse.json({ error: "API Key is required" }, { status: 401 });
    }

    const keyObj = await getApiKeyByKey(key);
    if (!keyObj) {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";

    const db = await getAdapter();

    let cutoffIso = null;
    if (period === "today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      cutoffIso = startOfDay.toISOString();
    } else if (PERIOD_MS[period]) {
      cutoffIso = new Date(Date.now() - PERIOD_MS[period]).toISOString();
    }

    const query = cutoffIso
      ? `SELECT model, provider, endpoint, promptTokens, completionTokens, cost, tokens, timestamp, status FROM usageHistory WHERE apiKey = ? AND timestamp >= ? ORDER BY timestamp DESC`
      : `SELECT model, provider, endpoint, promptTokens, completionTokens, cost, tokens, timestamp, status FROM usageHistory WHERE apiKey = ? ORDER BY timestamp DESC`;
    const params = cutoffIso ? [key, cutoffIso] : [key];

    const rows = db.all(query, params);

    let totalRequests = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalCachedTokens = 0;
    let totalCost = 0;

    const models = {};
    const endpoints = {};
    const recentRequests = [];

    for (const r of rows) {
      const tokens = parseJson(r.tokens, {}) || {};
      const pt = r.promptTokens || tokens.prompt_tokens || tokens.input_tokens || 0;
      const ct = r.completionTokens || tokens.completion_tokens || tokens.output_tokens || 0;
      const cdt = tokens.cached_tokens || tokens.cache_read_input_tokens || 0;
      const rowCost = r.cost || 0;
      const model = r.model || "Unknown";
      const endpoint = r.endpoint || "chat";

      totalRequests++;
      totalPromptTokens += pt;
      totalCompletionTokens += ct;
      totalCachedTokens += cdt;
      totalCost += rowCost;

      // Group by model
      if (!models[model]) {
        models[model] = { requests: 0, tokens: 0, cost: 0, promptTokens: 0, completionTokens: 0, cachedTokens: 0, lastUsed: r.timestamp };
      }
      models[model].requests++;
      models[model].tokens += pt + ct;
      models[model].promptTokens += pt;
      models[model].completionTokens += ct;
      models[model].cachedTokens += cdt;
      models[model].cost += rowCost;
      if (new Date(r.timestamp) > new Date(models[model].lastUsed)) {
        models[model].lastUsed = r.timestamp;
      }

      // Group by endpoint
      if (!endpoints[endpoint]) {
        endpoints[endpoint] = { requests: 0, tokens: 0, cost: 0, lastUsed: r.timestamp };
      }
      endpoints[endpoint].requests++;
      endpoints[endpoint].tokens += pt + ct;
      endpoints[endpoint].cost += rowCost;

      // Capture recent requests (max 50)
      if (recentRequests.length < 50) {
        recentRequests.push({
          timestamp: r.timestamp,
          model: r.model,
          provider: r.provider,
          endpoint: r.endpoint,
          promptTokens: pt,
          completionTokens: ct,
          cachedTokens: cdt,
          totalTokens: pt + ct,
          cost: rowCost,
          status: r.status,
        });
      }
    }

    return NextResponse.json({
      period,
      summary: {
        totalRequests,
        totalPromptTokens,
        totalCompletionTokens,
        totalCachedTokens,
        totalTokens: totalPromptTokens + totalCompletionTokens,
        totalCost,
      },
      models,
      endpoints,
      recentRequests,
    });
  } catch (error) {
    console.error("[API] Failed to get user API key usage:", error);
    return NextResponse.json({ error: "Failed to fetch usage breakdown" }, { status: 500 });
  }
}
