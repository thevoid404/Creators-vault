import { Logger } from '@nestjs/common';

/**
 * Fail fast on missing configuration, but only for what is genuinely required to
 * boot. Optional integrations (GitHub OAuth, Gemini embeddings, Stripe) are
 * allowed to be blank — the modules that depend on them degrade rather than
 * crash, which is what keeps Google OAuth working independently of GitHub.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const logger = new Logger('EnvValidation');
  const errors: string[] = [];
  const warnings: string[] = [];

  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (!config[key]) {
      errors.push(`${key} is required`);
    }
  }

  // Google OAuth is mandatory for the product, but a missing client id must not
  // stop the server from booting for someone who only wants to browse the docs.
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    warnings.push(
      'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set — /auth/google will return 503',
    );
  }
  if (!config.GITHUB_CLIENT_ID || !config.GITHUB_CLIENT_SECRET) {
    warnings.push('GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET are not set — GitHub login is disabled');
  }

  const weakSecrets = ['change-me-access-secret', 'change-me-refresh-secret'];
  if (
    config.NODE_ENV === 'production' &&
    [config.JWT_ACCESS_SECRET, config.JWT_REFRESH_SECRET].some((secret) =>
      weakSecrets.includes(String(secret)),
    )
  ) {
    errors.push('JWT secrets still hold their .env.example placeholder values in production');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${errors.join('\n  - ')}`);
  }
  warnings.forEach((warning) => logger.warn(warning));

  return config;
}
