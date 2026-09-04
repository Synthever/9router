import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver";
import { parseJson } from "@/lib/db/helpers/jsonCol";
import { getApiKeyByKey } from "@/lib/db/repos/apiKeysRepo";
import { getApiKeyUsage } from "@/lib/db/repos/apiKeyGovernanceRepo";

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
 * GET /api/user/info
 * Validates API key and returns key metadata, limits, remaining tokens, remaining cost budget, and permitted models.
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

    const config = keyObj.config || {};
    const resetPeriod = config.resetPeriod || "none";
    const quotaPeriod = resetPeriod === "daily" ? "today" : resetPeriod === "monthly" ? "month" : "all";

    // Get current usage according to the key's reset cycle
    const quotaUsage = await getApiKeyUsage(key, quotaPeriod);

    // Get lifetime usage
    const lifetimeUsage = await getApiKeyUsage(key, "all");

    // Compute remaining quotas
    const maxTokens = config.maxTokens ? Number(config.maxTokens) : null;
    const maxCost = config.maxCost ? Number(config.maxCost) : null;

    const remainingTokens = maxTokens !== null ? Math.max(0, maxTokens - quotaUsage.totalTokens) : null;
    const remainingCost = maxCost !== null ? Math.max(0, maxCost - quotaUsage.cost) : null;
    const isTokensExhausted = maxTokens !== null && remainingTokens <= 0;
    const isCostExhausted = maxCost !== null && remainingCost <= 0;

    // Check expiration
    const isExpired = config.expiresAt ? Date.now() > new Date(config.expiresAt).getTime() : false;

    return NextResponse.json({
      key: {
        id: keyObj.id,
        name: keyObj.name,
        keyMasked: key.length > 8 ? `${key.slice(0, 8)}...${key.slice(-4)}` : `${key.charAt(0)}***`,
        isActive: keyObj.isActive,
        createdAt: keyObj.createdAt,
        expiresAt: config.expiresAt || null,
        isExpired,
      },
      governance: {
        maxTokens,
        maxCost,
        remainingTokens,
        remainingCost,
        isTokensExhausted,
        isCostExhausted,
        resetPeriod,
        multiplier: config.multiplier ?? 1.0,
        rateLimitRpm: config.rateLimitRpm ?? null,
        rateLimitTpm: config.rateLimitTpm ?? null,
        maxTokensPerRequest: config.maxTokensPerRequest ?? null,
        allowedModels: config.allowedModels ?? [],
        blockedModels: config.blockedModels ?? [],
        allowedEndpoints: config.allowedEndpoints ?? ["chat", "embeddings", "images", "audio", "fetch"],
      },
      currentCycleUsage: {
        period: quotaPeriod,
        requests: quotaUsage.requests,
        promptTokens: quotaUsage.promptTokens,
        completionTokens: quotaUsage.completionTokens,
        cachedTokens: quotaUsage.cachedTokens,
        totalTokens: quotaUsage.totalTokens,
        cost: quotaUsage.cost,
      },
      lifetimeUsage: {
        requests: lifetimeUsage.requests,
        promptTokens: lifetimeUsage.promptTokens,
        completionTokens: lifetimeUsage.completionTokens,
        cachedTokens: lifetimeUsage.cachedTokens,
        totalTokens: lifetimeUsage.totalTokens,
        cost: lifetimeUsage.cost,
      },
    });
  } catch (error) {
    console.error("[API] Failed to get user API key info:", error);
    return NextResponse.json({ error: "Failed to fetch user API key details" }, { status: 500 });
  }
}
