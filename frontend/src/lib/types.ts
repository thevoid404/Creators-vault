/**
 * API types — transcribed from ../backend/api.md.
 * This file is the single source of truth for response/request shapes on the frontend.
 * If the backend contract changes, update here first, then the client and components.
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
  timestamp: string;
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
  name: string;
  avatarUrl: string | null;
  authProvider: AuthProvider;
  role: UserRole;
  plan: UserPlan;
  storageUsedMB: number;
  storageQuotaMB: number;
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

export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string;
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
  price: number;
  currency: string;
  date: string;
  orderRef: string | null;
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
  tags: Tag[];
  version: number;
  purchase: AssetPurchase | null;
  metadata: Record<string, unknown> | null;
  embeddingStatus: EmbeddingStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fields common to all four creation routes. */
export interface AssetCreateFields {
  title?: string;
  description?: string;
  type?: AssetType;
  category?: string;
  tags?: string[];
  projectId?: string;
  section?: string;
  licenseType?: LicenseType;
  licenseNote?: string;
}

/** POST /assets — no file, no source URL. `title` required. */
export interface CreateAssetInput extends AssetCreateFields {
  title: string;
}

/** POST /assets/from-url */
export interface CreateAssetFromUrlInput extends AssetCreateFields {
  sourceUrl: string;
  fetchMetadata?: boolean;
}

/** POST /assets/from-marketplace-link */
export interface CreateAssetFromMarketplaceLinkInput extends CreateAssetFromUrlInput {
  sourcePlatform?: string;
  purchasePrice?: number;
  purchaseCurrency?: string;
  purchaseDate?: string;
  purchaseOrderRef?: string;
}

export type UpdateAssetInput = AssetCreateFields;

export interface AssetLimits {
  maxUploadSizeMB: number;
  maxFilesPerRequest: number;
  storageQuotaMB: number;
}

export interface AssetListQuery extends ListQuery {
  sortBy?: "createdAt" | "updatedAt" | "title" | "fileSizeMB" | "type";
  type?: AssetType | AssetType[];
  sourceType?: AssetSourceType | AssetSourceType[];
  licenseType?: LicenseType | LicenseType[];
  category?: string;
  sourcePlatform?: string;
  projectId?: string;
  section?: string;
  tags?: string | string[];
  deleted?: boolean;
}

/* ------------------------------------------------------------------ *
 * Projects
 * ------------------------------------------------------------------ */

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  color: string | null;
  assetCount: number;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  coverUrl?: string;
  color?: string;
}

export type UpdateProjectInput = Partial<CreateProjectInput>;

export interface ProjectListQuery extends ListQuery {
  sortBy?: "createdAt" | "updatedAt" | "name";
  includeArchived?: boolean;
  deleted?: boolean;
}

export interface ProjectSection {
  section: string | null;
  assetCount: number;
}

/* ------------------------------------------------------------------ *
 * Tags
 * ------------------------------------------------------------------ */

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

export interface TagListQuery extends ListQuery {
  sortBy?: "usageCount" | "name" | "createdAt";
  usedOnly?: boolean;
}

export interface TagSuggestInput {
  assetId?: string;
  title?: string;
  description?: string;
  category?: string;
  exclude?: string[];
  limit?: number;
}

export interface TagSuggestion {
  name: string;
  slug: string;
  score: number;
  reason: "existing-tag" | "co-occurrence" | "keyword";
  exists: boolean;
}

export interface DeleteTagResult {
  id: string;
  detachedAssets: number;
}

/* ------------------------------------------------------------------ *
 * Relationships
 * ------------------------------------------------------------------ */

export type RelationType =
  | "used_in"
  | "derived_from"
  | "alternative_to"
  | "version_of"
  | "inspired_by"
  | "bundled_with"
  | "depends_on"
  | "related_to";

export interface RelationshipAssetRef {
  id: string;
  title: string;
  type: AssetType;
  previewUrl: string | null;
  category: string | null;
}

export interface Relationship {
  id: string;
  sourceAssetId: string;
  targetAssetId: string | null;
  targetProjectId: string | null;
  relationType: RelationType;
  reason: string | null;
  sourceAsset?: RelationshipAssetRef;
  targetAsset?: RelationshipAssetRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRelationshipInput {
  sourceAssetId: string;
  targetAssetId?: string;
  targetProjectId?: string;
  relationType?: RelationType;
  reason?: string;
}

export interface UpdateRelationshipInput {
  relationType?: RelationType;
  reason?: string;
}

export interface RelationshipListQuery extends ListQuery {
  sortBy?: "createdAt" | "updatedAt" | "relationType";
  assetId?: string;
  projectId?: string;
  relationType?: RelationType;
}

/** Flattened neighbour from GET /assets/:id/relationships */
export interface AssetNeighbour {
  relationshipId: string;
  relationType: RelationType;
  direction: "outgoing" | "incoming";
  reason: string | null;
  asset: RelationshipAssetRef | null;
  project: AssetProjectRef | null;
  createdAt: string;
}

export interface DeleteRelationshipResult {
  id: string;
}

/* ------------------------------------------------------------------ *
 * Search & Similarity
 * ------------------------------------------------------------------ */

export interface SearchQuery extends ListQuery {
  q: string;
  sortBy?: "createdAt" | "updatedAt" | "title" | "type";
  type?: AssetType | AssetType[];
  projectId?: string;
  tags?: string | string[];
}

export interface SemanticSearchInput {
  q: string;
  limit?: number;
  minSimilarity?: number;
  type?: AssetType[];
  projectId?: string;
}

export interface ScoredAsset {
  asset: Asset;
  score: number;
  scoreLabel: string;
}

export interface SemanticSearchResult {
  data: ScoredAsset[];
  strategy: "semantic" | "keyword";
  fallbackReason: string | null;
  total: number;
}

export interface SimilarAssetsResult {
  data: ScoredAsset[];
  total: number;
  reason: string | null;
}

export interface SearchStatus {
  driver: "local" | "gemini" | "none";
  available: boolean;
  pgvector: boolean;
  pendingAssets: number;
}

export interface ReindexResult {
  processed: number;
  indexed: number;
  failed: number;
}

/* ------------------------------------------------------------------ *
 * Extension tokens
 * ------------------------------------------------------------------ */

export interface ExtensionToken {
  id: string;
  name: string;
  token?: string; // only present on creation
  tokenPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreateExtensionTokenInput {
  name: string;
  expiresInDays?: number;
}

/* ------------------------------------------------------------------ *
 * Marketplace (STUB — sample data)
 * ------------------------------------------------------------------ */

export type ListingStatus =
  | "draft"
  | "published"
  | "unlisted"
  | "sold_out"
  | "archived";

export interface ListingSeller {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface ListingItem {
  assetId: string;
  title: string;
  type: AssetType;
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

export interface ListingListQuery extends ListQuery {
  sortBy?: "createdAt" | "price" | "title" | "publishedAt";
  status?: ListingStatus;
  sellerId?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface PurchaseInput {
  successUrl?: string;
  cancelUrl?: string;
}

export interface PurchaseResult {
  transactionId: string;
  status: string;
  sessionId: string;
  checkoutUrl: string;
  expiresAt: string;
  provider: string;
  isLive: boolean;
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
  provider: string;
  providerSessionId: string | null;
  providerPaymentId: string | null;
  failureReason: string | null;
  completedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isLive: boolean;
}

export interface TransactionListQuery extends ListQuery {
  sortBy?: "createdAt" | "amount" | "status";
  status?: TransactionStatus;
  listingId?: string;
}

export interface RefundInput {
  amount?: number;
  reason?: string;
}
