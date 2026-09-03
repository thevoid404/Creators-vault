import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssetSourceType, AssetType, PaymentProviderKind, TransactionStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const toArray = ({ value }: { value: unknown }): unknown => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return value;
};

const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

/* ------------------------------------------------------------------ *
 * Assets — platform-wide
 * ------------------------------------------------------------------ */

export const ADMIN_ASSET_SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'fileSizeMB'] as const;

export class AdminListAssetsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ADMIN_ASSET_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(ADMIN_ASSET_SORT_FIELDS)
  sortBy: (typeof ADMIN_ASSET_SORT_FIELDS)[number] = 'createdAt';

  @ApiPropertyOptional({ enum: AssetType, isArray: true, description: 'Repeat or comma-separate.' })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(AssetType, { each: true })
  type?: AssetType[];

  @ApiPropertyOptional({ enum: AssetSourceType, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(AssetSourceType, { each: true })
  sourceType?: AssetSourceType[];

  @ApiPropertyOptional({ format: 'uuid', description: 'Only assets owned by this user.' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Return hidden (soft-deleted) assets instead of live ones.',
  })
  @IsOptional()
  @Transform(toBool)
  deleted?: boolean = false;

  @ApiPropertyOptional({ description: 'ISO date — only assets created on or after this.' })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'ISO date — only assets created on or before this.' })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;
}

/* ------------------------------------------------------------------ *
 * Users — platform-wide (adds a suspended filter to the base list)
 * ------------------------------------------------------------------ */

export const ADMIN_USER_SORT_FIELDS = ['createdAt', 'email', 'name', 'storageUsedMB'] as const;

export class AdminListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ADMIN_USER_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(ADMIN_USER_SORT_FIELDS)
  sortBy: (typeof ADMIN_USER_SORT_FIELDS)[number] = 'createdAt';

  @ApiPropertyOptional({ enum: ['user', 'admin'] })
  @IsOptional()
  @IsIn(['user', 'admin'])
  role?: 'user' | 'admin';

  @ApiPropertyOptional({ enum: ['free', 'pro'] })
  @IsOptional()
  @IsIn(['free', 'pro'])
  plan?: 'free' | 'pro';

  @ApiPropertyOptional({
    enum: ['active', 'suspended'],
    description: 'Filter by account status.',
  })
  @IsOptional()
  @IsIn(['active', 'suspended'])
  status?: 'active' | 'suspended';
}

/* ------------------------------------------------------------------ *
 * Transactions — platform-wide
 * ------------------------------------------------------------------ */

export const ADMIN_TX_SORT_FIELDS = ['createdAt', 'amount', 'status'] as const;

export class AdminListTransactionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ADMIN_TX_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(ADMIN_TX_SORT_FIELDS)
  sortBy: (typeof ADMIN_TX_SORT_FIELDS)[number] = 'createdAt';

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ enum: PaymentProviderKind })
  @IsOptional()
  @IsEnum(PaymentProviderKind)
  provider?: PaymentProviderKind;

  @ApiPropertyOptional({ format: 'uuid', description: 'Only this user’s transactions.' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

/* ------------------------------------------------------------------ *
 * Marketplace listings — admin view of the stub data
 * ------------------------------------------------------------------ */

export class AdminListListingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'true → only listings awaiting review (status = draft).',
  })
  @IsOptional()
  @IsBooleanString()
  pendingOnly?: string;
}
