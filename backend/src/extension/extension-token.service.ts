import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ExtensionToken, User } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatedExtensionTokenDto,
  ExtensionTokenResponseDto,
  type CreateExtensionTokenDto,
} from './dto/extension.dto';

/**
 * Long-lived tokens for the future browser extension.
 *
 * **Why these exist at all.** An extension cannot sensibly run the OAuth
 * redirect flow: it has no stable origin to receive a callback, and a 15-minute
 * access token would force the user to re-authenticate constantly while
 * browsing. A long-lived, individually revocable token issued *from* an
 * already-authenticated session gives the extension one credential to hold and
 * gives the user a list they can revoke from.
 *
 * The trade-off is that the token is long-lived, so: only the SHA-256 hash is
 * stored, the plaintext is shown exactly once, each token is named and
 * separately revocable, and it is scoped to capture rather than being a general
 * session credential.
 */
@Injectable()
export class ExtensionTokenService {
  private readonly logger = new Logger(ExtensionTokenService.name);

  /** Recognisable in logs and pastes, so a leaked token can be spotted for what it is. */
  private static readonly PREFIX = 'cv_ext_';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(userId: string, dto: CreateExtensionTokenDto): Promise<CreatedExtensionTokenDto> {
    const token = `${ExtensionTokenService.PREFIX}${randomBytes(24).toString('hex')}`;

    const ttlDays = dto.expiresInDays ?? this.config.get<number>('extension.tokenTtlDays', 365);
    // A TTL of 0 is documented as "never expires" — a null column, not a date
    // far in the future, so the intent stays readable in the database.
    const expiresAt = ttlDays > 0 ? new Date(Date.now() + ttlDays * 86_400_000) : null;

    const record = await this.prisma.extensionToken.create({
      data: {
        userId,
        name: dto.name,
        tokenHash: this.hash(token),
        tokenPrefix: token.slice(0, ExtensionTokenService.PREFIX.length + 6),
        expiresAt,
      },
    });

    this.logger.log(`Issued extension token ${record.id} for user ${userId}`);
    return { ...ExtensionTokenResponseDto.from(record), token };
  }

  async list(userId: string): Promise<ExtensionTokenResponseDto[]> {
    const tokens = await this.prisma.extensionToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return tokens.map(ExtensionTokenResponseDto.from);
  }

  /** Revoking is a soft state, so a revoked token stays visible in the list as evidence. */
  async revoke(userId: string, id: string): Promise<ExtensionTokenResponseDto> {
    const token = await this.prisma.extensionToken.findUnique({ where: { id } });
    if (!token || token.userId !== userId) {
      throw new NotFoundException('Extension token not found.');
    }
    if (token.revokedAt) {
      return ExtensionTokenResponseDto.from(token);
    }

    const revoked = await this.prisma.extensionToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return ExtensionTokenResponseDto.from(revoked);
  }

  /**
   * Resolves a presented token to its user, or throws 401.
   *
   * `lastUsedAt` is written on every successful call so a user can see which
   * tokens are actually in use before revoking one. The write is deliberately
   * not awaited — it is bookkeeping, and must not add latency to a capture.
   */
  async authenticate(presented: string): Promise<User & { tokenId: string }> {
    if (!presented?.startsWith(ExtensionTokenService.PREFIX)) {
      throw new UnauthorizedException('Malformed extension token.');
    }

    const record = await this.prisma.extensionToken.findUnique({
      where: { tokenHash: this.hash(presented) },
      include: { user: true },
    });

    if (!record) {
      throw new UnauthorizedException('Extension token is not recognised.');
    }
    if (record.revokedAt) {
      throw new UnauthorizedException('This extension token has been revoked.');
    }
    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('This extension token has expired.');
    }

    void this.touch(record.id);
    return { ...record.user, tokenId: record.id };
  }

  private async touch(id: string): Promise<void> {
    try {
      await this.prisma.extensionToken.update({
        where: { id },
        data: { lastUsedAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(`Could not update lastUsedAt for ${id}: ${(error as Error).message}`);
    }
  }

  /** Exposed for the guard's error messages and for tests. */
  static get tokenPrefix(): string {
    return ExtensionTokenService.PREFIX;
  }

  static isWellFormed(token: string | undefined): token is string {
    return (
      typeof token === 'string' &&
      token.startsWith(ExtensionTokenService.PREFIX) &&
      token.length === ExtensionTokenService.PREFIX.length + 48
    );
  }

  /** Narrow serialisation used by `GET /extension/me`. */
  toTokenResponse(token: ExtensionToken): ExtensionTokenResponseDto {
    return ExtensionTokenResponseDto.from(token);
  }
}
