import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../../users/users.service';
import type { AccessTokenPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret') ?? '',
    });
  }

  /**
   * The user is re-read on every request rather than trusted from the token, so
   * a role change or a deleted account takes effect immediately instead of at
   * the next token refresh.
   */
  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('A refresh token cannot be used as an access token.');
    }
    const user = await this.users.findByIdOrNull(payload.sub);
    if (!user) {
      throw new UnauthorizedException('The account for this token no longer exists.');
    }
    // Re-reading the user is also what makes an admin suspension take effect on
    // the very next request rather than at the next token refresh.
    if (user.suspendedAt) {
      throw new UnauthorizedException('This account has been suspended.');
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
