import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider, Prisma, Role, type User } from '@prisma/client';
import { paginate, type PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import type { ListUsersQueryDto } from './dto/list-users-query.dto';
import type { UpdateProfileDto, UpdateUserAdminDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

/** What an OAuth strategy hands over after a successful provider callback. */
export interface OAuthProfile {
  provider: AuthProvider;
  providerId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get quotaMB(): number {
    return this.config.get<number>('storage.userQuotaMB', 2048);
  }

  toResponse(user: User): UserResponseDto {
    return UserResponseDto.from(user, this.quotaMB);
  }

  /**
   * Called on every OAuth callback. Creates the profile on first login and
   * otherwise refreshes the name and avatar from the provider.
   *
   * Matching is on `(authProvider, providerId)` rather than on email: an email
   * address can be reassigned at a provider, but the subject id cannot. Email is
   * still unique, so signing in to the same address through a second provider is
   * rejected with a message that names the original provider instead of a raw
   * 409 from the database.
   */
  async findOrCreateFromOAuth(profile: OAuthProfile): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: {
        authProvider_providerId: {
          authProvider: profile.provider,
          providerId: profile.providerId,
        },
      },
    });

    if (existing) {
      const changed =
        (profile.name != null && profile.name !== existing.name) ||
        (profile.avatarUrl != null && profile.avatarUrl !== existing.avatarUrl) ||
        profile.email !== existing.email;

      if (!changed) {
        return existing;
      }
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          email: profile.email,
          name: profile.name ?? existing.name,
          avatarUrl: profile.avatarUrl ?? existing.avatarUrl,
        },
      });
    }

    const emailTaken = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (emailTaken) {
      throw new ForbiddenException(
        `${profile.email} is already registered via ${emailTaken.authProvider}. Sign in with ${emailTaken.authProvider} instead.`,
      );
    }

    const created = await this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        authProvider: profile.provider,
        providerId: profile.providerId,
      },
    });
    this.logger.log(`Created user ${created.id} via ${profile.provider}`);
    return created;
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  /** Used by `JwtStrategy` — returns null instead of throwing so a deleted user yields a 401, not a 404. */
  async findByIdOrNull(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { ...dto } });
  }

  async updateAsAdmin(id: string, dto: UpdateUserAdminDto): Promise<User> {
    await this.findById(id);
    return this.prisma.user.update({ where: { id }, data: { ...dto } });
  }

  async list(query: ListUsersQueryDto): Promise<PaginatedResponseDto<UserResponseDto>> {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.plan ? { plan: query.plan } : {}),
      ...(query.authProvider ? { authProvider: query.authProvider } : {}),
      ...(query.q
        ? {
            OR: [
              { email: { contains: query.q, mode: 'insensitive' } },
              { name: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(
      rows.map((row) => this.toResponse(row)),
      total,
      query.page,
      query.limit,
    );
  }

  /**
   * Adjusts the cached storage total by a delta in MB. Called by the assets
   * module on upload and on delete. Clamped at zero so a double-decrement from a
   * retried delete cannot drive the counter negative.
   */
  async addStorageUsage(userId: string, deltaMB: number): Promise<void> {
    if (deltaMB === 0) {
      return;
    }
    await this.prisma.$executeRaw`
      UPDATE users
      SET "storageUsedMB" = GREATEST(0, "storageUsedMB" + ${deltaMB}::double precision)
      WHERE id = ${userId}::uuid
    `;
  }

  /** True when adding `sizeMB` would push the user past their quota. */
  async wouldExceedQuota(userId: string, sizeMB: number): Promise<boolean> {
    const user = await this.findById(userId);
    return user.storageUsedMB + sizeMB > this.quotaMB;
  }

  /** Convenience for seeding the first admin, used by `scripts/promote-admin.ts`. */
  async promoteToAdmin(email: string): Promise<User> {
    return this.prisma.user.update({ where: { email }, data: { role: Role.admin } });
  }
}
