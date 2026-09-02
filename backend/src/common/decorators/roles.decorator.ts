import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the given roles. Enforced by `RolesGuard`, which is
 * applied globally, so this decorator is the only thing a route needs.
 *
 * The admin panel does not exist yet, but admin-only endpoints are guarded from
 * day one so no auth check has to be retrofitted later.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
