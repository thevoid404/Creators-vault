import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssetSourceType, AssetType, LicenseType, Prisma, type Tag } from '@prisma/client';
import { paginate, type PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage-provider.interface';
import { TagsService } from '../tags/tags.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { UsersService } from '../users/users.service';
import { inferAssetType, inferAssetTypeFromUrl } from './asset-type.util';
import { AssetResponseDto, type AssetWithRelations } from './dto/asset-response.dto';
import type {
  CreateAssetDto,
  CreateAssetFromMarketplaceLinkDto,
  CreateAssetFromUrlDto,
  UpdateAssetDto,
  UploadAssetDto,
} from './dto/create-asset.dto';
import type { ListAssetsQueryDto } from './dto/list-assets-query.dto';
import { UrlMetadataService } from './url-metadata.service';

/** An uploaded file, narrowed to what this service needs from Multer. */
export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * The one shape `createAsset` accepts. Every ingestion route builds this and
 * hands it over — the routes differ only in how they populate it.
 */
export interface CreateAssetInput {
  ownerId: string;
  title: string;
  description?: string | null;
  type: AssetType;
  category?: string | null;
  sourceType: AssetSourceType;
  sourceUrl?: string | null;
  sourcePlatform?: string | null;
  licenseType?: LicenseType;
  licenseNote?: string | null;
  previewUrl?: string | null;
  fileUrl?: string | null;
  storageKey?: string | null;
  mimeType?: string | null;
  fileSizeMB?: number | null;
  checksum?: string | null;
  projectId?: string | null;
  section?: string | null;
  tagNames?: string[];
  purchasePrice?: number | null;
  purchaseCurrency?: string | null;
  purchaseDate?: Date | null;
  purchaseOrderRef?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

const RELATIONS = {
  tags: { include: { tag: true } },
  project: { select: { id: true, name: true } },
} as const;

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly tags: TagsService,
    private readonly urlMetadata: UrlMetadataService,
    private readonly embeddings: EmbeddingsService,
    private readonly config: ConfigService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  // =========================================================================
  // The single creation path
  // =========================================================================

  /**
   * Every route that creates an asset ends here — upload, URL import,
   * marketplace-link import, and the Phase 6 extension capture. Keeping one
   * function means tag resolution, project ownership checks, storage accounting
   * and (from Phase 5) embedding indexing cannot drift between entry points.
   */
  async createAsset(input: CreateAssetInput): Promise<AssetResponseDto> {
    if (input.projectId) {
      await this.assertProjectOwnership(input.ownerId, input.projectId);
    }

    const tags: Tag[] = input.tagNames?.length
      ? await this.tags.resolveNames(input.ownerId, input.tagNames)
      : [];

    const asset = await this.prisma.asset.create({
      data: {
        ownerId: input.ownerId,
        title: input.title,
        description: input.description ?? null,
        type: input.type,
        category: input.category ?? null,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl ?? null,
        sourcePlatform: input.sourcePlatform ?? null,
        licenseType: input.licenseType ?? LicenseType.unknown,
        licenseNote: input.licenseNote ?? null,
        previewUrl: input.previewUrl ?? null,
        fileUrl: input.fileUrl ?? null,
        storageKey: input.storageKey ?? null,
        mimeType: input.mimeType ?? null,
        fileSizeMB: input.fileSizeMB ?? null,
        checksum: input.checksum ?? null,
        projectId: input.projectId ?? null,
        section: input.section ?? null,
        purchasePrice: input.purchasePrice ?? null,
        purchaseCurrency: input.purchaseCurrency ?? null,
        purchaseDate: input.purchaseDate ?? null,
        purchaseOrderRef: input.purchaseOrderRef ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
        tags: { create: tags.map((tag) => ({ tagId: tag.id })) },
      },
      include: RELATIONS,
    });

    if (input.fileSizeMB) {
      await this.users.addStorageUsage(input.ownerId, input.fileSizeMB);
    }

    // Indexing is deliberately fire-and-forget: the response returns as soon as
    // the row exists and the vector lands a moment later. This is the "AI works
    // in the background, search stays fast" split — an upload the user already
    // completed must never fail because an embedding provider is slow or down.
    // A failure marks the row and POST /search/reindex catches it up.
    this.embeddings.scheduleIndexing({
      id: asset.id,
      title: asset.title,
      description: asset.description,
      category: asset.category,
      type: asset.type,
      sourcePlatform: asset.sourcePlatform,
      tagNames: tags.map((tag) => tag.name),
    });

    return AssetResponseDto.from(asset);
  }

  // =========================================================================
  // Ingestion routes
  // =========================================================================

  /** `POST /assets` — a record with no file and no URL. */
  async createManual(ownerId: string, dto: CreateAssetDto): Promise<AssetResponseDto> {
    return this.createAsset({
      ownerId,
      title: dto.title,
      description: dto.description,
      type: dto.type ?? AssetType.other,
      category: dto.category,
      sourceType: AssetSourceType.url,
      licenseType: dto.licenseType,
      licenseNote: dto.licenseNote,
      projectId: dto.projectId,
      section: dto.section,
      tagNames: dto.tags,
    });
  }

  /**
   * `POST /assets/upload` — one asset per file.
   *
   * Handles all three cases the product needs: a single file, several files in
   * one request, and a folder, which the client sends as a .zip with
   * `expandZip=true`.
   */
  async createFromUpload(
    ownerId: string,
    files: UploadedFile[],
    dto: UploadAssetDto,
  ): Promise<AssetResponseDto[]> {
    if (files.length === 0) {
      throw new BadRequestException('No files were uploaded. Send them under the "files" field.');
    }

    const expanded = dto.expandZip ? await this.expandArchives(files) : files;

    const totalMB = expanded.reduce((sum, file) => sum + file.size / (1024 * 1024), 0);
    if (await this.users.wouldExceedQuota(ownerId, totalMB)) {
      throw new PayloadTooLargeException(
        `This upload would exceed your ${this.config.get<number>('storage.userQuotaMB')} MB storage quota.`,
      );
    }

    const created: AssetResponseDto[] = [];
    for (const file of expanded) {
      const stored = await this.storage.save({
        ownerId,
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      });

      const type = dto.type ?? inferAssetType(file.originalname, file.mimetype);
      created.push(
        await this.createAsset({
          ownerId,
          // With several files in one request, a single supplied title would
          // apply to all of them, so it is only honoured for a lone file.
          title:
            expanded.length === 1 && dto.title
              ? dto.title
              : this.titleFromFilename(file.originalname),
          description: dto.description,
          type,
          category: dto.category,
          sourceType: AssetSourceType.upload,
          licenseType: dto.licenseType,
          licenseNote: dto.licenseNote,
          previewUrl: type === AssetType.image || type === AssetType.vector ? stored.url : null,
          fileUrl: stored.url,
          storageKey: stored.key,
          mimeType: stored.mimeType,
          fileSizeMB: Number((stored.sizeBytes / (1024 * 1024)).toFixed(4)),
          checksum: stored.checksum,
          projectId: dto.projectId,
          section: dto.section,
          tagNames: dto.tags,
          metadata: { originalName: file.originalname },
        }),
      );
    }

    return created;
  }

  /**
   * `POST /assets/from-url` — import a link, optionally scraping its metadata.
   *
   * `overrides` exists so the extension-capture route in Phase 6 can reuse this
   * whole path — SSRF validation, metadata scrape, type inference, tag
   * resolution — while recording a different `sourceType` and supplying the
   * preview image it read from the page itself. It is the reuse the spec asks
   * for, rather than a second copy of this logic.
   */
  async createFromUrl(
    ownerId: string,
    dto: CreateAssetFromUrlDto,
    overrides: {
      sourceType?: AssetSourceType;
      previewUrl?: string | null;
      extraMetadata?: Record<string, unknown>;
    } = {},
  ): Promise<AssetResponseDto> {
    const metadata =
      dto.fetchMetadata === false ? null : await this.urlMetadata.fetch(dto.sourceUrl);

    if (!metadata) {
      // Still validate the URL even when not fetching it, so a stored sourceUrl
      // is always something that could be opened.
      await this.urlMetadata.assertFetchable(dto.sourceUrl);
    }

    const domain = metadata?.domain ?? new URL(dto.sourceUrl).hostname.replace(/^www\./, '');

    return this.createAsset({
      ownerId,
      title: dto.title ?? metadata?.title ?? domain,
      description: dto.description ?? metadata?.description ?? null,
      type: dto.type ?? inferAssetTypeFromUrl(dto.sourceUrl, metadata?.contentType),
      category: dto.category,
      sourceType: overrides.sourceType ?? AssetSourceType.url,
      sourceUrl: dto.sourceUrl,
      sourcePlatform: metadata?.siteName ?? domain,
      licenseType: dto.licenseType,
      licenseNote: dto.licenseNote,
      // A caller that already has the page open knows the preview better than a
      // scrape does, so an explicit value wins.
      previewUrl: overrides.previewUrl ?? metadata?.previewUrl ?? null,
      projectId: dto.projectId,
      section: dto.section,
      tagNames: dto.tags,
      metadata: {
        ...(metadata
          ? {
              faviconUrl: metadata.faviconUrl,
              siteName: metadata.siteName,
              domain: metadata.domain,
              contentType: metadata.contentType,
              fetchedAt: new Date().toISOString(),
            }
          : { domain }),
        ...(overrides.extraMetadata ?? {}),
      },
    });
  }

  /**
   * `POST /assets/from-marketplace-link` — the URL import plus manually entered
   * purchase details. No marketplace API is called; every purchase field is
   * optional and supplied by the user.
   */
  async createFromMarketplaceLink(
    ownerId: string,
    dto: CreateAssetFromMarketplaceLinkDto,
  ): Promise<AssetResponseDto> {
    const asset = await this.createFromUrl(ownerId, dto);

    const domain = new URL(dto.sourceUrl).hostname.replace(/^www\./, '');
    const updated = await this.prisma.asset.update({
      where: { id: asset.id },
      data: {
        sourceType: AssetSourceType.marketplace_link,
        sourcePlatform: dto.sourcePlatform ?? domain,
        purchasePrice: dto.purchasePrice ?? null,
        purchaseCurrency: dto.purchaseCurrency ?? null,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        purchaseOrderRef: dto.purchaseOrderRef ?? null,
      },
      include: RELATIONS,
    });

    return AssetResponseDto.from(updated);
  }

  // =========================================================================
  // Read
  // =========================================================================

  async list(
    ownerId: string,
    query: ListAssetsQueryDto,
  ): Promise<PaginatedResponseDto<AssetResponseDto>> {
    const where = this.buildWhere(ownerId, query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        include: RELATIONS,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return paginate(rows.map(AssetResponseDto.from), total, query.page, query.limit);
  }

  async findOne(ownerId: string, id: string): Promise<AssetResponseDto> {
    return AssetResponseDto.from(await this.findOwnedOrThrow(ownerId, id));
  }

  /**
   * Ownership check used by this service and by the relationships and search
   * modules. A soft-deleted asset is still readable — that is what makes the
   * trash view and restore possible — but `includeDeleted: false` hides it.
   */
  async findOwnedOrThrow(
    ownerId: string,
    id: string,
    options: { includeDeleted?: boolean } = { includeDeleted: true },
  ): Promise<AssetWithRelations> {
    const asset = await this.prisma.asset.findUnique({ where: { id }, include: RELATIONS });

    // A 404 rather than a 403 for another user's asset: the existence of an id
    // in someone else's vault is not information this caller should get.
    if (!asset || asset.ownerId !== ownerId) {
      throw new NotFoundException('Asset not found.');
    }
    if (!options.includeDeleted && asset.deletedAt) {
      throw new NotFoundException('Asset not found.');
    }
    return asset;
  }

  // =========================================================================
  // Write
  // =========================================================================

  async update(ownerId: string, id: string, dto: UpdateAssetDto): Promise<AssetResponseDto> {
    const existing = await this.findOwnedOrThrow(ownerId, id);

    if (dto.projectId) {
      await this.assertProjectOwnership(ownerId, dto.projectId);
    }

    const data: Prisma.AssetUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.section !== undefined) data.section = dto.section;
    if (dto.licenseType !== undefined) data.licenseType = dto.licenseType;
    if (dto.licenseNote !== undefined) data.licenseNote = dto.licenseNote;
    if (dto.projectId !== undefined) {
      data.project = dto.projectId ? { connect: { id: dto.projectId } } : { disconnect: true };
    }

    // Editing the text an embedding was built from invalidates that embedding.
    // Marking it pending is what the Phase 5 re-index picks up.
    const textChanged =
      dto.title !== undefined || dto.description !== undefined || dto.category !== undefined;
    if (textChanged) {
      data.embeddingStatus = 'pending';
    }

    if (dto.tags !== undefined) {
      const tags = await this.tags.resolveNames(ownerId, dto.tags);
      // Replace rather than merge: PATCH with a `tags` array is a declaration of
      // the full set, which is the only behaviour a frontend tag editor can use.
      await this.prisma.assetTag.deleteMany({ where: { assetId: id } });
      if (tags.length > 0) {
        await this.prisma.assetTag.createMany({
          data: tags.map((tag) => ({ assetId: id, tagId: tag.id })),
          skipDuplicates: true,
        });
      }
      data.embeddingStatus = 'pending';
    }

    const updated = await this.prisma.asset.update({
      where: { id: existing.id },
      data,
      include: RELATIONS,
    });
    return AssetResponseDto.from(updated);
  }

  /**
   * Soft delete. The row and its stored file are both kept — assets are never
   * hard-deleted, per the product requirement — so this is reversible via
   * `restore`.
   */
  async softDelete(ownerId: string, id: string): Promise<AssetResponseDto> {
    const existing = await this.findOwnedOrThrow(ownerId, id);
    if (existing.deletedAt) {
      return AssetResponseDto.from(existing);
    }

    const deleted = await this.prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: RELATIONS,
    });

    // Trashed assets stop counting against the quota, but the bytes remain on
    // disk so a restore is a metadata-only operation.
    if (existing.fileSizeMB) {
      await this.users.addStorageUsage(ownerId, -existing.fileSizeMB);
    }
    return AssetResponseDto.from(deleted);
  }

  async restore(ownerId: string, id: string): Promise<AssetResponseDto> {
    const existing = await this.findOwnedOrThrow(ownerId, id);
    if (!existing.deletedAt) {
      return AssetResponseDto.from(existing);
    }

    if (existing.fileSizeMB && (await this.users.wouldExceedQuota(ownerId, existing.fileSizeMB))) {
      throw new PayloadTooLargeException(
        'Restoring this asset would exceed your storage quota. Free some space first.',
      );
    }

    const restored = await this.prisma.asset.update({
      where: { id },
      data: { deletedAt: null },
      include: RELATIONS,
    });
    if (existing.fileSizeMB) {
      await this.users.addStorageUsage(ownerId, existing.fileSizeMB);
    }
    return AssetResponseDto.from(restored);
  }

  // =========================================================================
  // Internals
  // =========================================================================

  private buildWhere(ownerId: string, query: ListAssetsQueryDto): Prisma.AssetWhereInput {
    return {
      ownerId,
      deletedAt: query.deleted ? { not: null } : null,
      ...(query.type?.length ? { type: { in: query.type } } : {}),
      ...(query.sourceType?.length ? { sourceType: { in: query.sourceType } } : {}),
      ...(query.licenseType?.length ? { licenseType: { in: query.licenseType } } : {}),
      ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}),
      ...(query.sourcePlatform
        ? { sourcePlatform: { equals: query.sourcePlatform, mode: 'insensitive' } }
        : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.section ? { section: { equals: query.section, mode: 'insensitive' } } : {}),
      // Every listed slug must be present, so `AND` of one relation filter each
      // rather than a single `in`, which would be an OR.
      ...(query.tags?.length
        ? { AND: query.tags.map((slug) => ({ tags: { some: { tag: { slug } } } })) }
        : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
              { category: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private async assertProjectOwnership(ownerId: string, projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true, deletedAt: true },
    });
    if (!project || project.ownerId !== ownerId || project.deletedAt) {
      throw new BadRequestException('That project does not exist.');
    }
  }

  private titleFromFilename(fileName: string): string {
    const withoutExtension = fileName.replace(/\.[^./\\]+$/, '');
    const base = withoutExtension.split(/[\\/]/).pop() ?? withoutExtension;
    return (base.replace(/[_-]+/g, ' ').trim() || fileName).slice(0, 300);
  }

  /**
   * Expands any .zip in the batch into its entries, which is how a folder
   * import is delivered. Non-archives pass through untouched.
   *
   * `adm-zip` is imported lazily so that the dependency is only loaded by the
   * requests that actually need it.
   */
  private async expandArchives(files: UploadedFile[]): Promise<UploadedFile[]> {
    const { default: AdmZip } = await import('adm-zip');
    const maxBytes = this.config.get<number>('storage.maxUploadSizeMB', 100) * 1024 * 1024;
    const output: UploadedFile[] = [];

    for (const file of files) {
      const isZip =
        file.mimetype.includes('zip') || file.originalname.toLowerCase().endsWith('.zip');
      if (!isZip) {
        output.push(file);
        continue;
      }

      let entries: ReturnType<InstanceType<typeof AdmZip>['getEntries']>;
      try {
        entries = new AdmZip(file.buffer).getEntries();
      } catch {
        throw new BadRequestException(`${file.originalname} is not a readable zip archive.`);
      }

      for (const entry of entries) {
        // Skip directories, macOS resource forks, and any entry whose path tries
        // to escape the archive root.
        if (
          entry.isDirectory ||
          entry.entryName.startsWith('__MACOSX/') ||
          entry.entryName.split('/').pop()?.startsWith('.') ||
          entry.entryName.includes('..')
        ) {
          continue;
        }
        const buffer = entry.getData();
        if (buffer.byteLength > maxBytes) {
          this.logger.warn(`Skipping ${entry.entryName}: larger than the per-file limit`);
          continue;
        }
        output.push({
          originalname: entry.entryName,
          mimetype: 'application/octet-stream',
          size: buffer.byteLength,
          buffer,
        });
      }
    }

    if (output.length === 0) {
      throw new BadRequestException('The archive contained no importable files.');
    }
    return output;
  }
}
