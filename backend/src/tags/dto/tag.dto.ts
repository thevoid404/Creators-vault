import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import type { Tag } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsHexColor,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateTagDto {
  @ApiProperty({ example: 'Dark Mode', maxLength: 60 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 60)
  @Transform(trim)
  name!: string;

  @ApiPropertyOptional({ example: '#7C5CFF' })
  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class UpdateTagDto extends PartialType(CreateTagDto) {}

export const TAG_SORT_FIELDS = ['createdAt', 'name', 'usageCount'] as const;
export type TagSortField = (typeof TAG_SORT_FIELDS)[number];

export class ListTagsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: TAG_SORT_FIELDS,
    default: 'usageCount',
    description: '`usageCount` sorts by how many live assets carry the tag.',
  })
  @IsOptional()
  @IsIn(TAG_SORT_FIELDS)
  sortBy: TagSortField = 'usageCount';

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Hide tags that are not on any live asset.',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  usedOnly?: boolean = false;
}

/** A tag row with the aggregate the response includes. */
export type TagWithCount = Tag & { _count?: { assets: number } };

export class TagResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Dark Mode' }) name!: string;
  @ApiProperty({ example: 'dark-mode', description: 'Canonical form. Filter by this.' })
  slug!: string;
  @ApiPropertyOptional({ example: '#7C5CFF', nullable: true }) color!: string | null;
  @ApiProperty({ example: 12, description: 'Live assets carrying this tag.' })
  usageCount!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(tag: TagWithCount): TagResponseDto {
    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
      usageCount: tag._count?.assets ?? 0,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    };
  }
}

export class SuggestTagsDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Suggest for an existing asset. Its title, description, category and type are used, and tags it already carries are excluded.',
  })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional({
    example: 'AudioLux dashboard dark mode mockup',
    description: 'Free text to suggest from. Use this before an asset exists.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trim)
  title?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform(trim)
  description?: string;

  @ApiPropertyOptional({ example: 'UI Kit', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  category?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Tags already chosen. Excluded from the suggestions.',
    maxItems: 30,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  exclude?: string[];

  @ApiPropertyOptional({ minimum: 1, maximum: 25, default: 8 })
  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(25)
  limit?: number = 8;
}

export class TagSuggestionDto {
  @ApiProperty({ example: 'dashboard' }) name!: string;
  @ApiProperty({ example: 'dashboard' }) slug!: string;

  @ApiProperty({
    example: 0.82,
    description: 'Confidence, 0–1. Suggestions are returned highest first.',
  })
  score!: number;

  @ApiProperty({
    example: 'existing-tag',
    enum: ['existing-tag', 'co-occurrence', 'keyword'],
    description: 'Why this was suggested — lets the UI group or explain the list.',
  })
  reason!: 'existing-tag' | 'co-occurrence' | 'keyword';

  @ApiProperty({
    example: false,
    description: 'False when accepting this suggestion would create a new tag.',
  })
  exists!: boolean;
}
