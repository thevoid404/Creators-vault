/**
 * The one and only place the frontend talks to the backend.
 *
 * Built directly from ../backend/api.md. Every component calls through `api.*`
 * helpers — never `fetch` directly.
 *
 * - Base URL comes from NEXT_PUBLIC_API_BASE_URL (includes the /api/v1 prefix).
 * - Bearer access token is attached automatically for authed calls.
 * - On 401, one refresh-token rotation is attempted, then the call is retried.
 *   If refresh fails, tokens are cleared and `cv:auth-expired` is dispatched.
 */

import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  notifyAuthExpired,
} from "./auth-tokens";
import type {
  ApiErrorShape,
  Asset,
  AssetLimits,
  AssetListQuery,
  AssetNeighbour,
  AuthTokens,
  CreateAssetFromMarketplaceLinkInput,
  CreateAssetFromUrlInput,
  CreateAssetInput,
  CreateExtensionTokenInput,
  CreateProjectInput,
  CreateRelationshipInput,
  CreateTagInput,
  DeleteRelationshipResult,
  DeleteTagResult,
  ExtensionToken,
  HealthStatus,
  Listing,
  ListingListQuery,
  Paginated,
  PaymentsStatus,
  Project,
  ProjectListQuery,
  ProjectSection,
  PurchaseInput,
  PurchaseResult,
  RefundInput,
  ReindexResult,
  Relationship,
  RelationshipListQuery,
  RelationType,
  SearchQuery,
  SearchStatus,
  SemanticSearchInput,
  SemanticSearchResult,
  SimilarAssetsResult,
  Tag,
  TagListQuery,
  TagSuggestInput,
  TagSuggestion,
  Transaction,
  TransactionListQuery,
  UpdateAssetInput,
  UpdateProfileInput,
  UpdateProjectInput,
  UpdateRelationshipInput,
  UpdateTagInput,
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

  /** True for the deliberate marketplace/payments stubs. */
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
  get isServiceUnavailable() {
    return this.status === 503;
  }
}

/* ------------------------------------------------------------------ *
 * Query string
 * ------------------------------------------------------------------ */

type QueryValue = string | number | boolean | Array<string | number> | undefined | null;

/** Any plain object — concrete query DTOs are passed straight in. */
type QueryInput = object;

