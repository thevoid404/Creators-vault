import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AssetSourceType,
  AssetType,
  EmbeddingStatus,
  LicenseType,
  type Asset,
  type Project,
  type Tag,
} from '@prisma/client';

/** An asset row with the relations the response includes. */
export type AssetWithRelations = Asset & {
  tags?: Array<{ tag: Tag }>;
  project?: Pick<Project, 'id' | 'name'> | null;
};

export class AssetTagSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'dashboard' }) name!: string;
  @ApiProperty({ example: 'dashboard' }) slug!: string;
  @ApiPropertyOptional({ example: '#7C5CFF', nullable: true }) color!: string | null;
}

export class AssetProjectSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'AudioLux' }) name!: string;
}

export class PurchaseInfoDto {
  @ApiPropertyOptional({ example: 29.0, nullable: true }) price!: number | null;
  @ApiPropertyOptional({ example: 'USD', nullable: true }) currency!: string | null;
  @ApiPropertyOptional({ nullable: true }) date!: Date | null;
  @ApiPropertyOptional({ example: 'ENV-88213', nullable: true }) orderRef!: string | null;
}

/**
 * The single serialisation of an asset, used by every endpoint that returns one.
 * Keeping it in one place is what stops the shape drifting between `/assets`,
 * `/search` and `/assets/:id/similar`.
 */
export class AssetResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) ownerId!: string;
  @ApiProperty({ example: 'AudioLux dashboard mockup' }) title!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;

  @ApiProperty({ enum: AssetType }) type!: AssetType;
  @ApiPropertyOptional({ example: 'UI Kit', nullable: true }) category!: string | null;

  @ApiProperty({ enum: AssetSourceType }) sourceType!: AssetSourceType;
  @ApiPropertyOptional({ nullable: true }) sourceUrl!: string | null;
  @ApiPropertyOptional({ example: 'envato', nullable: true }) sourcePlatform!: string | null;

  @ApiProperty({ enum: LicenseType }) licenseType!: LicenseType;
  @ApiPropertyOptional({ nullable: true }) licenseNote!: string | null;

  @ApiPropertyOptional({ nullable: true }) previewUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) fileUrl!: string | null;
  @ApiPropertyOptional({ example: 'image/png', nullable: true }) mimeType!: string | null;
  @ApiPropertyOptional({ example: 2.41, nullable: true }) fileSizeMB!: number | null;

  @ApiPropertyOptional({ type: AssetProjectSummaryDto, nullable: true })
  project!: AssetProjectSummaryDto | null;

  @ApiPropertyOptional({
    example: 'UI',
    nullable: true,
    description: 'Sub-group within the project.',
  })
  section!: string | null;

  @ApiProperty({ type: [AssetTagSummaryDto] })
  tags!: AssetTagSummaryDto[];

  @ApiProperty({ example: 1 }) version!: number;

  @ApiPropertyOptional({
    type: PurchaseInfoDto,
    nullable: true,
    description:
      'Present on marketplace-link imports. Entered by hand; no marketplace API is called.',
  })
  purchase!: PurchaseInfoDto | null;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
    description: 'Importer metadata (favicon, og:image, …).',
  })
  metadata!: unknown;

  @ApiProperty({
    enum: EmbeddingStatus,
    description: 'Whether this asset is indexed for semantic search.',
  })
  embeddingStatus!: EmbeddingStatus;

  @ApiPropertyOptional({ nullable: true, description: 'Set when the asset is in the trash.' })
  deletedAt!: Date | null;

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(asset: AssetWithRelations): AssetResponseDto {
    const hasPurchase =
      asset.purchasePrice !== null ||
      asset.purchaseCurrency !== null ||
      asset.purchaseDate !== null ||
      asset.purchaseOrderRef !== null;

    return {
      id: asset.id,
      ownerId: asset.ownerId,
      title: asset.title,
      description: asset.description,
      type: asset.type,
      category: asset.category,
      sourceType: asset.sourceType,
      sourceUrl: asset.sourceUrl,
      sourcePlatform: asset.sourcePlatform,
      licenseType: asset.licenseType,
      licenseNote: asset.licenseNote,
      previewUrl: asset.previewUrl,
      fileUrl: asset.fileUrl,
      mimeType: asset.mimeType,
      fileSizeMB: asset.fileSizeMB,
      project: asset.project ? { id: asset.project.id, name: asset.project.name } : null,
      section: asset.section,
      tags: (asset.tags ?? []).map(({ tag }) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
      })),
      version: asset.version,
      purchase: hasPurchase
        ? {
            price: asset.purchasePrice === null ? null : Number(asset.purchasePrice),
            currency: asset.purchaseCurrency,
            date: asset.purchaseDate,
            orderRef: asset.purchaseOrderRef,
          }
        : null,
      metadata: asset.metadata ?? null,
      embeddingStatus: asset.embeddingStatus,
      deletedAt: asset.deletedAt,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }
}
