import { getApiKeysUsageStats } from "@/lib/db/repos/apiKeysUsageRepo";
import { statsEmitter } from "@/lib/usageDb";

export const dynamic = "force-dynamic";

/**
 * GET /api/usage/keys/stream?period=today|24h|7d|30d|60d|all
 * Real-time SSE stream for API Key usage monitoring
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "7d";

  const encoder = new TextEncoder();
  const state = { closed: false, keepalive: null, send: null };

  const stream = new ReadableStream({
    async start(controller) {
      state.send = async () => {
        if (state.closed) return;
        try {
          const data = await getApiKeysUsageStats(period);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          state.closed = true;
          statsEmitter.off("update", state.send);
          clearInterval(state.keepalive);
        }
      };

      // Push initial state immediately
      await state.send();

      // Listen for background request/usage updates
      statsEmitter.on("update", state.send);

      // Keepalive ping every 25 seconds
      state.keepalive = setInterval(() => {
        if (state.closed) {
          clearInterval(state.keepalive);
          return;
        }
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          state.closed = true;
          clearInterval(state.keepalive);
        }
      }, 25000);
    },

    cancel() {
      state.closed = true;
      statsEmitter.off("update", state.send);
      clearInterval(state.keepalive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