function buildQuery(params?: QueryInput): string {
  if (!params) return "";
  const parts: string[] = [];
  for (const [key, raw] of Object.entries(params as Record<string, unknown>)) {
    const value = raw as QueryValue;
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      // api.md: repeatable filters also accept a comma-separated list
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.join(","))}`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
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
  form?: FormData;
  /** Attach the bearer token. Default true. */
  auth?: boolean;
  /** Override / provide a token explicitly (server components). */
  token?: string;
  signal?: AbortSignal;
  /** Internal — prevents infinite refresh loops. */
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
  const { query, body, form, auth = true, token, signal, _isRetry = false } = opts;

  const headers: Record<string, string> = {};
  if (body !== undefined && !form) headers["Content-Type"] = "application/json";

  const bearer = token ?? (auth ? getAccessToken() : null);
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`;

  const res = await fetch(`${API_BASE_URL}${path}${buildQuery(query)}`, {
    method,
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
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
const del = <T>(path: string, body?: unknown, opts?: RequestOptions) =>
  request<T>("DELETE", path, { ...opts, body });

/* ------------------------------------------------------------------ *
 * Grouped API surface
 * ------------------------------------------------------------------ */

export const api = {
  raw: request,

  health: {
    get: () => get<HealthStatus>("/health", undefined, { auth: false }),
  },

  auth: {
    /** Full URL to open in the browser to start OAuth. */
    oauthStartUrl: (provider: "google" | "github") => `${API_BASE_URL}/auth/${provider}`,
    refresh: (refreshToken: string) =>
      post<AuthTokens>("/auth/refresh", { refreshToken }, { auth: false }),
    logout: (refreshToken: string) =>
      post<void>("/auth/logout", { refreshToken }, { auth: false }),
    logoutAll: () => post<{ revokedSessions: number }>("/auth/logout-all"),
    me: (token?: string) => get<User>("/auth/me", undefined, { token }),
  },

  users: {
    me: (token?: string) => get<User>("/users/me", undefined, { token }),
    updateMe: (input: UpdateProfileInput) => patch<User>("/users/me", input),
    byId: (id: string) => get<User>(`/users/${id}`),
  },

  assets: {
    list: (query?: AssetListQuery) =>
      get<Paginated<Asset>>("/assets", query),
    limits: () => get<AssetLimits>("/assets/limits"),
    byId: (id: string) => get<Asset>(`/assets/${id}`),
    create: (input: CreateAssetInput) => post<Asset>("/assets", input),
    upload: (form: FormData) => request<Asset[]>("POST", "/assets/upload", { form }),
    fromUrl: (input: CreateAssetFromUrlInput) => post<Asset>("/assets/from-url", input),
    fromMarketplaceLink: (input: CreateAssetFromMarketplaceLinkInput) =>
      post<Asset>("/assets/from-marketplace-link", input),
    update: (id: string, input: UpdateAssetInput) => patch<Asset>(`/assets/${id}`, input),
    remove: (id: string) => del<Asset>(`/assets/${id}`),
    restore: (id: string) => post<Asset>(`/assets/${id}/restore`),
    relationships: (id: string, relationType?: RelationType) =>
      get<AssetNeighbour[]>(`/assets/${id}/relationships`, { relationType }),
    similar: (id: string, query?: { limit?: number; minSimilarity?: number }) =>
      get<SimilarAssetsResult>(`/assets/${id}/similar`, query),
  },

  projects: {
    list: (query?: ProjectListQuery) =>
      get<Paginated<Project>>("/projects", query),
    byId: (id: string) => get<Project>(`/projects/${id}`),
    assets: (id: string, query?: AssetListQuery) =>
      get<Paginated<Asset>>(`/projects/${id}/assets`, query),
    sections: (id: string) => get<ProjectSection[]>(`/projects/${id}/sections`),
    create: (input: CreateProjectInput) => post<Project>("/projects", input),
    update: (id: string, input: UpdateProjectInput) =>
      patch<Project>(`/projects/${id}`, input),
    archive: (id: string) => post<Project>(`/projects/${id}/archive`),
    unarchive: (id: string) => post<Project>(`/projects/${id}/unarchive`),
    remove: (id: string) => del<Project>(`/projects/${id}`),
    restore: (id: string) => post<Project>(`/projects/${id}/restore`),
  },

  tags: {
    list: (query?: TagListQuery) =>
      get<Paginated<Tag>>("/tags", query),
    byId: (id: string) => get<Tag>(`/tags/${id}`),
    create: (input: CreateTagInput) => post<Tag>("/tags", input),
    suggest: (input: TagSuggestInput) => post<TagSuggestion[]>("/tags/suggest", input),
    update: (id: string, input: UpdateTagInput) => patch<Tag>(`/tags/${id}`, input),
    remove: (id: string) => del<DeleteTagResult>(`/tags/${id}`),
  },

  relationships: {
    list: (query?: RelationshipListQuery) =>
      get<Paginated<Relationship>>(
        "/relationships",
        query,
      ),
    byId: (id: string) => get<Relationship>(`/relationships/${id}`),
    create: (input: CreateRelationshipInput) =>
      post<Relationship>("/relationships", input),
    update: (id: string, input: UpdateRelationshipInput) =>
      patch<Relationship>(`/relationships/${id}`, input),
    remove: (id: string) => del<DeleteRelationshipResult>(`/relationships/${id}`),
  },

  search: {
    keyword: (query: SearchQuery) =>
      get<Paginated<Asset>>("/search", query),
    semantic: (input: SemanticSearchInput) =>
      post<SemanticSearchResult>("/search/semantic", input),
    status: () => get<SearchStatus>("/search/status"),
    reindex: () => post<ReindexResult>("/search/reindex"),
  },

  extension: {
    listTokens: () => get<ExtensionToken[]>("/extension/tokens"),
    createToken: (input: CreateExtensionTokenInput) =>
      post<ExtensionToken>("/extension/token", input),
    revokeToken: (id: string) => del<ExtensionToken>(`/extension/tokens/${id}`),
  },

  marketplace: {
    listings: (query?: ListingListQuery) =>
      get<Paginated<Listing>>(
        "/marketplace/listings",
        query,
      ),
    listing: (id: string) => get<Listing>(`/marketplace/listings/${id}`),
    purchase: (id: string, input?: PurchaseInput) =>
      post<PurchaseResult>(`/marketplace/listings/${id}/purchase`, input ?? {}),
  },

  payments: {
    status: () => get<PaymentsStatus>("/payments/status", undefined, { auth: false }),
    /**
     * Simulate a gateway callback. In this build the webhook is public and the
     * mock provider declines any amount ending in `.99` (api.md → Payments).
     */
    simulateWebhook: (input: {
      transactionId: string;
      status: "succeeded" | "failed";
      amount: number;
    }) =>
      post<{ received: boolean; transactionId: string; status: string }>(
        "/payments/webhook",
        input,
        { auth: false },
      ),
    transactions: (query?: TransactionListQuery) =>
      get<Paginated<Transaction>>(
        "/payments/transactions",
        query,
      ),
    transaction: (id: string) => get<Transaction>(`/payments/transactions/${id}`),
    refund: (id: string, input?: RefundInput) =>
      post<Transaction>(`/payments/transactions/${id}/refund`, input ?? {}),
  },
};

export type Api = typeof api;
