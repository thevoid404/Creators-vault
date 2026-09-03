import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Role, User } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService, type OAuthProfile } from '../users/users.service';
import { AuthTokensDto } from './dto/auth-tokens.dto';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  typ: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  typ: 'refresh';
}

export interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Refresh tokens are stored as a SHA-256 digest — a database leak must not yield usable sessions. */
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async loginWithOAuth(
    profile: OAuthProfile,
    context: SessionContext = {},
  ): Promise<AuthTokensDto> {
    const user = await this.users.findOrCreateFromOAuth(profile);
    return this.issueTokens(user, context);
  }

  async issueTokens(user: User, context: SessionContext = {}): Promise<AuthTokensDto> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      typ: 'access',
    };
    const accessExpiresIn = this.config.get<string>('jwt.accessExpiresIn', '15m');
    const refreshExpiresIn = this.config.get<string>('jwt.refreshExpiresIn', '30d');

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: accessExpiresIn,
    });

    const jti = randomUUID();
    const refreshPayload: RefreshTokenPayload = { sub: user.id, jti, typ: 'refresh' };
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: refreshExpiresIn,
    });

    const decoded = this.jwt.decode(refreshToken) as { exp: number };
    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(decoded.exp * 1000),
        userAgent: context.userAgent?.slice(0, 500) ?? null,
        ipAddress: context.ipAddress ?? null,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.toSeconds(accessExpiresIn),
      user: this.users.toResponse(user),
    };
  }

  /**
   * Rotating refresh: the presented token is revoked and a brand new pair is
   * issued. Replaying a token that was already rotated revokes the whole family,
   * which is the standard response to a leaked refresh token.
   */
  async refresh(token: string, context: SessionContext = {}): Promise<AuthTokensDto> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or has expired.');
    }

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('That is not a refresh token.');
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!stored || stored.tokenHash !== this.hash(token)) {
      throw new UnauthorizedException('Refresh token is not recognised.');
    }

    if (stored.revokedAt) {
      // A revoked token being presented again means it was captured after
      // rotation. Drop every session this user has.
      await this.revokeAllForUser(stored.userId);
      this.logger.warn(
        `Reuse of revoked refresh token for user ${stored.userId} — all sessions revoked`,
      );
      throw new UnauthorizedException('Refresh token has already been used. Please sign in again.');
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token has expired.');
    }

    const user = await this.users.findByIdOrNull(stored.userId);
    if (!user) {
      throw new UnauthorizedException('The account for this token no longer exists.');
    }
    if (user.suspendedAt) {
      // Don't rotate — leave the presented token spent-but-unrenewed so a
      // reactivated account can still sign in fresh.
      throw new UnauthorizedException('This account has been suspended.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user, context);
  }

  /** Revokes one session. Idempotent: an unknown or already-revoked token is not an error. */
  async logout(token: string): Promise<void> {
    const hash = this.hash(token);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  /** Turns "15m" / "30d" / "3600" into seconds, for the `expiresIn` field of the token response. */
  private toSeconds(duration: string): number {
    const match = /^(\d+)([smhd])?$/.exec(duration.trim());
    if (!match) {
      return 900;
    }
    const value = Number.parseInt(match[1], 10);
    const unit = match[2] ?? 's';
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] ?? 1);
  }
}
