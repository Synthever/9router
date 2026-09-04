"use client";

import { useEffect, useState, useCallback } from "react";
import { useUserAuth } from "../UserAuthContext";
import { Card, Button, Input, Badge } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

export default function UserModelsPage() {
  const { apiKey } = useUserAuth();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { copied, copy } = useCopyToClipboard();

  const fetchModels = useCallback(async () => {
    if (!apiKey) return;
    try {
      setLoading(true);
      const res = await fetch("/api/user/models", {
        headers: { "x-api-key": apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
      }
    } catch (e) {
      console.error("Failed to load models:", e);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const filteredModels = models.filter((m) =>
    (m.id || "").toLowerCase().includes(search.toLowerCase().trim()) ||
    (m.name || "").toLowerCase().includes(search.toLowerCase().trim()) ||
    (m.owned_by || "").toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Available AI Models</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Models permitted for your API Key. Copy any model ID to use in your API payloads.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-80">
          <Input
            icon="search"
            placeholder="Search model name or id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="secondary" size="sm" icon="refresh" onClick={fetchModels} disabled={loading} />
        </div>
      </div>

      {/* Models Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-muted">
          <span className="material-symbols-outlined text-[32px] animate-spin">progress_activity</span>
        </div>
      ) : filteredModels.length === 0 ? (
        <Card className="py-16 text-center text-text-muted border-2 border-border">
          No models matched your search or allowed whitelist.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredModels.map((m) => {
            const caps = m.capabilities || {};
            return (
              <Card
                key={m.id}
                className="p-4 border-2 border-border shadow-[3px_3px_0px_var(--color-border)] hover:border-primary transition-all flex flex-col justify-between gap-3"
              >
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-text-main truncate" title={m.name || m.id}>
                      {m.name || m.id}
                    </span>
                    {m.owned_by && (
                      <Badge variant="neutral" size="sm" className="shrink-0 uppercase text-[10px]">
                        {m.owned_by}
                      </Badge>
                    )}
                  </div>

                  <code className="text-xs font-mono text-text-muted bg-black/[0.04] dark:bg-white/[0.04] p-1.5 rounded border border-border break-all">
                    {m.id}
                  </code>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex flex-wrap gap-1">
                    {caps.tools && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">Tools</span>}
                    {caps.vision && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-success/10 text-success">Vision</span>}
                    {caps.thinking && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">Thinking</span>}
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    icon={copied === m.id ? "check" : "content_copy"}
                    onClick={() => copy(m.id, m.id)}
                  >
                    {copied === m.id ? "Copied" : "Copy ID"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
