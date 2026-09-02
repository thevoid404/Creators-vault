import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import type { Project } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsHexColor,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateProjectDto {
  @ApiProperty({ example: 'AudioLux', maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 160)
  @Transform(trim)
  name!: string;

  @ApiPropertyOptional({ example: 'Music visualiser product design', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform(trim)
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/cover.png' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  coverUrl?: string;

  @ApiPropertyOptional({ example: '#7C5CFF', description: 'Hex colour used by the UI.' })
  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export const PROJECT_SORT_FIELDS = ['createdAt', 'updatedAt', 'name'] as const;
export type ProjectSortField = (typeof PROJECT_SORT_FIELDS)[number];

export class ListProjectsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PROJECT_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(PROJECT_SORT_FIELDS)
  sortBy: ProjectSortField = 'createdAt';

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Include archived projects in the result.',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  includeArchived?: boolean = false;

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Return deleted projects (the trash) instead of live ones.',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  deleted?: boolean = false;
}

/** A project row with the aggregate the response includes. */
export type ProjectWithCount = Project & { _count?: { assets: number } };

export class ProjectResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) ownerId!: string;
  @ApiProperty({ example: 'AudioLux' }) name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiPropertyOptional({ nullable: true }) coverUrl!: string | null;
  @ApiPropertyOptional({ example: '#7C5CFF', nullable: true }) color!: string | null;

  @ApiProperty({ example: 24, description: 'Live assets in this project. Excludes trashed ones.' })
  assetCount!: number;

  @ApiPropertyOptional({ nullable: true, description: 'Set while the project is archived.' })
  archivedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, description: 'Set while the project is in the trash.' })
  deletedAt!: Date | null;

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(project: ProjectWithCount): ProjectResponseDto {
    return {
      id: project.id,
      ownerId: project.ownerId,
      name: project.name,
      description: project.description,
      coverUrl: project.coverUrl,
      color: project.color,
      assetCount: project._count?.assets ?? 0,
      archivedAt: project.archivedAt,
      deletedAt: project.deletedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}

export class ProjectSectionDto {
  @ApiProperty({ example: 'UI', nullable: true, description: 'null groups the unfiled assets.' })
  section!: string | null;

  @ApiProperty({ example: 12 })
  assetCount!: number;
}
