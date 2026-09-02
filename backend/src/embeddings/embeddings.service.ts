import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { EmbeddingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EMBEDDING_PROVIDER, type EmbeddingProvider } from './embedding-provider.interface';
import { toVectorLiteral } from './vector.util';

/** The asset fields an embedding is built from. */
export interface EmbeddableAsset {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  type?: string | null;
  sourcePlatform?: string | null;
  tagNames?: string[];
}

/**
 * Owns everything to do with the `assets.embedding` column.
 *
 * All vector reads and writes go through raw SQL here, on purpose: Prisma cannot
 * touch an `Unsupported` column through the generated client, and routing the
 * similarity query by hand is also what lets it use the HNSW index.
 *
 * **Indexing happens once, at write time, in the background.** Search never
 * calls an embedding provider for stored assets — only for the query text — so
 * the search path stays fast and, on a paid provider, cheap.
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(EMBEDDING_PROVIDER)
    private readonly provider?: EmbeddingProvider,
  ) {}

  get driver(): string {
    return this.provider?.driver ?? 'none';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }
    try {
      return await this.provider.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * The text an asset is indexed on.
   *
   * Title first and repeated once: it is by far the strongest signal of what an
   * asset is, and with a bag-of-terms provider the repetition is what gives it
   * extra weight. Tags matter next, because they are vocabulary the user chose
   * deliberately.
   */
  buildIndexText(asset: EmbeddableAsset): string {
    return [
      asset.title,
      asset.title,
      asset.tagNames?.join(' '),
      asset.category,
      asset.type,
      asset.sourcePlatform,
      asset.description?.slice(0, 2000),
    ]
      .filter(Boolean)
      .join(' \n ')
      .trim();
  }

  /**
   * Embeds one asset and stores the vector.
   *
   * Never throws: this runs on the asset-creation path, and a provider outage
   * must not fail an upload the user has already completed. A failure marks the
   * row `failed`, which `backfill()` later picks up.
   */
  async indexAsset(asset: EmbeddableAsset): Promise<boolean> {
    if (!this.provider) {
      await this.markStatus(asset.id, EmbeddingStatus.skipped);
      return false;
    }

    try {
      const text = this.buildIndexText(asset);
      if (!text) {
        await this.markStatus(asset.id, EmbeddingStatus.skipped);
        return false;
      }

      const { vector, model } = await this.provider.embed(text);
      await this.storeVector(asset.id, vector, model);
      return true;
    } catch (error) {
      this.logger.warn(`Embedding failed for asset ${asset.id}: ${(error as Error).message}`);
      await this.markStatus(asset.id, EmbeddingStatus.failed);
      return false;
    }
  }

  /**
   * Fire-and-forget indexing, used by the asset-creation path.
   *
   * The user's request returns as soon as the asset row exists; the vector
   * arrives a moment later. This is the "AI works in the background, search stays
   * fast" split — the response never waits on an embedding call.
   */
  scheduleIndexing(asset: EmbeddableAsset): void {
    void this.indexAsset(asset).catch((error) => {
      this.logger.error(`Background indexing crashed for ${asset.id}: ${error}`);
    });
  }

  /** Embeds a search query. Returns null when no provider is usable. */
  async embedQuery(text: string): Promise<number[] | null> {
    if (!this.provider || !text.trim()) {
      return null;
    }
    try {
      if (!(await this.provider.isAvailable())) {
        return null;
      }
      return (await this.provider.embed(text)).vector;
    } catch (error) {
      this.logger.warn(`Query embedding failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Indexes assets still waiting for a vector.
   *
   * Needed because an asset created while the provider was down, or before one
   * was configured, is otherwise invisible to semantic search for good. Also the
   * migration path after switching `EMBEDDING_DRIVER`.
   */
  async backfill(
    ownerId: string | null,
    limit = 100,
  ): Promise<{ processed: number; indexed: number; failed: number }> {
    const pending = await this.prisma.asset.findMany({
      where: {
        deletedAt: null,
        ...(ownerId ? { ownerId } : {}),
        embeddingStatus: { in: [EmbeddingStatus.pending, EmbeddingStatus.failed] },
      },
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    let indexed = 0;
    for (const asset of pending) {
      const ok = await this.indexAsset({
        id: asset.id,
        title: asset.title,
        description: asset.description,
        category: asset.category,
        type: asset.type,
        sourcePlatform: asset.sourcePlatform,
        tagNames: asset.tags.map(({ tag }) => tag.name),
      });
      if (ok) {
        indexed += 1;
      }
    }

    return { processed: pending.length, indexed, failed: pending.length - indexed };
  }

  async countPending(ownerId: string): Promise<number> {
    return this.prisma.asset.count({
      where: {
        ownerId,
        deletedAt: null,
        embeddingStatus: { in: [EmbeddingStatus.pending, EmbeddingStatus.failed] },
      },
    });
  }

  // =========================================================================
  // Raw vector access
  // =========================================================================

  private async storeVector(assetId: string, vector: number[], model: string): Promise<void> {
    // Parameterised rather than interpolated even though the literal is built
    // from numbers we produced: this is the one place raw SQL touches user data.
    await this.prisma.$executeRaw`
      UPDATE assets
      SET embedding = ${toVectorLiteral(vector)}::vector,
          "embeddingStatus" = 'ready'::"EmbeddingStatus",
          "embeddingModel" = ${model},
          "embeddedAt" = NOW()
      WHERE id = ${assetId}::uuid
    `;
  }

  private async markStatus(assetId: string, status: EmbeddingStatus): Promise<void> {
    await this.prisma.asset.update({ where: { id: assetId }, data: { embeddingStatus: status } });
  }

  /**
   * Nearest neighbours to a vector, ranked by cosine similarity.
   *
   * `<=>` is pgvector's cosine distance operator and is the one the HNSW index
   * in `prisma/sql/vector-index.sql` was built for; similarity is `1 - distance`.
   * Ordering by the operator expression — not by a computed alias — is what
   * keeps the query index-backed rather than a sequential scan.
   */
  async findNearest(options: {
    ownerId: string;
    vector: number[];
    limit: number;
    minSimilarity?: number;
    excludeAssetId?: string;
  }): Promise<Array<{ id: string; similarity: number }>> {
    const literal = toVectorLiteral(options.vector);
    const minSimilarity = options.minSimilarity ?? 0;
    const exclude = options.excludeAssetId
      ? Prisma.sql`AND id <> ${options.excludeAssetId}::uuid`
      : Prisma.empty;

    return this.prisma.$queryRaw<Array<{ id: string; similarity: number }>>`
      SELECT id, 1 - (embedding <=> ${literal}::vector) AS similarity
      FROM assets
      WHERE "ownerId" = ${options.ownerId}::uuid
        AND "deletedAt" IS NULL
        AND embedding IS NOT NULL
        ${exclude}
        AND 1 - (embedding <=> ${literal}::vector) >= ${minSimilarity}
      ORDER BY embedding <=> ${literal}::vector
      LIMIT ${options.limit}
    `;
  }

  /** The stored vector for one asset, or null when it has not been indexed. */
  async getVector(assetId: string): Promise<number[] | null> {
    const rows = await this.prisma.$queryRaw<Array<{ embedding: string | null }>>`
      SELECT embedding::text AS embedding FROM assets WHERE id = ${assetId}::uuid
    `;
    const raw = rows[0]?.embedding;
    if (!raw) {
      return null;
    }
    return raw
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map(Number);
  }
}
