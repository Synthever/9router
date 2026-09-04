"use client";

import { useState, useEffect } from "react";
import { useUserAuth } from "../UserAuthContext";
import { Card, Button, Input } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

export default function UserDocsPage() {
  const { apiKey, userInfo } = useUserAuth();
  const { copied, copy } = useCopyToClipboard();
  const [activeTab, setActiveTab] = useState("curl");
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");

  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}/v1` : "http://localhost:20128/v1";
  const userKey = apiKey || "sk-your-api-key";

  // Fetch permitted models for this user
  useEffect(() => {
    if (!apiKey) return;
    fetch("/api/user/models", {
      headers: { "x-api-key": apiKey },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const modelsList = data?.models || [];
        setAvailableModels(modelsList);
        if (modelsList.length > 0) {
          setSelectedModel(modelsList[0].id);
        } else {
          // Fallback to allowed models list from governance or default
          const allowed = userInfo?.governance?.allowedModels;
          if (allowed && allowed.length > 0) {
            setSelectedModel(allowed[0]);
          } else {
            setSelectedModel("ag/gemini-2.5-flash");
          }
        }
      })
      .catch(() => {
        const allowed = userInfo?.governance?.allowedModels;
        if (allowed && allowed.length > 0) {
          setSelectedModel(allowed[0]);
        } else {
          setSelectedModel("ag/gemini-2.5-flash");
        }
      });
  }, [apiKey, userInfo]);

  const activeModel = selectedModel || "ag/gemini-2.5-flash";
  const modelsListText = availableModels.length > 0
    ? availableModels.slice(0, 4).map(m => m.id).join(", ")
    : activeModel;

  const snippets = {
    curl: `curl -X POST "${baseUrl}/chat/completions" \\
  -H "Authorization: Bearer ${userKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${activeModel}",
    "messages": [
      { "role": "user", "content": "Hello 9Router!" }
    ],
    "stream": false
  }'`,

    python: `from openai import OpenAI

client = OpenAI(
    base_url="${baseUrl}",
    api_key="${userKey}"
)

response = client.chat.completions.create(
    model="${activeModel}",
    messages=[
        {"role": "user", "content": "Hello from Python client!"}
    ]
)

print(response.choices[0].message.content)`,

    nodejs: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${baseUrl}",
  apiKey: "${userKey}",
});

async function main() {
  const completion = await client.chat.completions.create({
    model: "${activeModel}",
    messages: [{ role: "user", content: "Hello from Node.js!" }],
  });

  console.log(completion.choices[0].message.content);
}

main();`,

    cursor: `// Cursor IDE / Cline / Roo Code Settings:
// Base URL:
${baseUrl}

// API Key:
${userKey}

// Selected Model:
${activeModel}

// Available Models for this Key:
// ${modelsListText}`,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Quick Start & Integration</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Plug your 9Router API Key directly into standard OpenAI SDKs, CLI tools, or REST clients.
        </p>
      </div>

      {/* Endpoint Connection Parameters */}
      <Card className="p-5 border-2 border-border shadow-[4px_4px_0px_var(--color-border)] flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-main flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">link</span>
          Connection Parameters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-text-muted uppercase">Base URL (OpenAI Compatible)</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-surface-2 p-2.5 rounded border border-border text-text-main select-all truncate">
                {baseUrl}
              </code>
              <Button size="sm" variant="secondary" icon={copied === "base_url" ? "check" : "content_copy"} onClick={() => copy(baseUrl, "base_url")}>
                {copied === "base_url" ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-text-muted uppercase">Your API Key</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-surface-2 p-2.5 rounded border border-border text-text-main select-all truncate">
                {userKey}
              </code>
              <Button size="sm" variant="secondary" icon={copied === "key_doc" ? "check" : "content_copy"} onClick={() => copy(userKey, "key_doc")}>
                {copied === "key_doc" ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-text-muted uppercase">Selected Model in Snippets</span>
            <div className="relative">
              {availableModels.length > 0 ? (
                <select
                  value={activeModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full py-2 px-3 pr-8 text-xs font-mono font-medium text-text-main bg-surface-2 border-2 border-border rounded shadow-[2px_2px_0px_var(--color-border)] appearance-none focus:outline-none focus:border-brand-500"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.id}
                    </option>
                  ))}
                </select>
              ) : (
                <code className="block w-full text-xs font-mono bg-surface-2 p-2.5 rounded border border-border text-text-main truncate">
                  {activeModel}
                </code>
              )}
              {availableModels.length > 0 && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-text-main font-bold">
                  <span className="material-symbols-outlined text-[16px]">expand_more</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Code Snippets Card */}
      <Card className="overflow-hidden border-2 border-border shadow-[4px_4px_0px_var(--color-border)]" padding="none">
        {/* Language Tabs */}
        <div className="flex items-center justify-between border-b-2 border-border bg-surface-2 px-4 py-2">
          <div className="flex items-center gap-1">
            {[
              { id: "curl", label: "cURL" },
              { id: "python", label: "Python (OpenAI SDK)" },
              { id: "nodejs", label: "Node.js / TypeScript" },
              { id: "cursor", label: "Cursor / Cline Presets" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-[2px_2px_0px_var(--color-border)]"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="ghost"
            icon={copied === activeTab ? "check" : "content_copy"}
            onClick={() => copy(snippets[activeTab], activeTab)}
          >
            {copied === activeTab ? "Copied!" : "Copy Code"}
          </Button>
        </div>

        {/* Code Content */}
        <div className="p-4 bg-black/[0.03] dark:bg-black/30 overflow-x-auto">
          <pre className="text-xs font-mono text-text-main whitespace-pre">
            {snippets[activeTab]}
          </pre>
        </div>
      </Card>
    </div>
  );
}
