import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Role } from '@prisma/client';
import type { Request } from 'express';

/**
 * The authenticated principal, attached to the request by `JwtStrategy` (or by
 * `ExtensionTokenGuard` in Phase 6, which produces the same shape so that the
 * shared asset-creation logic does not care which one authenticated the call).
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  /** Set when the request was authenticated by a browser-extension token. */
  viaExtensionToken?: boolean;
}

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
