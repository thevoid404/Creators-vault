import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType, LicenseType, type ExtensionToken } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
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

export class CreateExtensionTokenDto {
  @ApiProperty({
    example: 'Chrome on my laptop',
    description: 'Label so the user can tell their tokens apart when revoking one.',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 80)
  @Transform(trim)
  name!: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 3650,
    description:
      'Days until the token expires. Omit to use the server default (EXTENSION_TOKEN_TTL_DAYS).',
  })
  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(3650)
  expiresInDays?: number;
}

export class ExtensionTokenResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Chrome on my laptop' }) name!: string;

  @ApiProperty({
    example: 'cv_ext_9f1c2d',
    description: 'First characters of the token, so the user can identify it in a list.',
  })
  tokenPrefix!: string;

  @ApiPropertyOptional({ nullable: true }) lastUsedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) expiresAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) revokedAt!: Date | null;
  @ApiProperty() createdAt!: Date;

  static from(token: ExtensionToken): ExtensionTokenResponseDto {
    return {
      id: token.id,
      name: token.name,
      tokenPrefix: token.tokenPrefix,
      lastUsedAt: token.lastUsedAt,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
      createdAt: token.createdAt,
    };
  }
}

/** Returned only once, at creation. The plaintext token is never recoverable afterwards. */
export class CreatedExtensionTokenDto extends ExtensionTokenResponseDto {
  @ApiProperty({
    example: 'cv_ext_9f1c2d3e4a5b6c7d8e9f0a1b2c3d4e5f60718293',
    description:
      'The token itself. Shown once and never again — only its hash is stored. Send it as the X-Extension-Token header.',
  })
  token!: string;
}

/**
 * What a browser extension posts when the user captures the page they are on.
 *
 * The extension already has the page open, so it sends the title, preview image
 * and selected text it can read directly from the DOM. That is both faster and
 * more accurate than the server re-fetching the URL, and it works on pages
 * behind a login that the server could never reach.
 */
export class ExtensionCaptureDto {
  @ApiProperty({ example: 'https://dribbble.com/shots/123456-dashboard' })
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  sourceUrl!: string;

  @ApiPropertyOptional({
    example: 'Dashboard UI concept',
    description: 'The page title, read by the extension. Falls back to the domain.',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  @Transform(trim)
  title?: string;

  @ApiPropertyOptional({
    description: 'Page description, or the text the user had selected when they captured.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform(trim)
  description?: string;

  @ApiPropertyOptional({
    description: 'Image the extension found on the page (og:image, or the image right-clicked).',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  previewUrl?: string;

  @ApiPropertyOptional({ enum: AssetType, description: 'Inferred from the URL when omitted.' })
  @IsOptional()
  @IsEnum(AssetType)
  type?: AssetType;

  @ApiPropertyOptional({ example: 'Inspiration', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  category?: string;

  @ApiPropertyOptional({ type: [String], example: ['inspiration', 'dashboard'], maxItems: 30 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(trim)
  section?: string;

  @ApiPropertyOptional({ enum: LicenseType })
  @IsOptional()
  @IsEnum(LicenseType)
  licenseType?: LicenseType;

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description:
      'Ask the server to fetch the page for metadata as well. Off by default — the extension can already read the page, including pages the server cannot reach.',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  fetchMetadata?: boolean = false;
}
