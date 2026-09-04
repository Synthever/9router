"use client";

import { useState } from "react";
import { useUserAuth } from "../UserAuthContext";
import { Card, Button, Input } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

export default function UserDocsPage() {
  const { apiKey } = useUserAuth();
  const { copied, copy } = useCopyToClipboard();
  const [activeTab, setActiveTab] = useState("curl");

  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}/v1` : "http://localhost:20128/v1";
  const userKey = apiKey || "sk-your-api-key";

  const snippets = {
    curl: `curl -X POST "${baseUrl}/chat/completions" \\
  -H "Authorization: Bearer ${userKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "ag/gemini-2.5-flash",
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
    model="ag/gemini-2.5-flash",
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
    model: "ag/gemini-2.5-flash",
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

// Compatible Models:
// ag/gemini-2.5-flash, qd/claude-3-5-sonnet, or any model from Available Models tab`,
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-text-muted uppercase">Base URL (OpenAI Compatible)</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-surface-2 p-2.5 rounded border border-border text-text-main select-all">
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
