/**
 * Single source of truth for every environment variable the app reads.
 *
 * Nothing outside this file touches `process.env`. Modules inject `ConfigService`
 * and read a typed path, which is what lets a provider be swapped by changing one
 * env var rather than by editing business logic.
 */

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export type StorageDriver = 'local' | 's3' | 'cloudinary';
export type EmbeddingDriver = 'local' | 'gemini' | 'openai';
export type PaymentDriver = 'mock' | 'stripe';

export const configuration = () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: toInt(process.env.PORT, 4000),
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:4000',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  corsOrigins: toList(process.env.CORS_ORIGINS),

  database: {
    url: process.env.DATABASE_URL ?? '',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/api/v1/auth/google/callback',
  },

  github: {
    clientId: process.env.GITHUB_CLIENT_ID ?? '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    callbackUrl:
      process.env.GITHUB_CALLBACK_URL ?? 'http://localhost:4000/api/v1/auth/github/callback',
  },

  storage: {
    driver: (process.env.STORAGE_DRIVER ?? 'local') as StorageDriver,
    localRoot: process.env.STORAGE_LOCAL_ROOT ?? './storage',
    maxUploadSizeMB: toInt(process.env.MAX_UPLOAD_SIZE_MB, 100),
    userQuotaMB: toInt(process.env.USER_STORAGE_QUOTA_MB, 2048),
  },

  embedding: {
    driver: (process.env.EMBEDDING_DRIVER ?? 'local') as EmbeddingDriver,
    dimensions: toInt(process.env.EMBEDDING_DIMENSIONS, 384),
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    geminiModel: process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004',
  },

  payment: {
    driver: (process.env.PAYMENT_DRIVER ?? 'mock') as PaymentDriver,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  },

  urlImport: {
    timeoutMs: toInt(process.env.URL_IMPORT_TIMEOUT_MS, 8000),
    maxBytes: toInt(process.env.URL_IMPORT_MAX_BYTES, 1024 * 1024),
  },

  extension: {
    tokenTtlDays: toInt(process.env.EXTENSION_TOKEN_TTL_DAYS, 365),
  },

  throttle: {
    ttlSeconds: toInt(process.env.THROTTLE_TTL_SECONDS, 60),
    limit: toInt(process.env.THROTTLE_LIMIT, 120),
  },
});

export type AppConfig = ReturnType<typeof configuration>;
