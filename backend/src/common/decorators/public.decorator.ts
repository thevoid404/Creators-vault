import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route out of the globally applied `JwtAuthGuard`.
 *
 * Authentication is on by default for the whole API — a new endpoint is
 * protected unless someone deliberately marks it public, rather than the other
 * way round.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
