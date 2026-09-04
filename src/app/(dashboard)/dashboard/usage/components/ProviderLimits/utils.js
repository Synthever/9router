import { getModelsByProviderId } from "open-sse/config/providerModels.js";

// ─── Constants ───────────────────────────────────────────────────────────────
export const QUOTA_CACHE_KEY = "quotaCacheData";
export const REFRESH_INTERVAL_MS = 60000;
// Claude usage/quota endpoint rate-limits; poll it less often than other providers
export const CLAUDE_REFRESH_INTERVAL_MS = 600000;
export const DEPLETED_QUOTA_THRESHOLD = 5;
export const AUTO_REFRESH_STORAGE_KEY = "quotaAutoRefresh";
export const CONNECTIONS_PAGE_SIZE = 20;
export const ACCOUNT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const ACCOUNT_PAGE_SIZE_MAX = 500;
export const ACCOUNT_FILTER_OPTIONS = [
  { value: "all", label: "All accounts" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Turned off" },
];
export const QUOTA_SORT_OPTIONS = [
  { value: "default", label: "Default quota order" },
  { value: "remaining-asc", label: "% quota: low to high" },
  { value: "remaining-desc", label: "% quota: high to low" },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────
export function getConnectionLabel(connection) {
  return connection.name?.trim()
    || connection.email?.trim()
    || connection.displayName?.trim()
    || null;
}

export function getConnectionQuotaRemaining(connection, quotaData) {
  const quota = quotaData[connection.id]?.quotas?.[0];
  if (!quota) return Number.POSITIVE_INFINITY;
  if (typeof quota.remaining === "number") return quota.remaining;
  return Number.POSITIVE_INFINITY;
}

// Stable group-by-provider: first-seen provider order, original order within group.
function groupByProviderStable(connections) {
  const seen = new Map();
  for (const conn of connections) {
    const key = conn.provider || "";
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(conn);
  }
  return Array.from(seen.values()).flat();
}

export function sortVisibleConnections(
  connections,
  quotaData,
  expiringFirst,
  providerFilter,
  quotaSortMode,
) {
  if (providerFilter === "codex" && quotaSortMode !== "default") {
    return [...connections].sort((a, b) => {
      const remainingA = getConnectionQuotaRemaining(a, quotaData);
      const remainingB = getConnectionQuotaRemaining(b, quotaData);
      const remainingDiff =
        quotaSortMode === "remaining-asc"
          ? remainingA - remainingB
          : remainingB - remainingA;
      if (remainingDiff !== 0) return remainingDiff;
      return (getConnectionLabel(a) || "").localeCompare(
        getConnectionLabel(b) || "",
      );
    });
  }

  if (!expiringFirst) return groupByProviderStable(connections);

  const getEarliestResetTime = (connection) => {
    const resetTimes = (quotaData[connection.id]?.quotas || [])
      .map((quota) =>
        quota.resetAt
          ? new Date(quota.resetAt).getTime()
          : Number.POSITIVE_INFINITY,
      )
      .filter((time) => Number.isFinite(time));
    return resetTimes.length > 0
      ? Math.min(...resetTimes)
      : Number.POSITIVE_INFINITY;
  };

  return [...connections].sort((a, b) => {
    const expiryDiff = getEarliestResetTime(a) - getEarliestResetTime(b);
    if (expiryDiff !== 0) return expiryDiff;
    return (
      (a.provider || "").localeCompare(b.provider || "") ||
      (getConnectionLabel(a) || "").localeCompare(getConnectionLabel(b) || "")
    );
  });
}

export function buildLoadingState(connections) {
  const nextLoadingState = {};
  connections.forEach((connection) => {
    nextLoadingState[connection.id] = true;
  });
  return nextLoadingState;
}

export function filterQuotaStateByConnections(state, connections) {
  const visibleIds = new Set(connections.map((connection) => connection.id));
  return Object.fromEntries(
    Object.entries(state).filter(([id]) => visibleIds.has(id)),
  );
}

export function getConnectionsPageRange(pagination) {
  if (!pagination.total) {
    return { start: 0, end: 0 };
  }
  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total);
  return { start, end };
}

export function getConnectionsEmptyMessage(totals, providerFilter, accountFilter) {
  if (!totals.eligibleConnections) {
    return {
      icon: "cloud_off",
      title: "No Providers Connected",
      description:
        "Connect to providers with OAuth to track your API quota limits and usage.",
    };
  }
  if (!totals.providerFilteredConnections) {
    return {
      icon: "filter_alt_off",
      title: "No Accounts Match Current Filters",
      description:
        providerFilter === "all"
          ? "Try changing the account status filter to see more quota trackers."
          : `No ${accountFilter === "inactive" ? "turned off" : accountFilter === "active" ? "active" : "matching"} accounts found for ${providerFilter}.`,
    };
  }
  return {
    icon: "filter_alt_off",
    title: "No Accounts On This Page",
    description:
      "Try moving to another page or refreshing the current filters.",
  };
}

export function sortRequestFromExpiringFirst(expiringFirst) {
  return expiringFirst ? "expiring" : "priority";
}

export function getPageSizeLabel(pageSize, isCustomPageSize) {
  return isCustomPageSize ? `Custom: ${pageSize} / page` : `${pageSize} / page`;
}

export function getConnectionsPaginationSummary(pagination) {
  const { start, end } = getConnectionsPageRange(pagination);
  return `Showing ${start}-${end} of ${pagination.total}`;
}

export function getSafePagination(pagination, fallbackPageSize) {
  return (
    pagination || {
      page: 1,
      pageSize: fallbackPageSize,
      total: 0,
      totalPages: 1,
    }
  );
}

export function getSafeTotals(totals, fallbackTotal = 0) {
  return (
    totals || {
      eligibleConnections: fallbackTotal,
      providerFilteredConnections: fallbackTotal,
    }
  );
}

export function shouldResetPage(previousValue, nextValue) {
  return previousValue !== nextValue;
}

export function getPaginationPageValue(dataPagination, fallbackPage) {
  return dataPagination?.page || fallbackPage;
}

export function getProviderOptions(dataProviderOptions) {
  return dataProviderOptions || [];
}

export async function reconcileConnectionsPage(fetchConnections, targetPage) {
  return await fetchConnections(targetPage);
}

export function getQuotaCache() {
  if (typeof window === "undefined") return {};
  try {
    const cached = window.localStorage.getItem(QUOTA_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    console.error("Error reading quota cache:", error);
    return {};
  }
}

export function setQuotaCache(connectionId, quotaEntry) {
  if (typeof window === "undefined") return;
  try {
    const cache = getQuotaCache();
    cache[connectionId] = {
      ...quotaEntry,
      cachedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(QUOTA_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Error writing quota cache:", error);
  }
}

/**
 * Format ISO date string to countdown format (inspired by vscode-antigravity-cockpit)
 * @param {string|Date} date - ISO date string or Date object
 * @returns {string} Formatted countdown (e.g., "2d 5h 30m", "4h 40m", "15m") or "-"
 */
export function formatResetTime(date) {
  if (!date) return "-";

  try {
    const resetDate = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = resetDate - now;

    if (diffMs <= 0) return "-";

    const totalMinutes = Math.ceil(diffMs / (1000 * 60));
    
    // < 60 minutes: show only minutes
    if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    }
    
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    
    // < 24 hours: show hours and minutes
    if (totalHours < 24) {
      return `${totalHours}h ${remainingMinutes}m`;
    }
    
    // >= 24 hours: show days, hours, and minutes
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    return `${days}d ${remainingHours}h ${remainingMinutes}m`;
  } catch (error) {
    return "-";
  }
}

/**
 * Get Tailwind color class based on percentage
 * @param {number} percentage - Remaining percentage (0-100)
 * @returns {string} Color name: "green" | "yellow" | "red"
 */
export function getStatusColor(percentage) {
  if (percentage > 70) return "green";
  if (percentage >= 30) return "yellow";
  return "red"; // 0-29% including 0% (out of quota) - show red
}

/**
 * Get status emoji based on percentage
 * @param {number} percentage - Remaining percentage (0-100)
 * @returns {string} Emoji: "🟢" | "🟡" | "🔴"
 */
export function getStatusEmoji(percentage) {
  if (percentage > 70) return "🟢";
  if (percentage >= 30) return "🟡";
  return "🔴"; // 0-29% including 0% (out of quota) - show red
}

/**
 * Calculate remaining percentage
 * @param {number} used - Used amount
 * @param {number} total - Total amount
 * @returns {number} Remaining percentage (0-100)
 */
export function calculatePercentage(used, total) {
  if (!total || total === 0) return 0;
  if (!used || used < 0) return 100;
  if (used >= total) return 0;

  return Math.round(((total - used) / total) * 100);
}

/**
 * Get remaining percentage from a normalized quota row
 * @param {Object} quota - Normalized quota object
 * @returns {number} Remaining percentage (0-100)
 */
export function getRemainingPercentage(quota) {
  if (quota?.remaining !== undefined) {
    return Math.max(0, Math.round(quota.remaining));
  }

  if (quota?.remainingPercentage !== undefined) {
    return Math.round(quota.remainingPercentage);
  }

  return calculatePercentage(quota?.used, quota?.total);
}

export function getQuotaVisibilityKey(quota) {
  if (!quota || typeof quota !== "object") return "";
  return String(quota.modelKey || quota.name || "").trim();
}

function getProviderHiddenQuotaSet(provider, quotaVisibility) {
  const hidden = quotaVisibility?.[provider]?.hidden;
  return new Set(Array.isArray(hidden) ? hidden.map(String) : []);
}

export function filterQuotasByVisibility(provider, quotas = [], quotaVisibility = {}) {
  if (!Array.isArray(quotas) || quotas.length === 0) return [];
  const hidden = getProviderHiddenQuotaSet(provider, quotaVisibility);
  if (hidden.size === 0) return quotas;
  return quotas.filter((quota) => !hidden.has(getQuotaVisibilityKey(quota)));
}

export function getHiddenQuotaRows(provider, quotas = [], quotaVisibility = {}) {
  if (!Array.isArray(quotas) || quotas.length === 0) return [];
  const hidden = getProviderHiddenQuotaSet(provider, quotaVisibility);
  if (hidden.size === 0) return [];
  return quotas.filter((quota) => hidden.has(getQuotaVisibilityKey(quota)));
}

/**
 * Parse provider-specific quota structures into normalized array
 * @param {string} provider - Provider name (github, antigravity, codex, kiro, claude)
 * @param {Object} data - Raw quota data from provider
 * @returns {Array<Object>} Normalized quota objects with { name, used, total, resetAt }
 */
export function parseQuotaData(provider, data) {
  if (!data || typeof data !== "object") return [];

  const normalizedQuotas = [];

  try {
    switch (provider.toLowerCase()) {
      case "github":
        if (data.quotas) {
          Object.entries(data.quotas).forEach(([name, quota]) => {
            normalizedQuotas.push({
              name,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
            });
          });
        }
        break;

      case "antigravity":
        if (data.quotas) {
          // If native 4 buckets exist (gemini_5h, gemini_weekly, claude_5h, claude_weekly), format directly
          const hasNativePools = data.quotas.gemini_5h || data.quotas.gemini_weekly || data.quotas.claude_5h || data.quotas.claude_weekly;

          if (hasNativePools) {
            const formatBucket = (key, defaultName) => {
              const q = data.quotas[key];
              if (!q) {
                return {
                  name: defaultName,
                  modelKey: key,
                  used: 0,
                  total: 1000,
                  resetAt: null,
                  remainingPercentage: 100,
                };
              }
              return {
                name: q.displayName || defaultName,
                modelKey: key,
                used: q.used || 0,
                total: q.total || 1000,
                resetAt: q.resetAt || null,
                remainingPercentage: q.remainingPercentage,
              };
            };

            let gemini5h = formatBucket("gemini_5h", "Gemini (5h)");
            let geminiWeekly = formatBucket("gemini_weekly", "Gemini (Weekly)");
            let claude5h = formatBucket("claude_5h", "Claude (5h)");
            let claudeWeekly = formatBucket("claude_weekly", "Claude (Weekly)");

            // Rule: If weekly quota is depleted (remainingPercentage <= 0), 5h limit is also exhausted
            if (geminiWeekly.remainingPercentage <= 0) {
              gemini5h.remainingPercentage = 0;
              gemini5h.used = gemini5h.total;
              if (!gemini5h.resetAt) gemini5h.resetAt = geminiWeekly.resetAt;
            }
            if (claudeWeekly.remainingPercentage <= 0) {
              claude5h.remainingPercentage = 0;
              claude5h.used = claude5h.total;
              if (!claude5h.resetAt) claude5h.resetAt = claudeWeekly.resetAt;
            }

            normalizedQuotas.push(gemini5h, geminiWeekly, claude5h, claudeWeekly);
          } else {
            // Fallback for model-based legacy quotas
            const now = Date.now();
            const geminiItems = [];
            const claudeItems = [];

            Object.entries(data.quotas).forEach(([modelKey, quota]) => {
              const lower = modelKey.toLowerCase();
              const resetMs = quota.resetAt ? new Date(quota.resetAt).getTime() : null;
              const diffHours = resetMs ? (resetMs - now) / (1000 * 60 * 60) : null;
              const remainingPercentage = quota.remainingPercentage !== undefined
                ? quota.remainingPercentage
                : (quota.total ? Math.round(((quota.total - (quota.used || 0)) / quota.total) * 100) : 100);

              const item = {
                modelKey,
                displayName: quota.displayName || modelKey,
                used: quota.used || 0,
                total: quota.total || 0,
                resetAt: quota.resetAt || null,
                diffHours,
                remainingPercentage,
              };

              if (lower.includes("claude") || lower.includes("opus") || lower.includes("sonnet") || lower.includes("gpt-oss")) {
                claudeItems.push(item);
              } else if (lower.includes("gemini")) {
                geminiItems.push(item);
              }
            });

            const extractPools = (items, defaultPrefix) => {
              let sess = null;
              let week = null;

              items.forEach((it) => {
                if (it.diffHours !== null) {
                  if (it.diffHours <= 12) {
                    if (!sess || it.remainingPercentage < sess.remainingPercentage) sess = it;
                  } else {
                    if (!week || it.remainingPercentage < week.remainingPercentage) week = it;
                  }
                } else if (!sess) {
                  sess = it;
                }
              });

              return {
                session: sess || {
                  modelKey: `${defaultPrefix.toLowerCase()}_5h`,
                  used: 0,
                  total: 1000,
                  resetAt: null,
                  remainingPercentage: 100,
                },
                weekly: week || {
                  modelKey: `${defaultPrefix.toLowerCase()}_weekly`,
                  used: 0,
                  total: 1000,
                  resetAt: null,
                  remainingPercentage: 100,
                },
              };
            };

            const geminiPools = extractPools(geminiItems, "gemini");
            const claudePools = extractPools(claudeItems, "claude");

            let g5h = {
              name: "Gemini (5h)",
              modelKey: "gemini_5h",
              used: geminiPools.session.used,
              total: geminiPools.session.total || 1000,
              resetAt: geminiPools.session.resetAt,
              remainingPercentage: geminiPools.session.remainingPercentage,
            };
            let gWeek = {
              name: "Gemini (Weekly)",
              modelKey: "gemini_weekly",
              used: geminiPools.weekly.used,
              total: geminiPools.weekly.total || 1000,
              resetAt: geminiPools.weekly.resetAt,
              remainingPercentage: geminiPools.weekly.remainingPercentage,
            };
            let c5h = {
              name: "Claude (5h)",
              modelKey: "claude_5h",
              used: claudePools.session.used,
              total: claudePools.session.total || 1000,
              resetAt: claudePools.session.resetAt,
              remainingPercentage: claudePools.session.remainingPercentage,
            };
            let cWeek = {
              name: "Claude (Weekly)",
              modelKey: "claude_weekly",
              used: claudePools.weekly.used,
              total: claudePools.weekly.total || 1000,
              resetAt: claudePools.weekly.resetAt,
              remainingPercentage: claudePools.weekly.remainingPercentage,
            };

            if (gWeek.remainingPercentage <= 0) {
              g5h.remainingPercentage = 0;
              g5h.used = g5h.total;
              if (!g5h.resetAt) g5h.resetAt = gWeek.resetAt;
            }
            if (cWeek.remainingPercentage <= 0) {
              c5h.remainingPercentage = 0;
              c5h.used = c5h.total;
              if (!c5h.resetAt) c5h.resetAt = cWeek.resetAt;
            }

            normalizedQuotas.push(g5h, gWeek, c5h, cWeek);
          }
        }
        break;

      case "codex":
        if (data.quotas) {
          Object.entries(data.quotas).forEach(([quotaType, quota]) => {
            let displayName = quotaType;
            if (quotaType === "spark_session") displayName = "Spark (5h)";
            else if (quotaType === "spark_weekly") displayName = "Spark (Weekly)";
            else if (quotaType === "session") displayName = "5h";
            else if (quotaType === "weekly") displayName = "Weekly";
            else if (quotaType === "review_session") displayName = "Review (5h)";
            else if (quotaType === "review_weekly") displayName = "Review (Weekly)";

            normalizedQuotas.push({
              name: displayName,
              quotaType,
              used: quota.used || 0,
              total: quota.total || 0,
              remaining: quota.remaining,
              resetAt: quota.resetAt || null,
            });
          });
        }
        break;

      case "kiro":
        if (data.quotas) {
          Object.entries(data.quotas).forEach(([quotaType, quota]) => {
            normalizedQuotas.push({
              name: quotaType,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
            });
          });
        }
        break;

      case "qoder":
        // Qoder ships a `user` quota and (optionally) an `organization`
        // quota, both with same shape: {total, used, remaining, unit, resetAt}.
        // Skip an organization bucket when its total is 0 — most personal
        // Qoder accounts won't have one and rendering "0/0" is misleading.
        // Don't forward Qoder's `remaining` field: it's an absolute credit
        // count, but getRemainingPercentage / QuotaTable interpret
        // `remaining` as a 0-100 percentage and would render 348 credits
        // as "348%". The percentage is computed from used/total instead.
        if (data.quotas) {
          Object.entries(data.quotas).forEach(([quotaType, quota]) => {
            if (quotaType === "organization" && (!quota || (Number(quota.total) || 0) === 0)) {
              return;
            }
            normalizedQuotas.push({
              name: quotaType === "user" ? "Personal" : quotaType === "organization" ? "Organization" : quotaType,
              used: quota.used || 0,
              total: quota.total || 0,
              unit: quota.unit,
              resetAt: quota.resetAt || null,
            });
          });
        }
        break;

      case "claude":
        if (data.message) {
          // Handle error message case
          normalizedQuotas.push({
            name: "error",
            used: 0,
            total: 0,
            resetAt: null,
            message: data.message,
          });
        } else if (data.quotas) {
          Object.entries(data.quotas).forEach(([name, quota]) => {
            normalizedQuotas.push({
              name,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
            });
          });
        }
        break;

      case "vercel-ai-gateway":
        // Vercel returns currency credit balance, not request quotas.
        // The 'Remaining (USD)' row needs explicit remainingPercentage because
        // its used/total values would otherwise compute the wrong direction
        // (e.g. used=95.5 / total=100 → 4% instead of 96%).
        if (data.quotas) {
          Object.entries(data.quotas).forEach(([name, quota]) => {
            normalizedQuotas.push({
              name,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
              remainingPercentage: quota.remainingPercentage,
            });
          });
        }
        break;

      case "codebuddy-cn":
        // CodeBuddy CN mixes recurring refill packs ("Monthly"/"Weekly"/...)
        // with one-shot bonus packs ("Bonus Pack N"). Forward `recurring`
        // so the UI can show "Expires in" for bonus packs (whose resetAt is
        // a hard expiry, not a refresh) instead of "Reset in".
        if (data.quotas) {
          Object.entries(data.quotas).forEach(([name, quota]) => {
            normalizedQuotas.push({
              name,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
              recurring: quota.recurring !== false,
            });
          });
        }
        break;

      case "grok-cli":
        // Grok Build credits (on-demand window + prepaid balance).
        // Do NOT forward absolute `remaining` — getRemainingPercentage treats
        // it as a 0–100 percentage (same as Qoder). Use remainingPercentage.
        if (data.quotas) {
          Object.entries(data.quotas).forEach(([name, quota]) => {
            normalizedQuotas.push({
              name,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
              remainingPercentage: quota.remainingPercentage,
            });
          });
        }
        break;

      case "kimi":
        // Weekly / Ratelimit from /v1/usages. Prefer remainingPercentage only.
        if (data.quotas) {
          Object.entries(data.quotas).forEach(([name, quota]) => {
            normalizedQuotas.push({
              name,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
              remainingPercentage: quota.remainingPercentage,
            });
          });
        }
        break;

      case "deepseek":
        // Credit balance — remainingPercentage only (no absolute remaining).
        if (data.quotas) {
          Object.entries(data.quotas).forEach(([name, quota]) => {
            normalizedQuotas.push({
              name,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
              remainingPercentage: quota.remainingPercentage,
            });
          });
        }
        break;

      case "groq":
        // Requests/Tokens rate-limit windows from response headers — absolute
        // used/total (calculatePercentage derives the bar), like Codex/Kiro.
        if (data.quotas) {
          Object.entries(data.quotas).forEach(([name, quota]) => {
            normalizedQuotas.push({
              name,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
            });
          });
        }
        break;

      case "ollama":
        // Session (5h) / Weekly (7d) usage % from ollama.com/api/usage.
        // remainingPercentage only — no absolute remaining (UI treats remaining as %).
        if (data.quotas) {
          Object.entries(data.quotas).forEach(([name, quota]) => {
            normalizedQuotas.push({
              name,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
              remainingPercentage: quota.remainingPercentage,
            });
          });
        }
        break;

      case "zed":
        // Edit predictions + optional hosted model_requests; unlimited uses remainingPercentage.
        if (data.quotas) {
          Object.entries(data.quotas).forEach(([name, quota]) => {
            normalizedQuotas.push({
              name,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
              remainingPercentage: quota.remainingPercentage,
              unlimited: quota.unlimited,
            });
          });
        }
        break;

      default:
        // Generic fallback for unknown providers
        if (data.quotas) {
          Object.entries(data.quotas).forEach(([name, quota]) => {
            normalizedQuotas.push({
              name,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
            });
          });
        }
    }
  } catch (error) {
    console.error(`Error parsing quota data for ${provider}:`, error);
    return [];
  }

  // Sort quotas according to PROVIDER_MODELS order
  const modelOrder = getModelsByProviderId(provider);
  if (modelOrder.length > 0) {
    const orderMap = new Map(modelOrder.map((m, i) => [m.id, i]));
    
    normalizedQuotas.sort((a, b) => {
      // Use modelKey for antigravity, otherwise use name
      const keyA = a.modelKey || a.name;
      const keyB = b.modelKey || b.name;
      const orderA = orderMap.get(keyA) ?? 999;
      const orderB = orderMap.get(keyB) ?? 999;
      return orderA - orderB;
    });
  }

  return normalizedQuotas;
}
