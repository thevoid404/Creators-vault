import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ListingStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
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
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * These DTOs are FINAL even though the service logic behind them is stubbed.
 * The frontend and admin panel can be built against these shapes now, and the
 * real implementation will not change them.
 */
export class CreateListingDto {
  @ApiProperty({ example: 'AudioLux UI Kit', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  @Transform(trim)
  title!: string;

  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  @Transform(trim)
  description?: string;

  @ApiProperty({ example: 29.0, minimum: 0, description: 'Major units, e.g. 29.00.' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  price!: number;

  @ApiPropertyOptional({ example: 'USD', minLength: 3, maxLength: 3, default: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  currency?: string = 'USD';

  @ApiPropertyOptional({ description: 'Cover image for the listing.' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  coverUrl?: string;

  @ApiProperty({
    type: [String],
    description: 'Assets bundled into this listing. Must be your own.',
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  assetIds!: string[];

  @ApiPropertyOptional({
    enum: ListingStatus,
    default: ListingStatus.draft,
    description: 'Create as a draft, or publish immediately.',
  })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus = ListingStatus.draft;
}

export class UpdateListingDto extends PartialType(CreateListingDto) {}

export const LISTING_SORT_FIELDS = ['createdAt', 'price', 'title', 'publishedAt'] as const;

export class ListListingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LISTING_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(LISTING_SORT_FIELDS)
  sortBy: (typeof LISTING_SORT_FIELDS)[number] = 'createdAt';

  @ApiPropertyOptional({ enum: ListingStatus })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @ApiPropertyOptional({ format: 'uuid', description: 'Only listings from this seller.' })
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @ApiPropertyOptional({ minimum: 0, description: 'Minimum price, inclusive.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'Maximum price, inclusive.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;
}

export class ListingSellerDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiPropertyOptional({ nullable: true }) name!: string | null;
  @ApiPropertyOptional({ nullable: true }) avatarUrl!: string | null;
}

export class ListingItemDto {
  @ApiProperty({ format: 'uuid' }) assetId!: string;
  @ApiProperty({ example: 'Dashboard mockup' }) title!: string;
  @ApiProperty({ example: 'design_file' }) type!: string;
  @ApiPropertyOptional({ nullable: true }) previewUrl!: string | null;
}

export class ListingResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: ListingSellerDto }) seller!: ListingSellerDto;
  @ApiProperty({ example: 'AudioLux UI Kit' }) title!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ example: 29.0 }) price!: number;
  @ApiProperty({ example: 'USD' }) currency!: string;
  @ApiPropertyOptional({ nullable: true }) coverUrl!: string | null;
  @ApiProperty({ enum: ListingStatus }) status!: ListingStatus;

  @ApiProperty({ type: [ListingItemDto], description: 'The assets included in this listing.' })
  items!: ListingItemDto[];

  @ApiProperty({ example: 3 }) itemCount!: number;
  @ApiPropertyOptional({ nullable: true }) publishedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  @ApiProperty({
    example: true,
    description:
      'Always true in this build. The marketplace is a stub: this listing is placeholder data and cannot be bought.',
  })
  isStub!: boolean;
}

export class PurchaseListingDto {
  @ApiPropertyOptional({
    description: 'Where to send the buyer after a successful payment.',
    example: 'https://app.creatorsvault.dev/purchases/success',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  successUrl?: string;

  @ApiPropertyOptional({ description: 'Where to send the buyer if they cancel.' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  cancelUrl?: string;
}

export class PurchaseResponseDto {
  @ApiProperty({ format: 'uuid', description: 'The local transaction created for this attempt.' })
  transactionId!: string;

  @ApiProperty({ example: 'pending', description: 'Transaction status at creation.' })
  status!: string;

  @ApiProperty({ example: 'mock_cs_9f1c2d3e…', description: 'Provider-side checkout session id.' })
  sessionId!: string;

  @ApiProperty({
    example: 'http://localhost:4000/api/v1/payments/mock-checkout/mock_cs_9f1c…',
    description: 'Send the buyer here to pay.',
  })
  checkoutUrl!: string;

  @ApiProperty() expiresAt!: Date;

  @ApiProperty({ example: 'mock', description: 'Which PaymentProvider handled this.' })
  provider!: string;

  @ApiProperty({
    example: false,
    description:
      'False in this build. No money moves and no real gateway is contacted — the checkout URL is a placeholder.',
  })
  isLive!: boolean;
}
