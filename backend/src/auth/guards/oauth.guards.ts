import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

/**
 * `GET /auth/{provider}?state=admin` round-trips `state` through the provider and
 * back to the callback as `req.query.state`, where `completeOAuth` uses it to
 * pick the redirect target (admin panel vs. main frontend). Only a small, known
 * set of values is honoured there, so this is a redirect hint, not a trust
 * boundary — the real gate is `role === 'admin'` on the returned profile.
 */
function stateOption(context: ExecutionContext): { state?: string } {
  const req = context.switchToHttp().getRequest<Request>();
  const state = req?.query?.state;
  return typeof state === 'string' && state.length > 0 && state.length <= 64 ? { state } : {};
}

/**
 * A Passport strategy that was never registered fails with an opaque 500
 * ("Unknown authentication strategy"). These guards check the configuration
 * first and answer 503 with something a developer can act on.
 */
function assertConfigured(config: ConfigService, key: 'google' | 'github', label: string): void {
  const configured =
    Boolean(config.get<string>(`${key}.clientId`)) &&
    Boolean(config.get<string>(`${key}.clientSecret`));

  if (!configured) {
    throw new ServiceUnavailableException(
      `${label} sign-in is not configured on this server. Set ${key.toUpperCase()}_CLIENT_ID and ${key.toUpperCase()}_CLIENT_SECRET in .env.`,
    );
  }
}

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    assertConfigured(this.config, 'google', 'Google');
    return (await super.canActivate(context)) as boolean;
  }

  getAuthenticateOptions(context: ExecutionContext) {
    return { session: false, prompt: 'select_account', ...stateOption(context) };
  }
}

@Injectable()
export class GithubOAuthGuard extends AuthGuard('github') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    assertConfigured(this.config, 'github', 'GitHub');
    return (await super.canActivate(context)) as boolean;
  }

  getAuthenticateOptions(context: ExecutionContext) {
    return { session: false, ...stateOption(context) };
  }
}
