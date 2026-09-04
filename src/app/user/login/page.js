"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserAuth } from "../UserAuthContext";
import { Card, Button, Input } from "@/shared/components";

export default function UserLoginPage() {
  const [keyInput, setKeyInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { apiKey, loginWithKey } = useUserAuth();
  const router = useRouter();

  useEffect(() => {
    if (apiKey) {
      router.push("/user/dashboard");
    }
  }, [apiKey, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setError("Please enter your API Key");
      return;
    }

    setSubmitting(true);
    setError("");

    const res = await loginWithKey(keyInput);
    if (res.success) {
      router.push("/user/dashboard");
    } else {
      setError(res.error || "Invalid API key");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary text-white mb-3 shadow-[4px_4px_0px_var(--color-border)] border-2 border-border">
            <span className="material-symbols-outlined text-[36px]">key</span>
          </div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">9Router User Portal</h1>
          <p className="text-sm text-text-muted mt-1">Enter your assigned API Key to access your usage metrics & quotas</p>
        </div>

        {/* Login Card */}
        <Card className="p-6 border-2 border-border shadow-[6px_6px_0px_var(--color-border)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Your API Key"
              placeholder="e.g. 9r-live-... or your client secret"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              disabled={submitting}
              autoFocus
              error={error}
              hint="Your API Key is stored safely in your local browser session"
            />

            <Button
              type="submit"
              disabled={submitting || !keyInput.trim()}
              className="w-full mt-2"
              size="lg"
            >
              {submitting ? "Verifying API Key..." : "Sign In to Portal"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
