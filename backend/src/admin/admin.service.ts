import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate, type PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { PaymentsService } from '../payments/payments.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import type { ListListingsQueryDto } from '../marketplace/dto/marketplace.dto';
import { AssetResponseDto } from '../assets/dto/asset-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import {
  AdminActionResultDto,
  AdminUserDetailDto,
  PlatformStatsDto,
  SystemStatusDto,
} from './dto/admin.dto';
import {
  AdminListAssetsQueryDto,
  AdminListTransactionsQueryDto,
  AdminListUsersQueryDto,
} from './dto/admin-query.dto';
import { SYSTEM_MODULES } from './system-modules';

/** Relations the admin asset views serialise, matching AssetResponseDto.from(). */
const ASSET_RELATIONS = {
  tags: { include: { tag: true } },
  project: { select: { id: true, name: true } },
} as const;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly payments: PaymentsService,
    private readonly marketplace: MarketplaceService,
  ) {}

  /** The marketplace holds no real rows, so its sample listings come via its service. */
  private allSampleListings() {
    return this.marketplace.list({
      page: 1,
      limit: 100,
      skip: 0,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    } as unknown as ListListingsQueryDto);
  }

  // =========================================================================
  // Overview
  // =========================================================================

  async stats(): Promise<PlatformStatsDto> {
    const [
      users,
      admins,
      suspendedUsers,
      assets,
      hiddenAssets,
      projects,
      storageAgg,
      transactions,
      listings,
      recentUsers,
      recentAssets,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'admin' } }),
      this.prisma.user.count({ where: { suspendedAt: { not: null } } }),
      this.prisma.asset.count({ where: { deletedAt: null } }),
      this.prisma.asset.count({ where: { deletedAt: { not: null } } }),
      this.prisma.project.count({ where: { deletedAt: null } }),
      this.prisma.user.aggregate({ _sum: { storageUsedMB: true } }),
      this.prisma.transaction.count(),
      this.prisma.marketplaceListing.count({ where: { status: 'published', deletedAt: null } }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      this.prisma.asset.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          title: true,
          createdAt: true,
          owner: { select: { name: true, email: true } },
        },
      }),
    ]);

    // The marketplace has no real listing rows, so surface its sample count too.
    const sampleListings = await this.allSampleListings();
    const activeListings =
      listings + sampleListings.data.filter((listing) => listing.status === 'published').length;

    const paymentStatus = this.payments.status();

    const recentActivity = [
      ...recentUsers.map((user) => ({
        type: 'user_signup' as const,
        id: user.id,
        label: `${user.name ?? user.email} signed up`,
        actor: user.name ?? user.email,
        at: user.createdAt,
      })),
      ...recentAssets.map((asset) => ({
        type: 'asset_upload' as const,
        id: asset.id,
        label: `${asset.owner.name ?? asset.owner.email} added “${asset.title}”`,
        actor: asset.owner.name ?? asset.owner.email,
        at: asset.createdAt,
      })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 12);

    return {
      counts: {
        users,
        admins,
        suspendedUsers,
        assets,
        hiddenAssets,
        projects,
        storageUsedMB: Number((storageAgg._sum.storageUsedMB ?? 0).toFixed(2)),
        activeListings,
        transactions,
      },
      recentActivity,
      marketplaceIsStub: true,
      paymentsIsLive: paymentStatus.isLive,
      generatedAt: new Date(),
    };
  }

  // =========================================================================
  // Users
  // =========================================================================

  async listUsers(query: AdminListUsersQueryDto): Promise<PaginatedResponseDto<UserResponseDto>> {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.plan ? { plan: query.plan } : {}),
      ...(query.status === 'suspended' ? { suspendedAt: { not: null } } : {}),
      ...(query.status === 'active' ? { suspendedAt: null } : {}),
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
      rows.map((row) => this.users.toResponse(row)),
      total,
      query.page,
      query.limit,
    );
  }

  async userDetail(id: string): Promise<AdminUserDetailDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const [assetCount, hiddenAssetCount, projectCount, tagCount, transactionCount, recentAssets] =
      await this.prisma.$transaction([
        this.prisma.asset.count({ where: { ownerId: id, deletedAt: null } }),
        this.prisma.asset.count({ where: { ownerId: id, deletedAt: { not: null } } }),
        this.prisma.project.count({ where: { ownerId: id, deletedAt: null } }),
        this.prisma.tag.count({ where: { ownerId: id } }),
        this.prisma.transaction.count({ where: { userId: id } }),
        this.prisma.asset.findMany({
          where: { ownerId: id, deletedAt: null },
          include: ASSET_RELATIONS,
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    return {
      user: this.users.toResponse(user),
      assetCount,
      hiddenAssetCount,
      projectCount,
      tagCount,
      transactionCount,
      recentAssets: recentAssets.map(AssetResponseDto.from),
    };
  }

  async setUserSuspended(id: string, suspended: boolean): Promise<AdminActionResultDto> {
    const user = await this.users.setSuspended(id, suspended);
    this.logger.log(`User ${id} ${suspended ? 'suspended' : 'reactivated'}`);
    return {
      ok: true,
      message: suspended
        ? `${user.email} suspended. Their sessions stop working on the next request.`
        : `${user.email} reactivated. They will need to sign in again.`,
    };
  }

  // =========================================================================
  // Assets — platform-wide
  // =========================================================================

  async listAssets(
    query: AdminListAssetsQueryDto,
  ): Promise<PaginatedResponseDto<AssetResponseDto>> {
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.createdAfter) createdAt.gte = new Date(query.createdAfter);
    if (query.createdBefore) createdAt.lte = new Date(query.createdBefore);

    const where: Prisma.AssetWhereInput = {
      deletedAt: query.deleted ? { not: null } : null,
      ...(query.type?.length ? { type: { in: query.type } } : {}),
      ...(query.sourceType?.length ? { sourceType: { in: query.sourceType } } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
              { category: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        include: ASSET_RELATIONS,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return paginate(rows.map(AssetResponseDto.from), total, query.page, query.limit);
  }

  async assetDetail(id: string): Promise<AssetResponseDto> {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: ASSET_RELATIONS,
    });
    if (!asset) {
      throw new NotFoundException('Asset not found.');
    }
    return AssetResponseDto.from(asset);
  }

  /**
   * Admin moderation: hide (soft-delete) or restore any asset, regardless of
   * owner. Mirrors the owner-facing soft delete — the row and its file are kept,
   * and the owner's storage total is adjusted so a hidden asset stops counting
   * against their quota.
   */
  async setAssetHidden(id: string, hidden: boolean): Promise<AssetResponseDto> {
    const asset = await this.prisma.asset.findUnique({ where: { id }, include: ASSET_RELATIONS });
    if (!asset) {
      throw new NotFoundException('Asset not found.');
    }
    if (Boolean(asset.deletedAt) === hidden) {
      return AssetResponseDto.from(asset);
    }

    const updated = await this.prisma.asset.update({
      where: { id },
      data: { deletedAt: hidden ? new Date() : null },
      include: ASSET_RELATIONS,
    });

    if (asset.fileSizeMB) {
      await this.users.addStorageUsage(
        asset.ownerId,
        hidden ? -asset.fileSizeMB : asset.fileSizeMB,
      );
    }
    this.logger.log(`Asset ${id} ${hidden ? 'hidden' : 'restored'} by admin`);
    return AssetResponseDto.from(updated);
  }

  // =========================================================================
  // Marketplace & transactions
  // =========================================================================

  async listListings(pendingOnly: boolean) {
    const result = await this.allSampleListings();
    if (pendingOnly) {
      result.data = result.data.filter((listing) => listing.status === 'draft');
      result.meta.total = result.data.length;
    }
    return result;
  }

  moderateListing(id: string, action: 'approve' | 'reject') {
    return this.marketplace.adminModerate(id, action);
  }

  async listTransactions(query: AdminListTransactionsQueryDto) {
    return this.payments.adminList({
      skip: query.skip,
      limit: query.limit,
      page: query.page,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      status: query.status,
      provider: query.provider,
      userId: query.userId,
    });
  }

  // =========================================================================
  // System status
  // =========================================================================

  async systemStatus(): Promise<SystemStatusDto> {
    let database: 'up' | 'down' = 'down';
    let pgvector: 'installed' | 'missing' | 'unknown' = 'unknown';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
      pgvector = (await this.prisma.hasVectorExtension()) ? 'installed' : 'missing';
    } catch {
      database = 'down';
    }

    return {
      modules: SYSTEM_MODULES,
      health: {
        status: database === 'up' ? 'ok' : 'degraded',
        uptimeSeconds: Math.round(process.uptime()),
        database,
        pgvector,
      },
      payments: this.payments.status(),
      generatedAt: new Date(),
    };
  }
}
