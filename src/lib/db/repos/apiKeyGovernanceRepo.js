import { getAdapter } from "../driver.js";
import { parseJson } from "../helpers/jsonCol.js";
import { getApiKeyByKey } from "./apiKeysRepo.js";

// In-memory sliding window rate limiter: { [apiKey]: { rpm: [timestamps], tpm: [{ ts, tokens }] } }
if (!global._apiKeyRateLimits) global._apiKeyRateLimits = {};
const rateLimits = global._apiKeyRateLimits;

function cleanRateLimitWindow(keyObj, now = Date.now()) {
  if (!keyObj) return;
  const oneMinAgo = now - 60 * 1000;
  keyObj.rpm = (keyObj.rpm || []).filter((t) => t > oneMinAgo);
  keyObj.tpm = (keyObj.tpm || []).filter((item) => item.ts > oneMinAgo);
}

/**
 * Get aggregated token & cost usage for a specific API Key over a given period.
 * @param {string} apiKey
 * @param {"all"|"today"|"month"} period
 */
export async function getApiKeyUsage(apiKey, period = "all") {
  if (!apiKey) return { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 };
  const db = await getAdapter();

  let cutoff = null;
  const now = new Date();
  if (period === "today") {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    cutoff = startOfDay.toISOString();
  } else if (period === "month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    cutoff = startOfMonth.toISOString();
  }

  const query = cutoff
    ? `SELECT promptTokens, completionTokens, cost, tokens FROM usageHistory WHERE apiKey = ? AND timestamp >= ?`
    : `SELECT promptTokens, completionTokens, cost, tokens FROM usageHistory WHERE apiKey = ?`;
  const params = cutoff ? [apiKey, cutoff] : [apiKey];

  const rows = db.all(query, params);
  let requests = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let cachedTokens = 0;
  let cost = 0;

  for (const r of rows) {
    requests++;
    const t = parseJson(r.tokens, {}) || {};
    const pt = r.promptTokens || t.prompt_tokens || t.input_tokens || 0;
    const ct = r.completionTokens || t.completion_tokens || t.output_tokens || 0;
    const cdt = t.cached_tokens || t.cache_read_input_tokens || 0;
    promptTokens += pt;
    completionTokens += ct;
    cachedTokens += cdt;
    cost += r.cost || 0;
  }

  return {
    requests,
    promptTokens,
    completionTokens,
    cachedTokens,
    totalTokens: promptTokens + completionTokens,
    cost,
  };
}

/**
 * Validate API Key & its governance rules:
 * - isActive
 * - Expiration date (expiresAt)
 * - Model restrictions (allowedModels / blockedModels)
 * - Endpoint/modality restrictions (allowedEndpoints)
 * - Max Token Limit (resetPeriod: none / daily / monthly)
 * - Max Cost Limit (resetPeriod: none / daily / monthly)
 * - Rate Limiting: RPM & TPM
 *
 * @returns {{ valid: boolean, error?: string, status?: number, keyInfo?: object }}
 */
