"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Input } from "@/shared/components";

export default function ApiKeyConfigModal({ isOpen, onClose, apiKey, onSave }) {
  const [name, setName] = useState("");
  const [maxTokens, setMaxTokens] = useState("");
  const [maxCost, setMaxCost] = useState("");
  const [resetPeriod, setResetPeriod] = useState("none");
  const [multiplier, setMultiplier] = useState("1.0");
  const [rateLimitRpm, setRateLimitRpm] = useState("");
  const [rateLimitTpm, setRateLimitTpm] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [allowedModels, setAllowedModels] = useState("");
  const [blockedModels, setBlockedModels] = useState("");
  const [maxTokensPerRequest, setMaxTokensPerRequest] = useState("");
  const [allowedEndpoints, setAllowedEndpoints] = useState({
    chat: true,
    embeddings: true,
    images: true,
    audio: true,
    fetch: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (apiKey) {
      setName(apiKey.name || "");
      const cfg = apiKey.config || {};
      setMaxTokens(cfg.maxTokens ? String(cfg.maxTokens) : "");
      setMaxCost(cfg.maxCost ? String(cfg.maxCost) : "");
      setResetPeriod(cfg.resetPeriod || "none");
      setMultiplier(cfg.multiplier !== undefined ? String(cfg.multiplier) : "1.0");
      setRateLimitRpm(cfg.rateLimitRpm ? String(cfg.rateLimitRpm) : "");
      setRateLimitTpm(cfg.rateLimitTpm ? String(cfg.rateLimitTpm) : "");
      
      if (cfg.expiresAt) {
        try {
          const d = new Date(cfg.expiresAt);
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setExpiresAt(localIso);
        } catch {
          setExpiresAt("");
        }
      } else {
        setExpiresAt("");
      }

      setAllowedModels(Array.isArray(cfg.allowedModels) ? cfg.allowedModels.join(", ") : "");
      setBlockedModels(Array.isArray(cfg.blockedModels) ? cfg.blockedModels.join(", ") : "");
      setMaxTokensPerRequest(cfg.maxTokensPerRequest ? String(cfg.maxTokensPerRequest) : "");
      
      if (Array.isArray(cfg.allowedEndpoints)) {
        const set = new Set(cfg.allowedEndpoints.map(e => e.toLowerCase()));
        setAllowedEndpoints({
          chat: set.has("chat"),
          embeddings: set.has("embeddings"),
          images: set.has("images"),
          audio: set.has("audio") || set.has("speech") || set.has("transcriptions"),
          fetch: set.has("fetch") || set.has("web"),
        });
      } else {
        setAllowedEndpoints({
          chat: true,
          embeddings: true,
          images: true,
          audio: true,
          fetch: true,
        });
      }
    }
  }, [apiKey, isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const endpoints = [];
      if (allowedEndpoints.chat) endpoints.push("chat");
      if (allowedEndpoints.embeddings) endpoints.push("embeddings");
      if (allowedEndpoints.images) endpoints.push("images");
      if (allowedEndpoints.audio) endpoints.push("audio");
      if (allowedEndpoints.fetch) endpoints.push("fetch");

      const config = {
        maxTokens: maxTokens ? parseInt(maxTokens, 10) : null,
        maxCost: maxCost ? parseFloat(maxCost) : null,
        resetPeriod: resetPeriod || "none",
        multiplier: multiplier ? parseFloat(multiplier) : 1.0,
        rateLimitRpm: rateLimitRpm ? parseInt(rateLimitRpm, 10) : null,
        rateLimitTpm: rateLimitTpm ? parseInt(rateLimitTpm, 10) : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        allowedModels: allowedModels.trim()
          ? allowedModels.split(",").map(m => m.trim()).filter(Boolean)
          : null,
        blockedModels: blockedModels.trim()
          ? blockedModels.split(",").map(m => m.trim()).filter(Boolean)
          : null,
        maxTokensPerRequest: maxTokensPerRequest ? parseInt(maxTokensPerRequest, 10) : null,
        allowedEndpoints: endpoints.length === 5 ? null : endpoints,
      };

      await onSave({
        id: apiKey.id,
        name: name.trim() || apiKey.name,
        config,
      });
      onClose();
    } catch (e) {
      console.error("Failed to save API Key configuration:", e);
    } finally {
      setSaving(false);
    }
  };

  if (!apiKey) return null;

  return (
    <Modal isOpen={isOpen} title={`Configure API Key: ${apiKey.name}`} onClose={onClose} size="lg">
      <div className="flex flex-col gap-5 max-h-[75vh] overflow-y-auto px-1 py-2">
        {/* Basic Name */}
        <Input
          label="Key Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Client App, Dev Environment"
        />

        {/* Token & Cost Quotas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Max Tokens Quota"
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            placeholder="e.g. 1000000 (Empty = Unlimited)"
          />
          <Input
            label="Max Cost ($ USD)"
            type="number"
            step="0.01"
            value={maxCost}
            onChange={(e) => setMaxCost(e.target.value)}
            placeholder="e.g. 10.00 (Empty = Unlimited)"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Quota Reset Cycle
            </label>
            <select
              value={resetPeriod}
              onChange={(e) => setResetPeriod(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="none">No Reset (Lifetime Total)</option>
              <option value="daily">Daily Reset (Midnight)</option>
              <option value="monthly">Monthly Reset (1st of month)</option>
            </select>
          </div>
        </div>

        {/* Multiplier & Cap */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Token Multiplier (Billing Markup)"
            type="number"
            step="0.1"
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.value)}
            placeholder="1.0 (e.g. 1.5 = 1.5x usage recorded)"
          />
          <Input
            label="Max Output Tokens / Request"
            type="number"
            value={maxTokensPerRequest}
            onChange={(e) => setMaxTokensPerRequest(e.target.value)}
            placeholder="e.g. 4096 (Cap max_tokens)"
          />
        </div>

        {/* Rate Limiting */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Rate Limit (RPM)"
            type="number"
            value={rateLimitRpm}
            onChange={(e) => setRateLimitRpm(e.target.value)}
            placeholder="Requests / min (Empty = Unlimited)"
          />
          <Input
            label="Rate Limit (TPM)"
            type="number"
            value={rateLimitTpm}
            onChange={(e) => setRateLimitTpm(e.target.value)}
            placeholder="Tokens / min (Empty = Unlimited)"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Expiration Date
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Model Restrictions */}
        <div className="flex flex-col gap-3">
          <Input
            label="Allowed Models (Whitelist)"
            value={allowedModels}
            onChange={(e) => setAllowedModels(e.target.value)}
            placeholder="Comma separated: ag/gemini-*, qd/claude-3-5-sonnet (Leave empty for all)"
          />
          <Input
            label="Blocked Models (Blacklist)"
            value={blockedModels}
            onChange={(e) => setBlockedModels(e.target.value)}
            placeholder="Comma separated: claude-3-opus, gpt-4 (Leave empty for none)"
          />
        </div>

        {/* Allowed Endpoints / Modality */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Allowed Endpoints / Modality
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { key: "chat", label: "Chat / Text" },
              { key: "embeddings", label: "Embeddings" },
              { key: "images", label: "Images" },
              { key: "audio", label: "Audio / TTS" },
              { key: "fetch", label: "Web Fetch" },
            ].map((ep) => (
              <label
                key={ep.key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-all ${
                  allowedEndpoints[ep.key]
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-bg-subtle text-text-muted opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={allowedEndpoints[ep.key]}
                  onChange={(e) =>
                    setAllowedEndpoints((prev) => ({
                      ...prev,
                      [ep.key]: e.target.checked,
                    }))
                  }
                />
                <span className="material-symbols-outlined text-[16px]">
                  {allowedEndpoints[ep.key] ? "check_box" : "check_box_outline_blank"}
                </span>
                {ep.label}
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

ApiKeyConfigModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  apiKey: PropTypes.object,
  onSave: PropTypes.func.isRequired,
};
