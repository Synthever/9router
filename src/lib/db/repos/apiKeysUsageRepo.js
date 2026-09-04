import { getAdapter } from "@/lib/db/driver";
import { parseJson } from "@/lib/db/helpers/jsonCol";
import { getApiKeys } from "@/lib/db/repos/apiKeysRepo";

const PERIOD_MS = {
  "today": 0,
  "24h": 86400000,
  "7d": 604800000,
  "30d": 2592000000,
  "60d": 5184000000,
  "all": null,
};

/**
 * Fetch and aggregate usage statistics per API key for a given period.
 */
export async function getApiKeysUsageStats(period = "7d") {
  const db = await getAdapter();
  const registeredKeys = await getApiKeys();

  let cutoffIso = null;
  if (period === "today") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    cutoffIso = startOfDay.toISOString();
  } else if (PERIOD_MS[period]) {
    cutoffIso = new Date(Date.now() - PERIOD_MS[period]).toISOString();
  }

  const query = cutoffIso
    ? `SELECT apiKey, model, provider, endpoint, promptTokens, completionTokens, cost, tokens, timestamp, status FROM usageHistory WHERE timestamp >= ? ORDER BY timestamp DESC`
    : `SELECT apiKey, model, provider, endpoint, promptTokens, completionTokens, cost, tokens, timestamp, status FROM usageHistory ORDER BY timestamp DESC`;
  const params = cutoffIso ? [cutoffIso] : [];

  const rows = db.all(query, params);

  // Map registered keys by key string
  const keyMap = {};
  for (const k of registeredKeys) {
    keyMap[k.key] = {
      id: k.id,
      key: k.key,
      name: k.name,
      isActive: k.isActive,
      config: k.config || {},
      createdAt: k.createdAt,
      totalRequests: 0,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      cost: 0,
      lastUsed: null,
      models: {},
      endpoints: {},
    };
  }

  // Local / unauthenticated bucket
  const unauthenticatedBucket = {
    id: "unauthenticated",
    key: null,
    name: "Direct / No Key (Local)",
    isActive: true,
    config: {},
    createdAt: null,
    totalRequests: 0,
    promptTokens: 0,
    completionTokens: 0,
    cachedTokens: 0,
    totalTokens: 0,
    cost: 0,
    lastUsed: null,
    models: {},
    endpoints: {},
  };

  let overallRequests = 0;
  let overallPromptTokens = 0;
  let overallCompletionTokens = 0;
  let overallCachedTokens = 0;
  let overallCost = 0;

  for (const r of rows) {
    const tokens = parseJson(r.tokens, {}) || {};
    const pt = r.promptTokens || tokens.prompt_tokens || tokens.input_tokens || 0;
    const ct = r.completionTokens || tokens.completion_tokens || tokens.output_tokens || 0;
    const cdt = tokens.cached_tokens || tokens.cache_read_input_tokens || 0;
    const rowCost = r.cost || 0;
    const model = r.model || "Unknown";
    const endpoint = r.endpoint || "chat";

    overallRequests++;
    overallPromptTokens += pt;
    overallCompletionTokens += ct;
    overallCachedTokens += cdt;
    overallCost += rowCost;

    let targetBucket = null;
    if (r.apiKey && keyMap[r.apiKey]) {
      targetBucket = keyMap[r.apiKey];
    } else if (r.apiKey) {
      if (!keyMap[r.apiKey]) {
        keyMap[r.apiKey] = {
          id: `legacy-${r.apiKey.slice(0, 8)}`,
          key: r.apiKey,
          name: `Legacy (${r.apiKey.slice(0, 8)}...)`,
          isActive: false,
          config: {},
          createdAt: null,
          totalRequests: 0,
          promptTokens: 0,
          completionTokens: 0,
          cachedTokens: 0,
          totalTokens: 0,
          cost: 0,
          lastUsed: null,
          models: {},
          endpoints: {},
        };
      }
      targetBucket = keyMap[r.apiKey];
    } else {
      targetBucket = unauthenticatedBucket;
    }

    targetBucket.totalRequests++;
    targetBucket.promptTokens += pt;
    targetBucket.completionTokens += ct;
    targetBucket.cachedTokens += cdt;
    targetBucket.totalTokens += pt + ct;
    targetBucket.cost += rowCost;

    if (!targetBucket.lastUsed || new Date(r.timestamp) > new Date(targetBucket.lastUsed)) {
      targetBucket.lastUsed = r.timestamp;
    }

    // Aggregate by model
    if (!targetBucket.models[model]) {
      targetBucket.models[model] = { requests: 0, tokens: 0, cost: 0 };
    }
    targetBucket.models[model].requests++;
    targetBucket.models[model].tokens += pt + ct;
    targetBucket.models[model].cost += rowCost;

    // Aggregate by endpoint
    if (!targetBucket.endpoints[endpoint]) {
      targetBucket.endpoints[endpoint] = { requests: 0, tokens: 0, cost: 0 };
    }
    targetBucket.endpoints[endpoint].requests++;
    targetBucket.endpoints[endpoint].tokens += pt + ct;
    targetBucket.endpoints[endpoint].cost += rowCost;
  }

  const keyList = Object.values(keyMap);
  if (unauthenticatedBucket.totalRequests > 0) {
    keyList.push(unauthenticatedBucket);
  }

  // Sort by total cost desc or total requests desc
  keyList.sort((a, b) => b.cost - a.cost || b.totalRequests - a.totalRequests);

  return {
    period,
    summary: {
      totalKeys: registeredKeys.length,
      activeKeys: registeredKeys.filter(k => k.isActive).length,
      totalRequests: overallRequests,
      totalPromptTokens: overallPromptTokens,
      totalCompletionTokens: overallCompletionTokens,
      totalCachedTokens: overallCachedTokens,
      totalTokens: overallPromptTokens + overallCompletionTokens,
      totalCost: overallCost,
    },
    keys: keyList,
  };
}
