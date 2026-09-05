"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { marked } from "marked";
import { Card, Button, Badge, ModelSelectModal } from "@/shared/components";
import { cn } from "@/shared/utils/cn";

// Configure marked safely
marked.setOptions({ gfm: true, breaks: true });

const STARTER_PROMPTS = [
  {
    title: "Explain a concept",
    prompt: "Explain how AI routing and fallback mechanics work in simple terms with an example.",
    icon: "psychology",
  },
  {
    title: "Write code",
    prompt: "Write a high-performance Node.js function to stream OpenAI SSE responses with backpressure handling.",
    icon: "code",
  },
  {
    title: "System architecture",
    prompt: "Design a resilient multi-provider LLM gateway architecture with load balancing, circuit breakers, and rate limiting.",
    icon: "account_tree",
  },
  {
    title: "Debug & analyze",
    prompt: "Analyze the trade-offs between speculative decoding and prompt caching for large language models.",
    icon: "bug_report",
  },
];

const PRESET_SYSTEM_PROMPTS = [
  { label: "Default", prompt: "You are a helpful, expert AI assistant." },
  { label: "Senior Dev", prompt: "You are a senior full-stack software engineer. Provide clean, modular, production-ready code with minimal fluff." },
  { label: "JSON Mode", prompt: "You are a specialized data extractor. Always respond with raw, valid JSON only without markdown formatting." },
  { label: "Concise", prompt: "Be extremely concise, direct, and avoid polite conversational filler. Answer directly with bullet points or code." },
];

