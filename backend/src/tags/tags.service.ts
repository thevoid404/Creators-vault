import { Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, type Tag } from '@prisma/client';
import { paginate, type PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import {
  EMBEDDING_PROVIDER,
  type EmbeddingProvider,
} from '../embeddings/embedding-provider.interface';
import { cosineSimilarity, similarityToScore } from '../embeddings/vector.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  TagResponseDto,
  type CreateTagDto,
  type ListTagsQueryDto,
  type SuggestTagsDto,
  type TagSuggestionDto,
  type TagWithCount,
  type UpdateTagDto,
} from './dto/tag.dto';
import { extractKeywords } from './keyword.util';
import { slugifyTag } from './tag-slug.util';

/** Usage counts must exclude trashed assets, so every count goes through this filter. */
const LIVE_USAGE_COUNT = {
  _count: { select: { assets: { where: { asset: { deletedAt: null } } } } },
} as const;

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(
    private readonly prisma: PrismaService,
    // Optional by design. Tag suggestion must work with no embedding provider
    // configured — see `suggest()`.
    @Optional()
    @Inject(EMBEDDING_PROVIDER)
    private readonly embeddings?: EmbeddingProvider,
  ) {}

  // =========================================================================
  // Used by the assets module since Phase 2
  // =========================================================================

  /**
   * Turns free-text tag names into `Tag` rows for one owner, creating whatever
   * does not exist yet.
   *
   * Tags are per-owner, so this can never hand back another user's tag. Names
   * that slug to the same value collapse into one row — `createMany` with
   * `skipDuplicates` handles the race where two concurrent asset creations
   * introduce the same new tag.
   */
  async resolveNames(ownerId: string, names: string[]): Promise<Tag[]> {
    const bySlug = new Map<string, string>();
    for (const name of names) {
      const slug = slugifyTag(name);
      if (slug && !bySlug.has(slug)) {
        bySlug.set(slug, name.trim().slice(0, 60));
      }
    }
    if (bySlug.size === 0) {
      return [];
    }

    const slugs = [...bySlug.keys()];

    const existing = await this.prisma.tag.findMany({ where: { ownerId, slug: { in: slugs } } });
    const missing = slugs.filter((slug) => !existing.some((tag) => tag.slug === slug));

    if (missing.length > 0) {
      await this.prisma.tag.createMany({
        data: missing.map((slug) => ({ ownerId, slug, name: bySlug.get(slug) ?? slug })),
        skipDuplicates: true,
      });
    }

    return this.prisma.tag.findMany({ where: { ownerId, slug: { in: slugs } } });
  }

  // =========================================================================
  // CRUD
  // =========================================================================

  async create(ownerId: string, dto: CreateTagDto): Promise<TagResponseDto> {
    const slug = slugifyTag(dto.name);
    if (!slug) {
      throw new NotFoundException('That tag name contains no usable characters.');
    }

    // Upsert rather than create: a duplicate name is a no-op that returns the
    // existing tag. A 409 here would be a pointless obstacle, since the user's
    // intent ("I want this tag to exist") is already satisfied.
    const tag = await this.prisma.tag.upsert({
      where: { ownerId_slug: { ownerId, slug } },
      create: { ownerId, slug, name: dto.name, color: dto.color ?? null },
      update: dto.color ? { color: dto.color } : {},
      include: LIVE_USAGE_COUNT,
    });
    return TagResponseDto.from(tag);
  }

  async list(
    ownerId: string,
    query: ListTagsQueryDto,
  ): Promise<PaginatedResponseDto<TagResponseDto>> {
    const where: Prisma.TagWhereInput = {
      ownerId,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { slug: { contains: slugifyTag(query.q) } },
            ],
          }
        : {}),
      ...(query.usedOnly ? { assets: { some: { asset: { deletedAt: null } } } } : {}),
    };

    // `usageCount` is an aggregate, not a column, so Prisma cannot order by it
    // directly. It is ordered by the relation count instead, which compiles to
    // the same thing.
    const orderBy: Prisma.TagOrderByWithRelationInput =
      query.sortBy === 'usageCount'
        ? { assets: { _count: query.sortOrder } }
        : { [query.sortBy]: query.sortOrder };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.tag.findMany({
        where,
        include: LIVE_USAGE_COUNT,
        orderBy,
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.tag.count({ where }),
    ]);

    return paginate(rows.map(TagResponseDto.from), total, query.page, query.limit);
  }

  async findOne(ownerId: string, id: string): Promise<TagResponseDto> {
    return TagResponseDto.from(await this.findOwnedOrThrow(ownerId, id));
  }

  async update(ownerId: string, id: string, dto: UpdateTagDto): Promise<TagResponseDto> {
    await this.findOwnedOrThrow(ownerId, id);

    const data: Prisma.TagUpdateInput = {};
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.name !== undefined) {
      data.name = dto.name;
      // The slug follows the name, so renaming "Dark Mode" to "Night Mode"
      // changes what clients filter by. The unique constraint on (ownerId, slug)
      // surfaces a collision as a 409 through the exception filter.
      data.slug = slugifyTag(dto.name);
    }

    const updated = await this.prisma.tag.update({
      where: { id },
      data,
      include: LIVE_USAGE_COUNT,
    });
    return TagResponseDto.from(updated);
  }

  /**
   * Hard delete, unlike assets and projects.
   *
   * A tag carries no content of its own — removing it detaches it from assets
   * (via the cascade on `asset_tags`) and loses nothing. A soft-deleted tag would
   * only mean a name that stays unusable while being invisible.
   */
  async remove(ownerId: string, id: string): Promise<{ id: string; detachedAssets: number }> {
    await this.findOwnedOrThrow(ownerId, id);
    const detachedAssets = await this.prisma.assetTag.count({ where: { tagId: id } });
    await this.prisma.tag.delete({ where: { id } });
    return { id, detachedAssets };
  }

  async findOwnedOrThrow(ownerId: string, id: string): Promise<TagWithCount> {
    const tag = await this.prisma.tag.findUnique({ where: { id }, include: LIVE_USAGE_COUNT });
    if (!tag || tag.ownerId !== ownerId) {
      throw new NotFoundException('Tag not found.');
    }
    return tag;
  }

  // =========================================================================
  // Auto-suggest
  // =========================================================================

  /**
   * Suggests tags for an asset, or for text typed before an asset exists.
   *
   * Three signals, blended and returned highest-first:
   *
   *  1. **existing-tag** — a keyword matches a tag this user already has. The
   *     strongest signal by far: it is a vocabulary the user chose themselves.
   *  2. **co-occurrence** — tags that already appear on this user's other assets
   *     in the same category or of the same type.
   *  3. **keyword** — a salient term that is not yet a tag, offered as a new one.
   *
   * When an `EmbeddingProvider` is bound (Phase 5), an extra semantic pass
   * re-ranks the existing-tag candidates by cosine similarity to the source
   * text, which catches tags that share no literal word with it. With no provider
   * bound, that pass is skipped and the three signals above still stand on their
   * own — this endpoint has no hard dependency on AI being configured.
   */
  async suggest(ownerId: string, dto: SuggestTagsDto): Promise<TagSuggestionDto[]> {
    const source = await this.resolveSuggestionSource(ownerId, dto);
    const excluded = new Set(
      [...(dto.exclude ?? []), ...source.existingSlugs].map(slugifyTag).filter(Boolean),
    );

    const keywords = extractKeywords([
      { text: source.title, weight: 1 },
      { text: source.category, weight: 0.9 },
      { text: source.description, weight: 0.5 },
    ]);

    const ownedTags = await this.prisma.tag.findMany({
      where: { ownerId },
      include: LIVE_USAGE_COUNT,
    });
    const bySlug = new Map(ownedTags.map((tag) => [tag.slug, tag]));

    /** slug -> best candidate seen so far */
    const candidates = new Map<string, TagSuggestionDto>();
    const offer = (candidate: TagSuggestionDto) => {
      if (excluded.has(candidate.slug) || !candidate.slug) {
        return;
      }
      const current = candidates.get(candidate.slug);
      if (!current || candidate.score > current.score) {
        candidates.set(candidate.slug, candidate);
      }
    };

    // --- 1. keywords that match tags this user already uses -----------------
    const maxWeight = keywords[0]?.weight ?? 1;
    for (const keyword of keywords) {
      const slug = slugifyTag(keyword.term);
      const normalized = maxWeight > 0 ? keyword.weight / maxWeight : 0;
      const exact = bySlug.get(slug);

      if (exact) {
        offer({
          name: exact.name,
          slug: exact.slug,
          score: similarityToScore(0.7 + 0.3 * normalized),
          reason: 'existing-tag',
          exists: true,
        });
        continue;
      }

      // A partial match, e.g. the keyword "dashboard ui" against a "dashboard"
      // tag. Scored below an exact match but above a brand-new term.
      const partial = ownedTags.find((tag) => slug.includes(tag.slug) || tag.slug.includes(slug));
      if (partial) {
        offer({
          name: partial.name,
          slug: partial.slug,
          score: similarityToScore(0.45 + 0.25 * normalized),
          reason: 'existing-tag',
          exists: true,
        });
      }

      // --- 3. brand-new terms ----------------------------------------------
      offer({
        name: keyword.term,
        slug,
        score: similarityToScore(0.2 + 0.25 * normalized),
        reason: 'keyword',
        exists: false,
      });
    }

    // --- 2. co-occurrence ---------------------------------------------------
    for (const tag of await this.coOccurringTags(ownerId, source)) {
      offer({
        name: tag.name,
        slug: tag.slug,
        score: similarityToScore(0.3 + 0.3 * tag.frequency),
        reason: 'co-occurrence',
        exists: true,
      });
    }

    // --- semantic pass, only when a provider is configured -------------------
    await this.applySemanticRanking(source, candidates);

    return [...candidates.values()]
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, dto.limit ?? 8);
  }

  /** Text to suggest from — either a stored asset's, or what the caller typed. */
  private async resolveSuggestionSource(
    ownerId: string,
    dto: SuggestTagsDto,
  ): Promise<{
    title: string | null;
    description: string | null;
    category: string | null;
    type: string | null;
    existingSlugs: string[];
  }> {
    if (!dto.assetId) {
      return {
        title: dto.title ?? null,
        description: dto.description ?? null,
        category: dto.category ?? null,
        type: null,
        existingSlugs: [],
      };
    }

    const asset = await this.prisma.asset.findUnique({
      where: { id: dto.assetId },
      include: { tags: { include: { tag: true } } },
    });
    if (!asset || asset.ownerId !== ownerId) {
      throw new NotFoundException('Asset not found.');
    }

    return {
      // Anything sent explicitly overrides the stored value, so the endpoint
      // still works while a user is editing an asset but has not saved it.
      title: dto.title ?? asset.title,
      description: dto.description ?? asset.description,
      category: dto.category ?? asset.category,
      type: asset.type,
      existingSlugs: asset.tags.map(({ tag }) => tag.slug),
    };
  }

  /**
   * Tags this user already puts on assets of the same category or type, ranked
   * by how often. `frequency` is normalised to 0–1 against the most common one.
   */
  private async coOccurringTags(
    ownerId: string,
    source: { category: string | null; type: string | null },
  ): Promise<Array<{ name: string; slug: string; frequency: number }>> {
    if (!source.category && !source.type) {
      return [];
    }

    const rows = await this.prisma.assetTag.groupBy({
      by: ['tagId'],
      where: {
        asset: {
          ownerId,
          deletedAt: null,
          OR: [
            ...(source.category ? [{ category: source.category }] : []),
            ...(source.type ? [{ type: source.type as never }] : []),
          ],
        },
      },
      _count: { _all: true },
      orderBy: { _count: { tagId: 'desc' } },
      take: 15,
    });
    if (rows.length === 0) {
      return [];
    }

    const tags = await this.prisma.tag.findMany({
      where: { id: { in: rows.map((row) => row.tagId) } },
    });
    const top = rows[0]._count._all || 1;

    return rows.flatMap((row) => {
      const tag = tags.find((candidate) => candidate.id === row.tagId);
      return tag ? [{ name: tag.name, slug: tag.slug, frequency: row._count._all / top }] : [];
    });
  }

  /**
   * Re-ranks existing-tag candidates by embedding similarity to the source text.
   *
   * A no-op unless a provider is bound and reports itself available, which is
   * what keeps `suggest()` working with `EMBEDDING_DRIVER` unset. A failure here
   * is swallowed for the same reason: a degraded suggestion list beats a failed
   * request.
   */
  private async applySemanticRanking(
    source: { title: string | null; description: string | null; category: string | null },
    candidates: Map<string, TagSuggestionDto>,
  ): Promise<void> {
    const existing = [...candidates.values()].filter((candidate) => candidate.exists);
    if (!this.embeddings || existing.length === 0) {
      return;
    }

    const text = [source.title, source.category, source.description].filter(Boolean).join(' ');
    if (!text.trim()) {
      return;
    }

    try {
      if (!(await this.embeddings.isAvailable())) {
        return;
      }

      const [sourceVector, ...tagVectors] = await this.embeddings.embedMany([
        text,
        ...existing.map((candidate) => candidate.name),
      ]);

      existing.forEach((candidate, index) => {
        const similarity = cosineSimilarity(sourceVector.vector, tagVectors[index].vector);
        // Blended, not replaced: the lexical signals above already encode that
        // this is a tag the user chose, which an embedding does not know.
        candidates.set(candidate.slug, {
          ...candidate,
          score: similarityToScore(candidate.score * 0.6 + Math.max(0, similarity) * 0.4),
        });
      });
    } catch (error) {
      this.logger.warn(`Semantic tag ranking skipped: ${(error as Error).message}`);
    }
  }
}
