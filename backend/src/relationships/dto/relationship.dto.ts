import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType, RelationType, type AssetRelationship } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateRelationshipDto {
  @ApiProperty({ format: 'uuid', description: 'The asset the edge starts from.' })
  @IsUUID()
  sourceAssetId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Target asset. Send exactly one of targetAssetId or targetProjectId.',
  })
  @IsOptional()
  @IsUUID()
  targetAssetId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Target project. Send exactly one of targetAssetId or targetProjectId.',
  })
  @IsOptional()
  @IsUUID()
  targetProjectId?: string;

  @ApiPropertyOptional({ enum: RelationType, default: RelationType.related_to })
  @IsOptional()
  @IsEnum(RelationType)
  relationType?: RelationType = RelationType.related_to;

  @ApiPropertyOptional({
    example: 'used in the AudioLux dashboard hero',
    maxLength: 500,
    description: 'Why these are connected. This is the part a person actually reads.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trim)
  reason?: string;
}

/** Only the descriptive half of an edge is editable; re-pointing it is a new edge. */
export class UpdateRelationshipDto {
  @ApiPropertyOptional({ enum: RelationType })
  @IsOptional()
  @IsEnum(RelationType)
  relationType?: RelationType;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trim)
  reason?: string;
}

export const RELATIONSHIP_SORT_FIELDS = ['createdAt', 'updatedAt', 'relationType'] as const;
export type RelationshipSortField = (typeof RELATIONSHIP_SORT_FIELDS)[number];

export class ListRelationshipsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RELATIONSHIP_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(RELATIONSHIP_SORT_FIELDS)
  sortBy: RelationshipSortField = 'createdAt';

  @ApiPropertyOptional({ enum: RelationType })
  @IsOptional()
  @IsEnum(RelationType)
  relationType?: RelationType;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Edges touching this asset, in either direction.',
  })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Edges pointing at this project.' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

export class RelatedAssetSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'AudioLux dashboard mockup' }) title!: string;
  @ApiProperty({ enum: AssetType }) type!: AssetType;
  @ApiPropertyOptional({ nullable: true }) previewUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) category!: string | null;
}

export class RelatedProjectSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'AudioLux' }) name!: string;
}

export class RelationshipResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) sourceAssetId!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) targetAssetId!: string | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) targetProjectId!: string | null;
  @ApiProperty({ enum: RelationType }) relationType!: RelationType;
  @ApiPropertyOptional({ nullable: true }) reason!: string | null;

  @ApiPropertyOptional({ type: RelatedAssetSummaryDto, nullable: true })
  sourceAsset!: RelatedAssetSummaryDto | null;

  @ApiPropertyOptional({ type: RelatedAssetSummaryDto, nullable: true })
  targetAsset!: RelatedAssetSummaryDto | null;

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(edge: RelationshipRow): RelationshipResponseDto {
    return {
      id: edge.id,
      sourceAssetId: edge.sourceAssetId,
      targetAssetId: edge.targetAssetId,
      targetProjectId: edge.targetProjectId,
      relationType: edge.relationType,
      reason: edge.reason,
      sourceAsset: summariseAsset(edge.sourceAsset),
      targetAsset: summariseAsset(edge.targetAsset),
      createdAt: edge.createdAt,
      updatedAt: edge.updatedAt,
    };
  }
}

/**
 * One edge as seen *from* a particular asset — which is how the UI reads the
 * graph. `direction` says whether the edge points away from that asset or at it,
 * and `asset`/`project` is whatever sits at the other end.
 */
export class AssetConnectionDto {
  @ApiProperty({ format: 'uuid', description: 'The relationship id, for editing or deleting it.' })
  relationshipId!: string;

  @ApiProperty({ enum: RelationType }) relationType!: RelationType;

  @ApiProperty({
    enum: ['outgoing', 'incoming'],
    description:
      'outgoing — this asset is the source. incoming — another asset points at this one.',
  })
  direction!: 'outgoing' | 'incoming';

  @ApiPropertyOptional({
    nullable: true,
    example: 'used in the AudioLux dashboard hero',
    description: 'The reason text stored on the edge.',
  })
  reason!: string | null;

  @ApiPropertyOptional({
    type: RelatedAssetSummaryDto,
    nullable: true,
    description: 'The asset at the other end. Null when the edge points at a project.',
  })
  asset!: RelatedAssetSummaryDto | null;

  @ApiPropertyOptional({
    type: RelatedProjectSummaryDto,
    nullable: true,
    description: 'The project at the other end. Null when the edge points at an asset.',
  })
  project!: RelatedProjectSummaryDto | null;

  @ApiProperty() createdAt!: Date;
}

type AssetSummarySource = {
  id: string;
  title: string;
  type: AssetType;
  previewUrl: string | null;
  category: string | null;
} | null;

export type RelationshipRow = AssetRelationship & {
  sourceAsset?: AssetSummarySource;
  targetAsset?: AssetSummarySource;
};

export function summariseAsset(
  asset: AssetSummarySource | undefined,
): RelatedAssetSummaryDto | null {
  if (!asset) {
    return null;
  }
  return {
    id: asset.id,
    title: asset.title,
    type: asset.type,
    previewUrl: asset.previewUrl,
    category: asset.category,
  };
}

/** The columns the summaries need. Shared so every query selects the same shape. */
export const ASSET_SUMMARY_SELECT = {
  id: true,
  title: true,
  type: true,
  previewUrl: true,
  category: true,
} as const;
