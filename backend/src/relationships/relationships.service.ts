import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RelationType } from '@prisma/client';
import { paginate, type PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  ASSET_SUMMARY_SELECT,
  RelationshipResponseDto,
  summariseAsset,
  type AssetConnectionDto,
  type CreateRelationshipDto,
  type ListRelationshipsQueryDto,
  type RelationshipRow,
  type UpdateRelationshipDto,
} from './dto/relationship.dto';

const EDGE_RELATIONS = {
  sourceAsset: { select: ASSET_SUMMARY_SELECT },
  targetAsset: { select: ASSET_SUMMARY_SELECT },
} as const;

/**
 * The asset relationship graph.
 *
 * Edges live in one table with a nullable target for each node kind, rather than
 * a rigid foreign key per relationship. That is what makes new relation types an
 * additive enum value, and a new node kind one nullable column, instead of a
 * migration that restructures existing data.
 */
@Injectable()
export class RelationshipsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateRelationshipDto): Promise<RelationshipResponseDto> {
    const relationType = dto.relationType ?? RelationType.related_to;

    // Exactly one target. The schema allows both columns to be null, so this is
    // the invariant the API enforces on top of it.
    if (Boolean(dto.targetAssetId) === Boolean(dto.targetProjectId)) {
      throw new BadRequestException('Send exactly one of targetAssetId or targetProjectId.');
    }
    if (dto.targetAssetId && dto.targetAssetId === dto.sourceAssetId) {
      throw new BadRequestException('An asset cannot be related to itself.');
    }

    await this.assertAssetOwned(ownerId, dto.sourceAssetId, 'sourceAssetId');
    if (dto.targetAssetId) {
      await this.assertAssetOwned(ownerId, dto.targetAssetId, 'targetAssetId');
    }
    if (dto.targetProjectId) {
      await this.assertProjectOwned(ownerId, dto.targetProjectId);
    }

    // Postgres treats NULLs as distinct in a unique index, so the
    // (source, target, type) constraint does not cover project-targeted edges.
    // They are checked here instead, so both kinds behave the same way.
    if (dto.targetProjectId) {
      const duplicate = await this.prisma.assetRelationship.findFirst({
        where: {
          sourceAssetId: dto.sourceAssetId,
          targetProjectId: dto.targetProjectId,
          relationType,
        },
      });
      if (duplicate) {
        throw new ConflictException('That relationship already exists.');
      }
    }

    const edge = await this.prisma.assetRelationship.create({
      data: {
        ownerId,
        sourceAssetId: dto.sourceAssetId,
        targetAssetId: dto.targetAssetId ?? null,
        targetProjectId: dto.targetProjectId ?? null,
        relationType,
        reason: dto.reason ?? null,
      },
      include: EDGE_RELATIONS,
    });
    return RelationshipResponseDto.from(edge);
  }

  async list(
    ownerId: string,
    query: ListRelationshipsQueryDto,
  ): Promise<PaginatedResponseDto<RelationshipResponseDto>> {
    const where: Prisma.AssetRelationshipWhereInput = {
      ownerId,
      ...(query.relationType ? { relationType: query.relationType } : {}),
      ...(query.projectId ? { targetProjectId: query.projectId } : {}),
      // An asset's edges run in both directions, so a bare equality filter here
      // would silently hide half of them.
      ...(query.assetId
        ? { OR: [{ sourceAssetId: query.assetId }, { targetAssetId: query.assetId }] }
        : {}),
      ...(query.q ? { reason: { contains: query.q, mode: 'insensitive' } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.assetRelationship.findMany({
        where,
        include: EDGE_RELATIONS,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.assetRelationship.count({ where }),
    ]);

    return paginate(rows.map(RelationshipResponseDto.from), total, query.page, query.limit);
  }

  async findOne(ownerId: string, id: string): Promise<RelationshipResponseDto> {
    return RelationshipResponseDto.from(await this.findOwnedOrThrow(ownerId, id));
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateRelationshipDto,
  ): Promise<RelationshipResponseDto> {
    await this.findOwnedOrThrow(ownerId, id);

    const data: Prisma.AssetRelationshipUpdateInput = {};
    if (dto.relationType !== undefined) data.relationType = dto.relationType;
    if (dto.reason !== undefined) data.reason = dto.reason;

    const updated = await this.prisma.assetRelationship.update({
      where: { id },
      data,
      include: EDGE_RELATIONS,
    });
    return RelationshipResponseDto.from(updated);
  }

  /**
   * Hard delete. An edge is a statement about two assets, not content of its
   * own — there is nothing to recover, and neither endpoint is touched.
   */
  async remove(ownerId: string, id: string): Promise<{ id: string }> {
    await this.findOwnedOrThrow(ownerId, id);
    await this.prisma.assetRelationship.delete({ where: { id } });
    return { id };
  }

  /**
   * Everything connected to one asset, in both directions, flattened so each
   * entry describes the *other* end plus why it is connected.
   *
   * Edges are directed and are never mirrored on write: storing "A used_in B"
   * does not create "B used_in A", because the two mean different things.
   * Reading, though, has to show both — an asset used by five others is exactly
   * what a user wants to see on that asset's page — so incoming edges are
   * returned alongside outgoing ones, labelled by `direction`.
   */
  async listForAsset(
    ownerId: string,
    assetId: string,
    relationType?: RelationType,
  ): Promise<AssetConnectionDto[]> {
    await this.assertAssetOwned(ownerId, assetId, 'id');

    const edges = await this.prisma.assetRelationship.findMany({
      where: {
        ownerId,
        ...(relationType ? { relationType } : {}),
        OR: [{ sourceAssetId: assetId }, { targetAssetId: assetId }],
      },
      include: EDGE_RELATIONS,
      orderBy: { createdAt: 'desc' },
    });

    const projectIds = edges
      .map((edge) => edge.targetProjectId)
      .filter((id): id is string => Boolean(id));

    const projects = projectIds.length
      ? await this.prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, name: true },
        })
      : [];

    return edges.map((edge) => {
      const outgoing = edge.sourceAssetId === assetId;
      return {
        relationshipId: edge.id,
        relationType: edge.relationType,
        direction: outgoing ? ('outgoing' as const) : ('incoming' as const),
        reason: edge.reason,
        asset: summariseAsset(outgoing ? edge.targetAsset : edge.sourceAsset),
        project: outgoing
          ? (projects.find((project) => project.id === edge.targetProjectId) ?? null)
          : null,
        createdAt: edge.createdAt,
      };
    });
  }

  // =========================================================================

  private async findOwnedOrThrow(ownerId: string, id: string): Promise<RelationshipRow> {
    const edge = await this.prisma.assetRelationship.findUnique({
      where: { id },
      include: EDGE_RELATIONS,
    });
    if (!edge || edge.ownerId !== ownerId) {
      throw new NotFoundException('Relationship not found.');
    }
    return edge;
  }

  private async assertAssetOwned(ownerId: string, assetId: string, field: string): Promise<void> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: { ownerId: true, deletedAt: true },
    });
    if (!asset || asset.ownerId !== ownerId || asset.deletedAt) {
      throw new NotFoundException(`No such asset for ${field}.`);
    }
  }

  private async assertProjectOwned(ownerId: string, projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true, deletedAt: true },
    });
    if (!project || project.ownerId !== ownerId || project.deletedAt) {
      throw new NotFoundException('No such project for targetProjectId.');
    }
  }
}
