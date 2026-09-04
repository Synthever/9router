import { NextResponse } from "next/server";
import { getApiKeyByKey } from "@/lib/db/repos/apiKeysRepo";
import { buildModelsList } from "@/app/api/v1/models/route";

export const dynamic = "force-dynamic";

function extractApiKey(request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7).trim();
  const apiKeyHeader = request.headers.get("x-api-key");
  if (apiKeyHeader) return apiKeyHeader.trim();
  return request.nextUrl.searchParams?.get("key") || null;
}

/**
 * GET /api/user/models
 * Returns the list of permitted models for the authenticated API key.
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

    // Fetch catalog models from buildModelsList
    const allModels = await buildModelsList(["llm", "image", "tts", "stt", "embedding"]).catch(() => []);
    const config = keyObj.config || {};
    const allowed = Array.isArray(config.allowedModels) && config.allowedModels.length > 0 ? config.allowedModels : null;
    const blocked = Array.isArray(config.blockedModels) && config.blockedModels.length > 0 ? config.blockedModels : null;

    // Filter permitted models
    const permittedModels = allModels.filter((m) => {
      const modelId = (m.id || "").toLowerCase();

      if (blocked) {
        const isBlocked = blocked.some((b) => {
          const norm = b.toLowerCase().trim();
          return norm === modelId || (norm.endsWith("*") && modelId.startsWith(norm.slice(0, -1)));
        });
        if (isBlocked) return false;
      }

      if (allowed) {
        const isAllowed = allowed.some((a) => {
          const norm = a.toLowerCase().trim();
          return norm === modelId || (norm.endsWith("*") && modelId.startsWith(norm.slice(0, -1)));
        });
        if (!isAllowed) return false;
      }

      return true;
    });

    return NextResponse.json({
      models: permittedModels.map((m) => ({
        id: m.id,
        name: m.name || m.id,
        owned_by: m.owned_by,
        capabilities: m.capabilities,
      })),
      total: permittedModels.length,
    });
  } catch (error) {
    console.error("[API] Failed to get permitted models:", error);
    return NextResponse.json({ error: "Failed to fetch model catalog" }, { status: 500 });
  }
}
