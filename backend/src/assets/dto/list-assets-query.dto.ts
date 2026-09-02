import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssetSourceType, AssetType, LicenseType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const ASSET_SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'fileSizeMB', 'type'] as const;
export type AssetSortField = (typeof ASSET_SORT_FIELDS)[number];

const toArray = ({ value }: { value: unknown }): unknown => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return value;
};

export class ListAssetsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ASSET_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(ASSET_SORT_FIELDS)
  sortBy: AssetSortField = 'createdAt';

  @ApiPropertyOptional({
    enum: AssetType,
    isArray: true,
    description: 'Repeat the param or pass a comma-separated list.',
  })
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

  @ApiPropertyOptional({ enum: LicenseType, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(LicenseType, { each: true })
  licenseType?: LicenseType[];

  @ApiPropertyOptional({ example: 'UI Kit' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({ example: 'envato' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sourcePlatform?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Only assets in this project.' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ example: 'UI', description: 'Only assets in this section of a project.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  section?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Tag slugs. An asset must carry every slug listed to match.',
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Return soft-deleted assets (the trash) instead of live ones.',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  deleted?: boolean = false;
}