export default function PlaygroundClient() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("ag/gemini-3.7-flash-high");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful, expert AI assistant.");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [stream, setStream] = useState(true);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState("curl");

  const [activeProviders, setActiveProviders] = useState([]);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Load models and active providers
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [modelsRes, provRes] = await Promise.all([
          fetch("/api/v1/models"),
          fetch("/api/providers").catch(() => null),
        ]);

        if (modelsRes.ok) {
          const json = await modelsRes.json();
          const list = Array.isArray(json.data) ? json.data : [];
          setModels(list);
          if (list.length > 0 && !selectedModel) {
            setSelectedModel(list[0].id);
            setSelectedProvider(list[0].owned_by || "9router");
          }
        }

        if (provRes && provRes.ok) {
          const provJson = await provRes.json();
          setActiveProviders(provJson.connections || []);
        }
      } catch (e) {
        console.error("Failed to load models for playground:", e);
      }
    }
    loadInitialData();
  }, []);

  const handleSelectModelFromModal = (m) => {
    const val = m?.value || m?.id;
    if (val) {
      setSelectedModel(val);
      setSelectedProvider(m.provider || m.owned_by || "9router");
    }
    setModelPickerOpen(false);
  };

  // Send message
  const handleSend = async (customPrompt) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isStreaming) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!customPrompt) setInput("");

    setIsStreaming(true);
    setStatusMessage("Connecting to model...");

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      thinking: "",
      model: selectedModel,
      provider: selectedProvider,
      timestamp: new Date().toISOString(),
    };

    setMessages([...newMessages, assistantMessage]);

    abortControllerRef.current = new AbortController();

    try {
      const payloadMessages = [];
      if (systemPrompt.trim()) {
        payloadMessages.push({ role: "system", content: systemPrompt.trim() });
      }
      for (const m of newMessages) {
        payloadMessages.push({ role: m.role, content: m.content });
      }

      const res = await fetch("/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: payloadMessages,
          temperature: Number(temperature),
          max_tokens: Number(maxTokens),
          stream: stream,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || errJson.error || `HTTP ${res.status}`);
      }

      if (!stream) {
        const json = await res.json();
        const reply = json.choices?.[0]?.message?.content || "";
        const thinking = json.choices?.[0]?.message?.reasoning_content || "";
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: reply, thinking: thinking }
              : msg
          )
        );
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedText = "";
        let accumulatedThinking = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const dataStr = trimmed.slice(6);
            if (dataStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta || {};

              if (delta.reasoning_content || delta.thinking) {
                accumulatedThinking += delta.reasoning_content || delta.thinking;
              }
              if (delta.content) {
                accumulatedText += delta.content;
              }

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        content: accumulatedText,
                        thinking: accumulatedThinking,
                      }
                    : msg
                )
              );
            } catch (e) {
              // Ignore partial JSON parse errors
            }
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setStatusMessage("Generation cancelled");
      } else {
        console.error("Chat error:", err);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: `⚠️ **Error:** ${err.message || "Failed to generate response."}`,
                  isError: true,
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      setStatusMessage("");
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  // Generate code snippets
  const generateCode = (lang) => {
    const payloadMessages = [];
    if (systemPrompt.trim()) {
      payloadMessages.push({ role: "system", content: systemPrompt.trim() });
    }
    for (const m of messages) {
      payloadMessages.push({ role: m.role, content: m.content });
    }
    if (payloadMessages.length === 0) {
      payloadMessages.push({ role: "user", content: "Hello! How can you help me today?" });
    }

    const body = {
      model: selectedModel || "ag/gemini-3.7-flash-high",
      messages: payloadMessages,
      temperature: Number(temperature),
      max_tokens: Number(maxTokens),
      stream: stream,
    };

    if (lang === "curl") {
      return `curl http://localhost:20128/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_9ROUTER_API_KEY" \\
  -d '${JSON.stringify(body, null, 2)}'`;
    }

    if (lang === "python") {
      return `from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:20128/v1",
    api_key="YOUR_9ROUTER_API_KEY"
)

response = client.chat.completions.create(
    model="${body.model}",
    messages=${JSON.stringify(body.messages, null, 4)},
    temperature=${body.temperature},
    max_tokens=${body.max_tokens},
    stream=${body.stream ? "True" : "False"}
)

${body.stream ? `for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)` : `print(response.choices[0].message.content)`}`;
    }

    if (lang === "typescript" || lang === "javascript") {
      return `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "http://localhost:20128/v1",
  apiKey: "YOUR_9ROUTER_API_KEY"
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "${body.model}",
    messages: ${JSON.stringify(body.messages, null, 4)},
    temperature: ${body.temperature},
    max_tokens: ${body.max_tokens},
    stream: ${body.stream ? "true" : "false"}
  });

  ${body.stream ? `for await (const chunk of completion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }` : `console.log(completion.choices[0].message.content);`}
}

main();`;
    }

    return "";
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generateCode(codeLanguage));
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-105px)] min-h-[500px] gap-3 sm:gap-4 min-w-0 relative">
      {/* Top Controls Toolbar */}
      <Card className="p-3 sm:p-4 border-2 border-border shadow-[3px_3px_0px_var(--color-border)] flex items-center justify-between gap-2 shrink-0">
        {/* Model Picker Trigger Button */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setModelPickerOpen(true)}
            className={cn(
              "flex items-center gap-2 py-1.5 px-3 rounded border-2 border-border bg-surface text-left transition-all",
              "shadow-[2px_2px_0px_var(--color-border)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_var(--color-primary)]",
              "max-w-full truncate group cursor-pointer"
            )}
            title="Click to select model"
          >
            <span className="material-symbols-outlined text-[18px] text-brand-500 shrink-0">smart_toy</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-text-main truncate">
              {selectedModel || "Select Model..."}
            </span>
            <span className="material-symbols-outlined text-[18px] text-text-muted shrink-0 ml-auto">
              unfold_more
            </span>
          </button>

          {selectedProvider && (
            <Badge variant="outline" size="sm" className="hidden md:inline-flex font-mono shrink-0">
              {selectedProvider}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            icon="tune"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={cn(
              "p-2 sm:px-3",
              settingsOpen ? "bg-brand-500 text-white border-border" : ""
            )}
            title="Playground Parameters"
          >
            <span className="hidden sm:inline">Settings</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon="code"
            onClick={() => setExportModalOpen(true)}
            className="p-2 sm:px-3"
            title="Export API Code"
          >
            <span className="hidden sm:inline">Code</span>
          </Button>
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon="delete_sweep"
              onClick={handleClear}
              disabled={isStreaming}
              className="p-2 sm:px-3 text-red-500 hover:bg-red-500/10"
              title="Clear chat"
            >
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>
      </Card>

      {/* Main Studio Area */}
      <div className="flex-1 flex gap-4 min-h-0 min-w-0 relative">
        {/* Chat Conversation Viewport */}
        <Card
          padding="none"
          className="flex-1 flex flex-col border-2 border-border shadow-[3px_3px_0px_var(--color-border)] overflow-hidden bg-surface min-w-0"
        >
          {/* Messages Stream Container */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar min-w-0">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8 sm:py-12 px-2">
                <div className="size-12 rounded bg-brand-500/10 text-brand-500 flex items-center justify-center mb-4 border-2 border-border shadow-[2px_2px_0px_var(--color-border)]">
                  <span className="material-symbols-outlined text-2xl">sports_esports</span>
                </div>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-text-main">
                  Model Playground
                </h3>
                <p className="text-xs sm:text-sm text-text-muted mt-1 mb-6">
                  Interactive real-time model tester with thinking traces, streaming, and parameter tuning.
                </p>

                {/* Starter Prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full">
                  {STARTER_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(item.prompt)}
                      className={cn(
                        "p-3 rounded border-2 border-border bg-surface text-left transition-all cursor-pointer",
                        "shadow-[2px_2px_0px_var(--color-border)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_var(--color-primary)]",
                        "flex flex-col gap-1 group"
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-text-main group-hover:text-brand-500">
                        <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                        <span>{item.title}</span>
                      </div>
                      <p className="text-[11px] text-text-muted line-clamp-2">{item.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1.5 min-w-0 max-w-full",
                    msg.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  {/* Sender Header */}
                  <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-text-muted px-1">
                    <span>{msg.role === "user" ? "You" : msg.model || selectedModel}</span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {/* Thinking Section (if available) */}
                  {msg.thinking && (
                    <div className="w-full max-w-2xl rounded border-2 border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 p-3 shadow-[2px_2px_0px_var(--color-border)]">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider mb-1.5">
                        <span className="material-symbols-outlined text-[16px]">psychology</span>
                        Thinking Process
                      </div>
                      <div className="text-xs font-mono text-amber-900/90 dark:text-amber-100/90 whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                        {msg.thinking}
                      </div>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={cn(
                      "p-3 sm:p-4 rounded border-2 border-border text-xs sm:text-sm max-w-full sm:max-w-2xl min-w-0 shadow-[2px_2px_0px_var(--color-border)]",
                      msg.role === "user"
                        ? "bg-brand-500 text-white font-medium"
                        : "bg-surface text-text-main"
                    )}
                  >
                    {msg.role === "user" ? (
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    ) : (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none break-words [&>p]:mb-2 [&>pre]:my-2 [&>pre]:p-3 [&>pre]:rounded [&>pre]:border-2 [&>pre]:border-border [&>pre]:bg-black/5 dark:[&>pre]:bg-white/5"
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(msg.content || (isStreaming ? "Thinking..." : "")),
                        }}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer Input Bar */}
          <div className="p-2.5 sm:p-4 border-t-2 border-border bg-surface-2 shrink-0">
            <div className="relative flex flex-col gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Ask ${selectedModel || "AI"} anything... (Press Enter to send, Shift+Enter for newline)`}
                rows={2}
                disabled={isStreaming}
                className={cn(
                  "w-full py-2 px-3 text-xs sm:text-sm font-medium text-text-main bg-surface rounded",
                  "border-2 border-border shadow-[2px_2px_0px_var(--color-border)] placeholder-text-muted/70 resize-none",
                  "focus:outline-none focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[3px_3px_0px_var(--color-primary)] focus:border-brand-500",
                  "transition-all duration-100 ease-out"
                )}
              />

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-text-muted min-w-0 truncate">
                  <span className="font-mono text-[10px] sm:text-[11px] truncate">{selectedModel}</span>
                  {isStreaming && (
                    <span className="flex items-center gap-1 text-brand-500 font-bold animate-pulse shrink-0">
                      <span className="size-1.5 rounded-full bg-brand-500" />
                      Streaming...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isStreaming ? (
                    <Button
                      variant="outline"
                      size="sm"
                      icon="stop"
                      onClick={handleCancel}
                      className="border-red-500 text-red-500"
                    >
                      Stop
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      icon="send"
                      onClick={() => handleSend()}
                      disabled={!input.trim()}
                    >
                      Send
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Side Settings Drawer/Panel — Modal Overlay on Mobile, Sidebar on Desktop */}
        {settingsOpen && (
          <>
            {/* Mobile Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs"
              onClick={() => setSettingsOpen(false)}
            />

            <Card
              className={cn(
                "border-2 border-border shadow-[4px_4px_0px_var(--color-border)] p-4 sm:p-5 flex flex-col gap-4 bg-surface z-50 overflow-y-auto custom-scrollbar",
                "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm max-h-[85vh] rounded-lg",
                "lg:relative lg:top-auto lg:left-auto lg:translate-x-0 lg:translate-y-0 lg:w-80 lg:max-h-full lg:rounded lg:z-10 lg:shrink-0"
              )}
            >
              <div className="flex items-center justify-between pb-2 border-b-2 border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-main flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-brand-500">tune</span>
                  Playground Parameters
                </h4>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="p-1 rounded border-2 border-border bg-surface text-text-muted hover:bg-brand-500 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              {/* System Prompt & Presets */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-text-main">
                    System Prompt
                  </label>
                </div>
                {/* Presets Chips */}
                <div className="flex flex-wrap gap-1 mb-1">
                  {PRESET_SYSTEM_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSystemPrompt(p.prompt)}
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer",
                        systemPrompt === p.prompt
                          ? "bg-brand-500 text-white border-border"
                          : "bg-surface-2 text-text-muted hover:text-text-main border-border/50"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={3}
                  className="w-full py-1.5 px-2.5 text-xs text-text-main bg-surface rounded border-2 border-border shadow-[1px_1px_0px_var(--color-border)] focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {/* Temperature Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider">
                  <span className="text-text-main">Temperature</span>
                  <span className="font-mono text-brand-500 font-bold">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-brand-500"
                />
                <div className="flex justify-between text-[10px] text-text-muted font-medium">
                  <span>0.0 (Precise)</span>
                  <span>1.0 (Balanced)</span>
                  <span>2.0 (Creative)</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider">
                  <span className="text-text-main">Max Tokens</span>
                  <span className="font-mono text-brand-500 font-bold">{maxTokens}</span>
                </div>
                <input
                  type="number"
                  min="256"
                  max="65536"
                  step="256"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 4096)}
                  className="w-full py-1.5 px-2.5 text-xs font-mono text-text-main bg-surface rounded border-2 border-border shadow-[1px_1px_0px_var(--color-border)] focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Streaming Toggle */}
              <div className="flex items-center justify-between pt-3 border-t-2 border-border">
                <div>
                  <span className="text-xs font-bold text-text-main block">Stream Output</span>
                  <span className="text-[10px] text-text-muted">Real-time token streaming</span>
                </div>
                <input
                  type="checkbox"
                  checked={stream}
                  onChange={(e) => setStream(e.target.checked)}
                  className="size-4 accent-brand-500 cursor-pointer rounded"
                />
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => setSettingsOpen(false)}
                >
                  Done
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Model Select Modal (Standard Rich 9Router Model Picker) */}
      <ModelSelectModal
        isOpen={modelPickerOpen}
        onClose={() => setModelPickerOpen(false)}
        onSelect={handleSelectModelFromModal}
        selectedModel={selectedModel}
        activeProviders={activeProviders}
        title="Select Playground Model"
        closeOnSelect={true}
      />

      {/* Code Export Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <Card className="w-full max-w-2xl border-2 border-border shadow-[5px_5px_0px_var(--color-border)] p-4 sm:p-5 flex flex-col gap-4 bg-surface max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-brand-500">terminal</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-main">
                  Export API Code
                </h3>
              </div>
              <button
                onClick={() => setExportModalOpen(false)}
                className="p-1 rounded border-2 border-border bg-surface text-text-muted hover:bg-brand-500 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-2">
              {["curl", "python", "typescript"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setCodeLanguage(lang)}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all border-2 cursor-pointer",
                    codeLanguage === lang
                      ? "bg-brand-500 text-white border-border shadow-[1px_1px_0px_var(--color-border)]"
                      : "bg-surface text-text-muted hover:text-text-main border-transparent"
                  )}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Code Display */}
            <pre className="flex-1 overflow-auto p-3 sm:p-4 rounded border-2 border-border bg-black/5 dark:bg-white/5 font-mono text-xs text-text-main max-h-[45vh] custom-scrollbar">
              {generateCode(codeLanguage)}
            </pre>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={copiedCode ? "check" : "content_copy"}
                onClick={handleCopyCode}
              >
                {copiedCode ? "Copied!" : "Copy Snippet"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
