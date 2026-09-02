import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AssetResponseDto } from '../../assets/dto/asset-response.dto';

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

export const KEYWORD_SEARCH_SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'type'] as const;

/** `GET /search` — keyword search. */
export class KeywordSearchQueryDto extends PaginationQueryDto {
  @ApiProperty({
    example: 'dark dashboard',
    description: 'The search text. Matches title, description, category, tags and platform.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  declare q: string;

  @ApiPropertyOptional({
    enum: KEYWORD_SEARCH_SORT_FIELDS,
    default: 'createdAt',
    description:
      'Keyword matching produces no usable relevance rank, so results are ordered by a real column. Use POST /search/semantic when relevance ordering is what you want.',
  })
  @IsOptional()
  @IsIn(KEYWORD_SEARCH_SORT_FIELDS)
  sortBy: (typeof KEYWORD_SEARCH_SORT_FIELDS)[number] = 'createdAt';

  @ApiPropertyOptional({ enum: AssetType, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(AssetType, { each: true })
  type?: AssetType[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Tag slugs. An asset must carry them all.' })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/** `POST /search/semantic`. */
export class SemanticSearchDto {
  @ApiProperty({
    example: 'something moody for a music app landing page',
    description: 'Natural-language query. Matched by meaning, not by exact words.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  q!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 1,
    default: 0.15,
    description: 'Drop results below this similarity. Raise it for a stricter result set.',
  })
  @IsOptional()
  @Transform(({ value }) => Number.parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number = 0.15;

  @ApiPropertyOptional({ enum: AssetType, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(AssetType, { each: true })
  type?: AssetType[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

export class SimilarAssetsQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.3 })
  @IsOptional()
  @Transform(({ value }) => Number.parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number = 0.3;
}

export class ScoredAssetDto {
  @ApiProperty({ type: AssetResponseDto })
  asset!: AssetResponseDto;

  @ApiProperty({ example: 0.92, description: 'Similarity, 0–1.' })
  score!: number;

  @ApiProperty({ example: '92% similar', description: 'Pre-formatted for display.' })
  scoreLabel!: string;
}

export class SemanticSearchResponseDto {
  @ApiProperty({ type: [ScoredAssetDto] })
  data!: ScoredAssetDto[];

  @ApiProperty({
    enum: ['semantic', 'keyword'],
    description:
      'Which strategy produced these results. "keyword" means the semantic path was unavailable and the query fell back.',
  })
  strategy!: 'semantic' | 'keyword';

  @ApiPropertyOptional({
    nullable: true,
    example: 'No embedding provider is configured.',
    description: 'Why the fallback happened. Null when strategy is "semantic".',
  })
  fallbackReason!: string | null;

  @ApiProperty({ example: 7 })
  total!: number;
}
