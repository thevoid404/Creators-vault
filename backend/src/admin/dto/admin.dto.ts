import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetResponseDto } from '../../assets/dto/asset-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/* ------------------------------------------------------------------ *
 * GET /admin/stats
 * ------------------------------------------------------------------ */

export class PlatformCountsDto {
  @ApiProperty({ example: 128 }) users!: number;
  @ApiProperty({ example: 12, description: 'Users with role = admin.' }) admins!: number;
  @ApiProperty({ example: 4, description: 'Currently suspended accounts.' })
  suspendedUsers!: number;
  @ApiProperty({ example: 3204, description: 'Live assets — the trash is excluded.' })
  assets!: number;
  @ApiProperty({ example: 61, description: 'Soft-deleted assets.' }) hiddenAssets!: number;
  @ApiProperty({ example: 240 }) projects!: number;
  @ApiProperty({ example: 18442.7, description: 'Sum of every user’s storageUsedMB.' })
  storageUsedMB!: number;
  @ApiProperty({
    example: 2,
    description: 'Active marketplace listings. Stub data — see `marketplaceIsStub`.',
  })
  activeListings!: number;
  @ApiProperty({
    example: 37,
    description: 'Transaction rows. Real rows, stub provider — see `paymentsIsLive`.',
  })
  transactions!: number;
}

export class ActivityItemDto {
  @ApiProperty({ enum: ['user_signup', 'asset_upload', 'listing_created'] })
  type!: 'user_signup' | 'asset_upload' | 'listing_created';
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Ada Lovelace uploaded “AudioLux dashboard mockup”' })
  label!: string;
  @ApiPropertyOptional({ nullable: true, description: 'The acting user, when known.' })
  actor!: string | null;
  @ApiProperty() at!: Date;
}

export class PlatformStatsDto {
  @ApiProperty({ type: PlatformCountsDto }) counts!: PlatformCountsDto;

  @ApiProperty({
    type: [ActivityItemDto],
    description: 'Most recent signups, uploads and listings, newest first.',
  })
  recentActivity!: ActivityItemDto[];

  @ApiProperty({
    example: false,
    description: 'The marketplace module is a stub — listing figures are sample data.',
  })
  marketplaceIsStub!: boolean;

  @ApiProperty({
    example: false,
    description: 'Payments run on MockPaymentProvider — transaction figures move no money.',
  })
  paymentsIsLive!: boolean;

  @ApiProperty() generatedAt!: Date;
}

/* ------------------------------------------------------------------ *
 * GET /admin/users/:id
 * ------------------------------------------------------------------ */

export class AdminUserDetailDto {
  @ApiProperty({ type: UserResponseDto }) user!: UserResponseDto;
  @ApiProperty({ example: 42, description: 'Live assets owned by this user.' }) assetCount!: number;
  @ApiProperty({ example: 3, description: 'Hidden (soft-deleted) assets.' })
  hiddenAssetCount!: number;
  @ApiProperty({ example: 5 }) projectCount!: number;
  @ApiProperty({ example: 7 }) tagCount!: number;
  @ApiProperty({ example: 0, description: 'Transaction rows for this user.' })
  transactionCount!: number;

  @ApiProperty({
    type: [AssetResponseDto],
    description: 'This user’s most recent live assets (up to 10).',
  })
  recentAssets!: AssetResponseDto[];
}

/* ------------------------------------------------------------------ *
 * GET /admin/system/status
 * ------------------------------------------------------------------ */

export class ModuleStatusDto {
  @ApiProperty({ example: 'marketplace' }) key!: string;
  @ApiProperty({ example: 'Marketplace' }) name!: string;
  @ApiProperty({ enum: ['live', 'stub', 'backend-only'] })
  status!: 'live' | 'stub' | 'backend-only';
  @ApiProperty({ example: 6, description: 'Documented endpoints in this module.' })
  endpoints!: number;
  @ApiProperty({
    example: 'Read endpoints return sample listings; writes return 501. No money moves.',
  })
  note!: string;
}

export class SystemStatusDto {
  @ApiProperty({ type: [ModuleStatusDto] }) modules!: ModuleStatusDto[];

  @ApiProperty({
    description: 'Live GET /health payload.',
    example: { status: 'ok', database: 'up', pgvector: 'installed' },
  })
  health!: unknown;

  @ApiProperty({
    description: 'Live GET /payments/status payload.',
    example: { provider: 'mock', isLive: false },
  })
  payments!: unknown;

  @ApiProperty() generatedAt!: Date;
}

/* ------------------------------------------------------------------ *
 * Suspend / reactivate + moderation results
 * ------------------------------------------------------------------ */

export class AdminActionResultDto {
  @ApiProperty({ example: true }) ok!: boolean;
  @ApiProperty({ example: 'User suspended.' }) message!: string;
}
