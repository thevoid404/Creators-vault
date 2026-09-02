import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export type SortOrder = 'asc' | 'desc';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Base query for every list endpoint in the API.
 *
 * Pagination, sorting and free-text filtering exist on day one deliberately:
 * adding them later would change the response envelope of every list route and
 * break the frontend contract.
 *
 * Per-module queries extend this and add their own filters plus an overridden
 * `sortBy` with a module-specific whitelist.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1, description: '1-based page number.' })
  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
    description: `Items per page. Capped at ${MAX_PAGE_SIZE}.`,
  })
  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'Sort direction.',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: SortOrder = 'desc';

  @ApiPropertyOptional({
    description: 'Free-text filter. The fields it covers are documented per endpoint.',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  q?: string;

  /** Prisma `skip`, derived from page/limit. */
  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
