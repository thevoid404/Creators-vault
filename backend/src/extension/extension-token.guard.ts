import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { RequestWithUser } from '../common/decorators/current-user.decorator';
import { ExtensionTokenService } from './extension-token.service';

/** Header the extension sends its token in. */
export const EXTENSION_TOKEN_HEADER = 'x-extension-token';

/**
 * Authenticates a request by extension token instead of by JWT.
 *
 * It attaches the **same `AuthenticatedUser` shape** the JWT strategy produces,
 * so everything downstream — `@CurrentUser()`, the shared asset-creation path,
 * ownership checks — works identically and needs no knowledge of how the caller
 * authenticated. `viaExtensionToken` is set for anything that later wants to
 * distinguish them.
 *
 * Routes using this guard must also be marked `@Public()`, which opts them out
 * of the globally applied `JwtAuthGuard` — not because they are unauthenticated,
 * but because they authenticate differently.
 */
@Injectable()
export class ExtensionTokenGuard implements CanActivate {
  constructor(private readonly tokens: ExtensionTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const header = request.headers[EXTENSION_TOKEN_HEADER];
    const presented = Array.isArray(header) ? header[0] : header;

    if (!presented) {
      throw new UnauthorizedException(
        `Missing extension token. Send it as the ${EXTENSION_TOKEN_HEADER} header.`,
      );
    }

    const user = await this.tokens.authenticate(presented);
    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      viaExtensionToken: true,
    };
    return true;
  }
}
