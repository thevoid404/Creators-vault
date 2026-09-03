"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import {
  AUTH_EXPIRED_EVENT,
  clearTokens,
  getRefreshToken,
  hasSession,
  setTokens,
} from "./auth-tokens";
import type { User } from "./types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  /** Called by /auth/callback once tokens arrive in the query string. */
  completeLogin: (accessToken: string, refreshToken: string) => Promise<User>;
  logout: () => Promise<void>;
  logoutEverywhere: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const bootstrapped = useRef(false);

  const loadMe = useCallback(async () => {
    try {
      const me = await api.auth.me();
      setUser(me);
      setStatus("authenticated");
      return me;
    } catch {
      clearTokens();
      setUser(null);
      setStatus("unauthenticated");
      throw new Error("Not authenticated");
    }
  }, []);

  // Bootstrap once on mount.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    if (!hasSession()) {
      setStatus("unauthenticated");
      return;
    }
    loadMe().catch(() => {
      /* handled in loadMe */
    });
  }, [loadMe]);

  // React to a failed token refresh anywhere in the app.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setStatus("unauthenticated");
      router.replace("/login?expired=1");
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [router]);

  const completeLogin = useCallback(
    async (accessToken: string, refreshToken: string) => {
      setTokens(accessToken, refreshToken);
      setStatus("loading");
      return loadMe();
    },
    [loadMe],
  );

  const logout = useCallback(async () => {
    const rt = getRefreshToken();
    if (rt) {
      try {
        await api.auth.logout(rt);
      } catch {
        /* logout is idempotent server-side; ignore */
      }
    }
    clearTokens();
    setUser(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

  const logoutEverywhere = useCallback(async () => {
    try {
      await api.auth.logoutAll();
    } catch {
      /* ignore */
    }
    clearTokens();
    setUser(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      /* ignore transient failures */
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, completeLogin, logout, logoutEverywhere, refreshUser }),
    [user, status, completeLogin, logout, logoutEverywhere, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
