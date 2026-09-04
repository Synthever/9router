"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

const UserAuthContext = createContext(null);

export function UserAuthProvider({ children }) {
  const [apiKey, setApiKey] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUserInfo = useCallback(async (keyToUse) => {
    const activeKey = keyToUse || apiKey;
    if (!activeKey) {
      setUserInfo(null);
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/user/info", {
        headers: {
          "x-api-key": activeKey,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUserInfo(data);
        return data;
      } else {
        setUserInfo(null);
        return null;
      }
    } catch (e) {
      console.error("Failed to fetch user info:", e);
      setUserInfo(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  // Read saved API key on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("9router_user_api_key");
      if (saved) {
        setApiKey(saved);
        refreshUserInfo(saved);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, [refreshUserInfo]);

  const loginWithKey = async (keyInput) => {
    const trimmed = keyInput.trim();
    if (!trimmed) return { success: false, error: "API Key cannot be empty" };

    try {
      const res = await fetch("/api/user/info", {
        headers: { "x-api-key": trimmed },
      });

      if (res.ok) {
        const data = await res.json();
        setApiKey(trimmed);
        setUserInfo(data);
        localStorage.setItem("9router_user_api_key", trimmed);
        return { success: true };
      } else {
        const err = await res.json();
        return { success: false, error: err.error || "Invalid API Key" };
      }
    } catch (e) {
      return { success: false, error: "Failed to connect to gateway" };
    }
  };

  const logout = () => {
    setApiKey("");
    setUserInfo(null);
    try {
      localStorage.removeItem("9router_user_api_key");
    } catch {}
    router.push("/user/login");
  };

  return (
    <UserAuthContext.Provider
      value={{
        apiKey,
        userInfo,
        loading,
        loginWithKey,
        logout,
        refreshUserInfo,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error("useUserAuth must be used within UserAuthProvider");
  return ctx;
}
