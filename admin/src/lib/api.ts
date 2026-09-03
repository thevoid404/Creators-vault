/**
 * The one and only place the admin panel talks to the backend.
 *
 * Built from ../backend/api.md, same approach as the main frontend. Every
 * component calls through `api.*` — never `fetch` directly.
 *
 * - Base URL from NEXT_PUBLIC_API_BASE_URL (includes the /api/v1 prefix).
 * - Bearer access token attached automatically.
 * - On 401, one refresh-token rotation is attempted, then the call is retried.
 *   If refresh fails, tokens are cleared and `cv-admin:auth-expired` fires.
 */

import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  notifyAuthExpired,
} from "./auth-tokens";
import type {
  AdminActionResult,
  AdminListAssetsQuery,
  AdminListTransactionsQuery,
  AdminListUsersQuery,
  AdminUserDetail,
  ApiErrorShape,
  Asset,
  AuthTokens,
  HealthStatus,
  Listing,
  Paginated,
  PaymentsStatus,
  PlatformStats,
  SystemStatus,
  Transaction,
  UpdateUserAdminInput,
  User,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

/* ------------------------------------------------------------------ *
 * Error type
 * ------------------------------------------------------------------ */

export class ApiError extends Error {
  readonly status: number;
  readonly error: string;
  readonly messages: string[];
  readonly path?: string;

  constructor(status: number, body: Partial<ApiErrorShape> | null, fallback: string) {
    const messages = body?.message
      ? Array.isArray(body.message)
        ? body.message
        : [body.message]
      : [fallback];
    super(messages[0] ?? fallback);
    this.name = "ApiError";
    this.status = status;
    this.error = body?.error ?? "Error";
    this.messages = messages;
    this.path = body?.path;
  }

  get isNotImplemented() {
    return this.status === 501;
  }
  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
}

/* ------------------------------------------------------------------ *
 * Query string
 * ------------------------------------------------------------------ */

type QueryInput = object;

function buildQuery(params?: QueryInput): string {
  if (!params) return "";
  const parts: string[] = [];
  for (const [key, raw] of Object.entries(params as Record<string, unknown>)) {
    if (raw === undefined || raw === null || raw === "") continue;
    if (Array.isArray(raw)) {
      if (raw.length === 0) continue;
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(raw.join(","))}`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(raw))}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

/* ------------------------------------------------------------------ *
 * Core request
 * ------------------------------------------------------------------ */

interface RequestOptions {
  query?: QueryInput;
  body?: unknown;
  auth?: boolean;
  token?: string;
  signal?: AbortSignal;
  _isRetry?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearTokens();
        return false;
      }
      const tokens = (await res.json()) as AuthTokens;
      setTokens(tokens.accessToken, tokens.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function request<T>(
  method: string,
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { query, body, auth = true, token, signal, _isRetry = false } = opts;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const bearer = token ?? (auth ? getAccessToken() : null);
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`;

  const res = await fetch(`${API_BASE_URL}${path}${buildQuery(query)}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    cache: "no-store",
  });

  if (res.status === 401 && auth && !_isRetry && !token) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(method, path, { ...opts, _isRetry: true });
    }
    clearTokens();
    notifyAuthExpired();
  }

  if (res.status === 204) return undefined as T;

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (payload && typeof payload === "object" ? payload : null) as ApiErrorShape | null,
      res.statusText || "Request failed",
    );
  }

  return payload as T;
}

const get = <T>(path: string, query?: RequestOptions["query"], opts?: RequestOptions) =>
  request<T>("GET", path, { ...opts, query });
const post = <T>(path: string, body?: unknown, opts?: RequestOptions) =>
  request<T>("POST", path, { ...opts, body });
const patch = <T>(path: string, body?: unknown, opts?: RequestOptions) =>
  request<T>("PATCH", path, { ...opts, body });

/* ------------------------------------------------------------------ *
 * Grouped API surface — only what the admin panel needs
 * ------------------------------------------------------------------ */

export const api = {
  auth: {
    /** Full URL to open in the browser to start OAuth for the admin panel. */
    oauthStartUrl: (provider: "google" | "github") =>
      `${API_BASE_URL}/auth/${provider}?state=admin`,
    logout: (refreshToken: string) =>
      post<void>("/auth/logout", { refreshToken }, { auth: false }),
    logoutAll: () => post<{ revokedSessions: number }>("/auth/logout-all"),
    me: (token?: string) => get<User>("/auth/me", undefined, { token }),
  },

  payments: {
    status: () => get<PaymentsStatus>("/payments/status", undefined, { auth: false }),
  },

  health: {
    get: () => get<HealthStatus>("/health", undefined, { auth: false }),
  },

  admin: {
    stats: () => get<PlatformStats>("/admin/stats"),

    users: (query?: AdminListUsersQuery) => get<Paginated<User>>("/admin/users", query),
    user: (id: string) => get<AdminUserDetail>(`/admin/users/${id}`),
    updateUser: (id: string, input: UpdateUserAdminInput) =>
      patch<User>(`/users/${id}`, input),
    suspendUser: (id: string) => post<AdminActionResult>(`/admin/users/${id}/suspend`),
    reactivateUser: (id: string) =>
      post<AdminActionResult>(`/admin/users/${id}/reactivate`),

    assets: (query?: AdminListAssetsQuery) => get<Paginated<Asset>>("/admin/assets", query),
    asset: (id: string) => get<Asset>(`/admin/assets/${id}`),
    hideAsset: (id: string) => post<Asset>(`/admin/assets/${id}/hide`),
    restoreAsset: (id: string) => post<Asset>(`/admin/assets/${id}/restore`),

    listings: (query?: { page?: number; limit?: number; pendingOnly?: boolean }) =>
      get<Paginated<Listing>>("/admin/marketplace/listings", query),
    approveListing: (id: string) =>
      post<unknown>(`/admin/marketplace/listings/${id}/approve`),
    rejectListing: (id: string) =>
      post<unknown>(`/admin/marketplace/listings/${id}/reject`),

    transactions: (query?: AdminListTransactionsQuery) =>
      get<Paginated<Transaction>>("/admin/transactions", query),

    systemStatus: () => get<SystemStatus>("/admin/system/status"),
  },
};

export type Api = typeof api;
