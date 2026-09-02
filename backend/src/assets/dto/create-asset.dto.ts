import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AssetType, LicenseType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * Fields shared by every ingestion route. Each route adds only what is specific
 * to it, which is what lets all of them funnel into one
 * `AssetsService.createAsset()`.
 */
export class BaseAssetFieldsDto {
  @ApiPropertyOptional({
    example: 'AudioLux dashboard mockup',
    description: 'Falls back to the filename or the page title when omitted.',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  @Transform(trim)
  title?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform(trim)
  description?: string;

  @ApiPropertyOptional({
    enum: AssetType,
    description: 'Inferred from the file or the URL when omitted.',
  })
  @IsOptional()
  @IsEnum(AssetType)
  type?: AssetType;

  @ApiPropertyOptional({ example: 'UI Kit', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  category?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['dashboard', 'dark-mode'],
    description: 'Tag names. Tags that do not exist yet are created for this user.',
    maxItems: 30,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Transform(({ value }) =>
    // Accepts both a JSON array and a comma-separated string, because
    // multipart/form-data cannot carry a real array.
    typeof value === 'string'
      ? value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      : value,
  )
  tags?: string[];

  @ApiPropertyOptional({ format: 'uuid', description: 'Project to file this asset under.' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    example: 'UI',
    maxLength: 80,
    description: 'Sub-group within the project.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(trim)
  section?: string;

  @ApiPropertyOptional({ enum: LicenseType, default: LicenseType.unknown })
  @IsOptional()
  @IsEnum(LicenseType)
  licenseType?: LicenseType;

  @ApiPropertyOptional({
    maxLength: 2000,
    description: 'Free text. License documents are never parsed or interpreted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trim)
  licenseNote?: string;
}

/** `POST /assets` — create a record with no file and no URL. */
export class CreateAssetDto extends BaseAssetFieldsDto {
  @ApiProperty({ example: 'Brand palette notes', maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 300)
  @Transform(trim)
  declare title: string;
}

/** `POST /assets/upload` — the non-file fields that accompany the multipart body. */
export class UploadAssetDto extends BaseAssetFieldsDto {
  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description:
      'When a .zip is uploaded, extract it and create one asset per entry instead of storing the archive itself. This is how a folder is imported.',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  expandZip?: boolean = false;
}

/** `POST /assets/from-url`. */
export class CreateAssetFromUrlDto extends BaseAssetFieldsDto {
  @ApiProperty({ example: 'https://www.figma.com/file/abc123/AudioLux' })
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  sourceUrl!: string;

  @ApiPropertyOptional({
    type: Boolean,
    default: true,
    description:
      'Fetch the page for its title, description and preview image. Set false to skip the network call and use only what you send.',
  })
  @IsOptional()
  @Transform(({ value }) => !(value === false || value === 'false' || value === '0'))
  fetchMetadata?: boolean = true;
}

/** `POST /assets/from-marketplace-link` — a URL import plus manually entered purchase info. */
export class CreateAssetFromMarketplaceLinkDto extends CreateAssetFromUrlDto {
  @ApiPropertyOptional({
    example: 'envato',
    maxLength: 80,
    description: 'Marketplace name. Free text — inferred from the URL host when omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(trim)
  sourcePlatform?: string;

  @ApiPropertyOptional({ example: 29.0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000_000)
  purchasePrice?: number;

  @ApiPropertyOptional({ example: 'USD', minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  purchaseCurrency?: string;

  @ApiPropertyOptional({ example: '2026-08-14', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ example: 'ENV-88213', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  purchaseOrderRef?: string;
}

/** `PATCH /assets/:id`. Every field is optional; only what is sent changes. */
export class UpdateAssetDto extends PartialType(BaseAssetFieldsDto) {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Send null to remove the asset from its project.',
  })
  @IsOptional()
  @IsUUID()
  declare projectId?: string;
}
