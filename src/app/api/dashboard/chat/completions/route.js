import { handleChat } from "@/sse/handlers/chat.js";
import { initTranslators } from "open-sse/translator/index.js";

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await initTranslators();
    initialized = true;
  }
}

export const dynamic = "force-dynamic";

export async function POST(request) {
  await ensureInitialized();
  return await handleChat(request);
}
