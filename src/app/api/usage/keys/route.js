import { NextResponse } from "next/server";
import { getApiKeysUsageStats } from "@/lib/db/repos/apiKeysUsageRepo";

export const dynamic = "force-dynamic";

/**
 * GET /api/usage/keys?period=today|24h|7d|30d|60d|all
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";

    const data = await getApiKeysUsageStats(period);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Failed to fetch API key usage:", error);
    return NextResponse.json({ error: "Failed to fetch API key usage stats" }, { status: 500 });
  }
}
