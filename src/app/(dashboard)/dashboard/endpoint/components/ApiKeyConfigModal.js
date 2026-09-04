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
        maxTokens: maxTokens.trim() ? parseInt(maxTokens.trim(), 10) : null,
        maxCost: maxCost.trim() ? parseFloat(maxCost.trim()) : null,
        resetPeriod: resetPeriod || "none",
        multiplier: multiplier.trim() ? parseFloat(multiplier.trim()) : 1.0,
        rateLimitRpm: rateLimitRpm.trim() ? parseInt(rateLimitRpm.trim(), 10) : null,
        rateLimitTpm: rateLimitTpm.trim() ? parseInt(rateLimitTpm.trim(), 10) : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        allowedModels: allowedModels.trim()
          ? allowedModels.split(",").map(m => m.trim()).filter(Boolean)
          : null,
        blockedModels: blockedModels.trim()
          ? blockedModels.split(",").map(m => m.trim()).filter(Boolean)
          : null,
        maxTokensPerRequest: maxTokensPerRequest.trim() ? parseInt(maxTokensPerRequest.trim(), 10) : null,
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
    <Modal isOpen={isOpen} title={`Configure API Key: ${apiKey.name}`} onClose={onClose} size="xl">
      <div className="flex flex-col gap-6 max-h-[75vh] overflow-y-auto px-1 py-1 custom-scrollbar">
        {/* Section: Basic Settings */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">badge</span>
            General Information
          </h3>
          <div>
            <Input
              label="Key Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Client App, Dev Environment"
            />
          </div>
        </div>

        {/* Section: Quota & Billing */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">data_usage</span>
            Quota & Limits
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Max Tokens Quota"
              type="number"
              min="0"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              placeholder="Unlimited (Default)"
              hint="Leave empty for unlimited tokens"
            />
            <Input
              label="Max Cost ($ USD)"
              type="number"
              step="0.01"
              min="0"
              value={maxCost}
              onChange={(e) => setMaxCost(e.target.value)}
              placeholder="Unlimited (Default)"
              hint="Leave empty for unlimited cost"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-text-main">
                Quota Reset Cycle
              </label>
              <div className="relative">
                <select
                  value={resetPeriod}
                  onChange={(e) => setResetPeriod(e.target.value)}
                  className="w-full py-2 px-3 pr-10 text-sm font-medium text-text-main bg-surface border-2 border-border rounded shadow-[2px_2px_0px_var(--color-border)] appearance-none focus:outline-none focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[3px_3px_0px_var(--color-primary)] focus:border-brand-500 transition-all duration-100 text-[16px] sm:text-sm"
                >
                  <option value="none">No Reset (Lifetime Total)</option>
                  <option value="daily">Daily Reset (Midnight)</option>
                  <option value="monthly">Monthly Reset (1st of month)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-main font-bold">
                  <span className="material-symbols-outlined text-[20px]">expand_more</span>
                </div>
              </div>
              <p className="text-xs text-text-muted">Cycle to reset token/cost counts</p>
            </div>
          </div>
        </div>

        {/* Section: Request Controls */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">tune</span>
            Request & Multiplier Controls
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Token Multiplier (Billing Markup)"
              type="number"
              step="0.1"
              min="0"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              placeholder="1.0"
              hint="e.g. 1.5 = 1.5x usage recorded in analytics"
            />
            <Input
              label="Max Output Tokens / Request"
              type="number"
              min="0"
              value={maxTokensPerRequest}
              onChange={(e) => setMaxTokensPerRequest(e.target.value)}
              placeholder="e.g. 4096 (Empty = Uncapped)"
              hint="Caps the max_tokens per individual request"
            />
          </div>
        </div>

        {/* Section: Rate Limiting & Expiry */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">speed</span>
            Rate Limiting & Expiration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Rate Limit (RPM)"
              type="number"
              min="0"
              value={rateLimitRpm}
              onChange={(e) => setRateLimitRpm(e.target.value)}
              placeholder="Unlimited (Default)"
              hint="Max requests per minute"
            />
            <Input
              label="Rate Limit (TPM)"
              type="number"
              min="0"
              value={rateLimitTpm}
              onChange={(e) => setRateLimitTpm(e.target.value)}
              placeholder="Unlimited (Default)"
              hint="Max tokens per minute"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-text-main">
                Expiration Date
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full py-2 px-3 text-sm font-medium text-text-main bg-surface rounded border-2 border-border shadow-[2px_2px_0px_var(--color-border)] focus:outline-none focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[3px_3px_0px_var(--color-primary)] focus:border-brand-500 transition-all duration-100 ease-out text-[16px] sm:text-sm"
              />
              <p className="text-xs text-text-muted">Key stops working after this time</p>
            </div>
          </div>
        </div>

        {/* Section: Model Restrictions */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">lock</span>
            Model Restrictions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Allowed Models (Whitelist)"
              value={allowedModels}
              onChange={(e) => setAllowedModels(e.target.value)}
              placeholder="ag/gemini-*, qd/claude-3-5-sonnet"
              hint="Comma separated. Leave empty for all models"
            />
            <Input
              label="Blocked Models (Blacklist)"
              value={blockedModels}
              onChange={(e) => setBlockedModels(e.target.value)}
              placeholder="claude-3-opus, gpt-4"
              hint="Comma separated. Leave empty for none"
            />
          </div>
        </div>

        {/* Section: Allowed Endpoints / Modality */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">hub</span>
            Allowed Endpoints / Modality
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {[
              { key: "chat", label: "Chat / Text", icon: "chat" },
              { key: "embeddings", label: "Embeddings", icon: "scatter_plot" },
              { key: "images", label: "Images", icon: "image" },
              { key: "audio", label: "Audio / TTS", icon: "volume_up" },
              { key: "fetch", label: "Web Fetch", icon: "language" },
            ].map((ep) => {
              const checked = allowedEndpoints[ep.key];
              return (
                <label
                  key={ep.key}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded border-2 cursor-pointer select-none transition-all duration-100 ${
                    checked
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-[2px_2px_0px_var(--color-primary)]"
                      : "border-border bg-surface text-text-muted opacity-70 hover:opacity-100 shadow-[1px_1px_0px_var(--color-border)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={checked}
                    onChange={(e) =>
                      setAllowedEndpoints((prev) => ({
                        ...prev,
                        [ep.key]: e.target.checked,
                      }))
                    }
                  />
                  <span className="material-symbols-outlined text-[18px]">
                    {checked ? "check_box" : "check_box_outline_blank"}
                  </span>
                  <span className="text-xs truncate">{ep.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 justify-end pt-4 mt-2 border-t-2 border-border">
          <Button variant="ghost" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
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
