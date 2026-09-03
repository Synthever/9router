"use client";

import { useState, useEffect } from "react";
import { getDefaultPricing, formatCost } from "open-sse/providers/pricing.js";
import { Button } from "@/shared/components";

export default function PricingModal({ isOpen, onClose, onSave }) {
  const [pricingData, setPricingData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPricing();
    }
  }, [isOpen]);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/pricing");
      if (response.ok) {
        const data = await response.json();
        setPricingData(data);
      } else {
        const defaults = getDefaultPricing();
        setPricingData(defaults);
      }
    } catch (error) {
      console.error("Failed to load pricing:", error);
      const defaults = getDefaultPricing();
      setPricingData(defaults);
    } finally {
      setLoading(false);
    }
  };

  const handlePricingChange = (provider, model, field, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    setPricingData(prev => {
      const newData = { ...prev };
      if (!newData[provider]) newData[provider] = {};
      if (!newData[provider][model]) newData[provider][model] = {};
      newData[provider][model][field] = numValue;
      return newData;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricingData)
      });

      if (response.ok) {
        onSave?.();
        onClose();
      } else {
        const error = await response.json();
        alert(`Failed to save pricing: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to save pricing:", error);
      alert("Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all pricing to defaults? This cannot be undone.")) return;

    try {
      const response = await fetch("/api/pricing", { method: "DELETE" });
      if (response.ok) {
        const defaults = getDefaultPricing();
        setPricingData(defaults);
      }
    } catch (error) {
      console.error("Failed to reset pricing:", error);
      alert("Failed to reset pricing");
    }
  };

  if (!isOpen) return null;

  const allProviders = Object.keys(pricingData).sort();
  const pricingFields = ["input", "output", "cached", "reasoning", "cache_creation"];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface border-2 border-border rounded-lg shadow-[6px_6px_0px_var(--color-border)] max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col text-text-main">
        {/* Header */}
        <div className="p-4 border-b-2 border-border bg-surface-2 flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight">Pricing Configuration</h2>
          <button
            onClick={onClose}
            className="p-1 rounded border-2 border-border bg-surface hover:bg-danger hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-text-muted font-bold">Loading pricing data...</div>
          ) : (
            <>
              {/* Instructions */}
              <div className="bg-surface-2 border-2 border-border rounded p-3 text-sm shadow-[2px_2px_0px_var(--color-border)]">
                <p className="font-bold text-text-main mb-1">Pricing Rates Format</p>
                <p className="text-text-muted">
                  All rates are in <strong>dollars per million tokens</strong> ($/1M tokens).
                </p>
              </div>

              {/* Table per provider */}
              <div className="space-y-6">
                {allProviders.map(provider => {
                  const models = Object.keys(pricingData[provider] || {}).sort();
                  if (models.length === 0) return null;

                  return (
                    <div key={provider} className="border-2 border-border rounded bg-surface overflow-hidden shadow-[3px_3px_0px_var(--color-border)]">
                      <div className="p-3 bg-surface-2 border-b-2 border-border font-black text-sm uppercase tracking-wider text-text-main">
                        {provider}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="border-b-2 border-border bg-surface-3 font-bold text-text-main">
                            <tr>
                              <th className="p-2.5 border-r border-border">Model</th>
                              <th className="p-2.5 border-r border-border">Input ($/1M)</th>
                              <th className="p-2.5 border-r border-border">Output ($/1M)</th>
                              <th className="p-2.5 border-r border-border">Cached ($/1M)</th>
                              <th className="p-2.5 border-r border-border">Reasoning ($/1M)</th>
                              <th className="p-2.5">Cache Creation ($/1M)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {models.map(model => {
                              const rates = pricingData[provider][model] || {};
                              return (
                                <tr key={model} className="border-b border-border/50 hover:bg-surface-2/60">
                                  <td className="p-2.5 font-mono font-bold text-brand-500 border-r border-border">{model}</td>
                                  {pricingFields.map(field => (
                                    <td key={field} className="p-1.5 border-r border-border last:border-r-0">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={rates[field] ?? ""}
                                        onChange={(e) => handlePricingChange(provider, model, field, e.target.value)}
                                        placeholder="0"
                                        className="w-full p-1.5 font-mono text-xs border border-border rounded bg-surface focus:border-brand-500 focus:outline-none"
                                      />
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-border bg-surface-2 flex items-center justify-between">
          <Button variant="danger" size="sm" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
