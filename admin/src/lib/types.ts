/**
 * API types — transcribed from ../backend/api.md (incl. the /admin/* section
 * added alongside this app). Single source of truth for request/response shapes.
 */

/* ------------------------------------------------------------------ *
 * Shared
 * ------------------------------------------------------------------ */

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface ApiErrorShape {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

export type SortOrder = "asc" | "desc";

export interface ListQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  q?: string;
}

/* ------------------------------------------------------------------ *
 * Health
 * ------------------------------------------------------------------ */

export interface HealthStatus {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  database: "up" | "down" | string;
  pgvector: "installed" | "missing" | "unknown";
  timestamp?: string;
}

/* ------------------------------------------------------------------ *
 * Auth & Users
 * ------------------------------------------------------------------ */

export type AuthProvider = "google" | "github";
export type UserRole = "user" | "admin";
export type UserPlan = "free" | "pro";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  authProvider: AuthProvider;
  role: UserRole;
  plan: UserPlan;
  storageUsedMB: number;
  storageQuotaMB: number;
  suspendedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: User;
}

export interface AdminListUsersQuery extends ListQuery {
  sortBy?: "createdAt" | "email" | "name" | "storageUsedMB";
  role?: UserRole;
  plan?: UserPlan;
  status?: "active" | "suspended";
}

export interface AdminUserDetail {
  user: User;
  assetCount: number;
  hiddenAssetCount: number;
  projectCount: number;
  tagCount: number;
  transactionCount: number;
  recentAssets: Asset[];
}

export interface UpdateUserAdminInput {
  role?: UserRole;
  plan?: UserPlan;
}

export interface AdminActionResult {
  ok: boolean;
  message: string;
}

/* ------------------------------------------------------------------ *
 * Assets
 * ------------------------------------------------------------------ */

export type AssetType =
  | "image"
  | "vector"
  | "font"
  | "document"
  | "video"
  | "audio"
  | "archive"
  | "code_snippet"
  | "design_file"
  | "link"
  | "other";

export type AssetSourceType = "upload" | "url" | "marketplace_link" | "extension";

export type LicenseType =
  | "unknown"
  | "personal"
  | "commercial"
  | "extended"
  | "cc0"
  | "cc_by"
  | "mit"
  | "apache_2_0"
  | "gpl"
  | "proprietary"
  | "custom";

export type EmbeddingStatus = "pending" | "ready" | "failed" | "skipped";

export interface AssetProjectRef {
  id: string;
  name: string;
}

export interface AssetPurchase {
  price: number | null;
  currency: string | null;
  date: string | null;
  orderRef: string | null;
}

export interface AssetTagRef {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export interface Asset {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  type: AssetType;
  category: string | null;
  sourceType: AssetSourceType;
  sourceUrl: string | null;
  sourcePlatform: string | null;
  licenseType: LicenseType;
  licenseNote: string | null;
  previewUrl: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  fileSizeMB: number | null;
  project: AssetProjectRef | null;
  section: string | null;
  tags: AssetTagRef[];
  version: number;
  purchase: AssetPurchase | null;
  metadata: Record<string, unknown> | null;
  embeddingStatus: EmbeddingStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminListAssetsQuery extends ListQuery {
  sortBy?: "createdAt" | "updatedAt" | "title" | "fileSizeMB";
  type?: AssetType[];
  sourceType?: AssetSourceType[];
  ownerId?: string;
  deleted?: boolean;
  createdAfter?: string;
  createdBefore?: string;
}

/* ------------------------------------------------------------------ *
 * Overview stats
 * ------------------------------------------------------------------ */

export interface PlatformCounts {
  users: number;
  admins: number;
  suspendedUsers: number;
  assets: number;
  hiddenAssets: number;
  projects: number;
  storageUsedMB: number;
  activeListings: number;
  transactions: number;
}

export interface ActivityItem {
  type: "user_signup" | "asset_upload" | "listing_created";
  id: string;
  label: string;
  actor: string | null;
  at: string;
}

export interface PlatformStats {
  counts: PlatformCounts;
  recentActivity: ActivityItem[];
  marketplaceIsStub: boolean;
  paymentsIsLive: boolean;
  generatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Marketplace (STUB — sample data)
 * ------------------------------------------------------------------ */

export type ListingStatus = "draft" | "published" | "unlisted" | "sold_out" | "archived";

export interface ListingSeller {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface ListingItem {
  assetId: string;
  title: string;
  type: string;
  previewUrl: string | null;
}

export interface Listing {
  id: string;
  seller: ListingSeller;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  coverUrl: string | null;
  status: ListingStatus;
  items: ListingItem[];
  itemCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isStub: boolean;
}

/* ------------------------------------------------------------------ *
 * Payments (STUB — real rows, mock provider)
 * ------------------------------------------------------------------ */

export type TransactionStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded"
  | "cancelled";

export type PaymentProviderKind = "mock" | "stripe" | "paddle" | "lemonsqueezy";

export interface PaymentsStatus {
  provider: string;
  isLive: boolean;
  message: string;
}

export interface Transaction {
  id: string;
  userId: string;
  listingId: string | null;
  amount: number;
  currency: string;
  status: TransactionStatus;
  provider: PaymentProviderKind;
  providerSessionId: string | null;
  providerPaymentId: string | null;
  failureReason: string | null;
  completedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isLive: boolean;
}

export interface AdminListTransactionsQuery extends ListQuery {
  sortBy?: "createdAt" | "amount" | "status";
  status?: TransactionStatus;
  provider?: PaymentProviderKind;
  userId?: string;
}

/* ------------------------------------------------------------------ *
 * System status
 * ------------------------------------------------------------------ */

export interface ModuleStatus {
  key: string;
  name: string;
  status: "live" | "stub" | "backend-only";
  endpoints: number;
  note: string;
}

export interface SystemStatus {
  modules: ModuleStatus[];
  health: HealthStatus;
  payments: PaymentsStatus;
  generatedAt: string;
}
