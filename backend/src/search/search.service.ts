import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AssetsService } from '../assets/assets.service';
import { AssetResponseDto, type AssetWithRelations } from '../assets/dto/asset-response.dto';
import { paginate, type PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { similarityToScore } from '../embeddings/vector.util';
import { PrismaService } from '../prisma/prisma.service';
import type {
  KeywordSearchQueryDto,
  ScoredAssetDto,
  SemanticSearchDto,
  SemanticSearchResponseDto,
  SimilarAssetsQueryDto,
} from './dto/search.dto';

const RELATIONS = {
  tags: { include: { tag: true } },
  project: { select: { id: true, name: true } },
} as const;

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
    private readonly assets: AssetsService,
  ) {}

  // =========================================================================
  // Keyword search — the fast path, and the default
  // =========================================================================

  /**
   * Plain keyword search over title, description, category, platform and tag
   * names.
   *
   * **No embedding provider is called here at all.** Most queries a user types
   * are a word they know is in the asset, and answering those with a database
   * query keeps search instant and free. The trigram indexes in
   * `prisma/sql/vector-index.sql` are what stop the leading-wildcard `ILIKE`
   * from degrading into a sequential scan as the table grows.
   */
  async keywordSearch(
    ownerId: string,
    query: KeywordSearchQueryDto,
  ): Promise<PaginatedResponseDto<AssetResponseDto>> {
    const where = this.keywordWhere(ownerId, query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        include: RELATIONS,
        // Relevance ordering is deliberately left to the caller-visible sort:
        // ILIKE gives no usable rank, and inventing one would be less honest
        // than "newest first". Use /search/semantic when relevance matters.
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return paginate(rows.map(AssetResponseDto.from), total, query.page, query.limit);
  }

  private keywordWhere(ownerId: string, query: KeywordSearchQueryDto): Prisma.AssetWhereInput {
    const term = query.q;
    return {
      ownerId,
      deletedAt: null,
      ...(query.type?.length ? { type: { in: query.type } } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.tags?.length
        ? { AND: query.tags.map((slug) => ({ tags: { some: { tag: { slug } } } })) }
        : {}),
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { sourcePlatform: { contains: term, mode: 'insensitive' } },
        { tags: { some: { tag: { name: { contains: term, mode: 'insensitive' } } } } },
      ],
    };
  }

  // =========================================================================
  // Semantic search
  // =========================================================================

  /**
   * Meaning-based search over the stored embeddings.
   *
   * **Falls back to keyword search rather than failing.** No provider
   * configured, a provider outage, a database without pgvector, or a vault whose
   * assets have not been indexed yet all produce keyword results with
   * `strategy: "keyword"` and a `fallbackReason`, because an empty result set
   * would read to the user as "you own nothing like this", which is a different
   * and wrong statement.
   *
   * Only the *query* is embedded here. Stored assets were embedded once at
   * creation time.
   */
  async semanticSearch(
    ownerId: string,
    dto: SemanticSearchDto,
  ): Promise<SemanticSearchResponseDto> {
    const limit = dto.limit ?? 20;

    const fallback = async (reason: string): Promise<SemanticSearchResponseDto> => {
      this.logger.debug(`Semantic search fell back to keyword: ${reason}`);
      const results = await this.keywordSearch(ownerId, {
        q: dto.q,
        page: 1,
        limit,
        skip: 0,
        sortOrder: 'desc',
        sortBy: 'createdAt',
        type: dto.type,
        projectId: dto.projectId,
      } as KeywordSearchQueryDto);

      return {
        data: results.data.map((asset) => ({ asset, score: 0, scoreLabel: '—' })),
        strategy: 'keyword',
        fallbackReason: reason,
        total: results.data.length,
      };
    };

    if (!(await this.prisma.hasVectorExtension())) {
      return fallback('The pgvector extension is not installed on this database.');
    }
    if (!(await this.embeddings.isAvailable())) {
      return fallback('No embedding provider is configured.');
    }

    const vector = await this.embeddings.embedQuery(dto.q);
    if (!vector) {
      return fallback('The embedding provider could not be reached.');
    }

    // Over-fetch, because the type/project filters are applied after the vector
    // search — a strict LIMIT here could return nothing after filtering.
    const neighbours = await this.embeddings.findNearest({
      ownerId,
      vector,
      limit: dto.type?.length || dto.projectId ? limit * 5 : limit,
      minSimilarity: dto.minSimilarity ?? 0.15,
    });

    if (neighbours.length === 0) {
      const pending = await this.embeddings.countPending(ownerId);
      if (pending > 0) {
        return fallback(
          `${pending} asset(s) are still waiting to be indexed. Run POST /search/reindex.`,
        );
      }
      return { data: [], strategy: 'semantic', fallbackReason: null, total: 0 };
    }

    const scored = await this.hydrate(ownerId, neighbours, {
      type: dto.type,
      projectId: dto.projectId,
    });
    const data = scored.slice(0, limit);

    return { data, strategy: 'semantic', fallbackReason: null, total: data.length };
  }

  // =========================================================================
  // Similarity
  // =========================================================================

  /**
   * Assets similar to a given one, by stored-vector cosine similarity.
   *
   * Uses the asset's own stored embedding rather than re-embedding its text — it
   * is already there, and reusing it means this endpoint makes no provider call
   * whatsoever.
   */
  async findSimilar(
    ownerId: string,
    assetId: string,
    query: SimilarAssetsQueryDto,
  ): Promise<{ data: ScoredAssetDto[]; total: number; reason: string | null }> {
    // Ownership check first, so an id belonging to someone else 404s before any
    // vector work happens.
    const asset = await this.assets.findOwnedOrThrow(ownerId, assetId, { includeDeleted: false });

    if (!(await this.prisma.hasVectorExtension())) {
      return { data: [], total: 0, reason: 'The pgvector extension is not installed.' };
    }

    const vector = await this.embeddings.getVector(assetId);
    if (!vector) {
      return {
        data: [],
        total: 0,
        reason:
          asset.embeddingStatus === 'pending'
            ? 'This asset has not been indexed yet. Try again shortly, or run POST /search/reindex.'
            : `This asset has no embedding (status: ${asset.embeddingStatus}).`,
      };
    }

    const neighbours = await this.embeddings.findNearest({
      ownerId,
      vector,
      limit: query.limit ?? 10,
      minSimilarity: query.minSimilarity ?? 0.3,
      excludeAssetId: assetId,
    });

    const data = await this.hydrate(ownerId, neighbours, {});
    return { data, total: data.length, reason: null };
  }

  // =========================================================================

  /**
   * Turns `(id, similarity)` rows into full assets, preserving the vector
   * ranking — a second query returns rows in arbitrary order, so the scores map
   * the results back into place.
   */
  private async hydrate(
    ownerId: string,
    neighbours: Array<{ id: string; similarity: number }>,
    filters: { type?: string[]; projectId?: string },
  ): Promise<ScoredAssetDto[]> {
    if (neighbours.length === 0) {
      return [];
    }

    const rows = await this.prisma.asset.findMany({
      where: {
        id: { in: neighbours.map((neighbour) => neighbour.id) },
        ownerId,
        deletedAt: null,
        ...(filters.type?.length ? { type: { in: filters.type as never[] } } : {}),
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
      },
      include: RELATIONS,
    });

    const byId = new Map<string, AssetWithRelations>(rows.map((row) => [row.id, row]));

    return neighbours.flatMap((neighbour) => {
      const row = byId.get(neighbour.id);
      if (!row) {
        return [];
      }
      const score = similarityToScore(neighbour.similarity);
      return [
        {
          asset: AssetResponseDto.from(row),
          score,
          scoreLabel: `${Math.round(score * 100)}% similar`,
        },
      ];
    });
  }
}