export async function verifyApiKeyGovernance(key, { model = null, endpoint = "chat", estimatedTokens = 0 } = {}) {
  if (!key) {
    return { valid: false, error: "API key is required", status: 401 };
  }

  const keyObj = await getApiKeyByKey(key);
  if (!keyObj) {
    return { valid: false, error: "Invalid API key", status: 401 };
  }

  if (!keyObj.isActive) {
    return { valid: false, error: "API key is paused or disabled", status: 403 };
  }

  const config = keyObj.config || {};

  // 1. Expiration Check
  if (config.expiresAt) {
    const expireTime = new Date(config.expiresAt).getTime();
    if (!isNaN(expireTime) && Date.now() > expireTime) {
      return { valid: false, error: `API key expired on ${new Date(config.expiresAt).toLocaleString()}`, status: 403 };
    }
  }

  // 2. Endpoint / Modality Whitelist Check
  if (Array.isArray(config.allowedEndpoints) && config.allowedEndpoints.length > 0) {
    const epNorm = (endpoint || "chat").toLowerCase();
    const isAllowed = config.allowedEndpoints.some((ep) => ep.toLowerCase() === epNorm);
    if (!isAllowed) {
      return { valid: false, error: `Endpoint '${endpoint}' is not allowed for this API key`, status: 403 };
    }
  }

  // 3. Model Restrictions
  if (model) {
    const cleanModel = model.toLowerCase();
    // Blocklist check
    if (Array.isArray(config.blockedModels) && config.blockedModels.length > 0) {
      const isBlocked = config.blockedModels.some((m) => {
        const mNorm = m.toLowerCase().trim();
        return mNorm === cleanModel || (mNorm.endsWith("*") && cleanModel.startsWith(mNorm.slice(0, -1)));
      });
      if (isBlocked) {
        return { valid: false, error: `Model '${model}' is restricted for this API key`, status: 403 };
      }
    }

    // Whitelist check
    if (Array.isArray(config.allowedModels) && config.allowedModels.length > 0) {
      const isAllowed = config.allowedModels.some((m) => {
        const mNorm = m.toLowerCase().trim();
        return mNorm === cleanModel || (mNorm.endsWith("*") && cleanModel.startsWith(mNorm.slice(0, -1)));
      });
      if (!isAllowed) {
        return { valid: false, error: `Model '${model}' is not permitted for this API key`, status: 403 };
      }
    }
  }

  // 4. Rate Limiting (RPM / TPM)
  const now = Date.now();
  if (!rateLimits[key]) rateLimits[key] = { rpm: [], tpm: [] };
  const keyRate = rateLimits[key];
  cleanRateLimitWindow(keyRate, now);

  if (config.rateLimitRpm && config.rateLimitRpm > 0) {
    if (keyRate.rpm.length >= config.rateLimitRpm) {
      return { valid: false, error: `Rate limit exceeded: max ${config.rateLimitRpm} requests per minute (RPM)`, status: 429 };
    }
  }

  if (config.rateLimitTpm && config.rateLimitTpm > 0 && estimatedTokens > 0) {
    const currentTokens = keyRate.tpm.reduce((sum, item) => sum + (item.tokens || 0), 0);
    if (currentTokens + estimatedTokens > config.rateLimitTpm) {
      return { valid: false, error: `Rate limit exceeded: max ${config.rateLimitTpm} tokens per minute (TPM)`, status: 429 };
    }
  }

  // 5. Token Quota Limit (maxTokens) & Cost Quota Limit (maxCost)
  const hasTokenLimit = config.maxTokens && Number(config.maxTokens) > 0;
  const hasCostLimit = config.maxCost && Number(config.maxCost) > 0;

  if (hasTokenLimit || hasCostLimit) {
    const period = config.resetPeriod === "daily" ? "today" : config.resetPeriod === "monthly" ? "month" : "all";
    const usage = await getApiKeyUsage(key, period);

    if (hasTokenLimit && usage.totalTokens >= Number(config.maxTokens)) {
      return {
        valid: false,
        error: `API key token quota exceeded (${usage.totalTokens.toLocaleString()} / ${Number(config.maxTokens).toLocaleString()} tokens used for period '${period}')`,
        status: 403,
      };
    }

    if (hasCostLimit && usage.cost >= Number(config.maxCost)) {
      return {
        valid: false,
        error: `API key cost budget exceeded ($${usage.cost.toFixed(4)} / $${Number(config.maxCost).toFixed(2)} used for period '${period}')`,
        status: 403,
      };
    }
  }

  // Record rate limit tick for this request
  keyRate.rpm.push(now);
  if (estimatedTokens > 0) {
    keyRate.tpm.push({ ts: now, tokens: estimatedTokens });
  }

  return { valid: true, keyInfo: keyObj };
}
