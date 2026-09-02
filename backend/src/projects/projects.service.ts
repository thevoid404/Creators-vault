import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate, type PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProjectResponseDto,
  type CreateProjectDto,
  type ListProjectsQueryDto,
  type ProjectSectionDto,
  type ProjectWithCount,
  type UpdateProjectDto,
} from './dto/project.dto';

/**
 * `assetCount` must exclude trashed assets, so the count is always taken through
 * this filter rather than a bare `_count: { assets: true }`.
 */
const LIVE_ASSET_COUNT = {
  _count: { select: { assets: { where: { deletedAt: null } } } },
} as const;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateProjectDto): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.create({
      data: {
        ownerId,
        name: dto.name,
        description: dto.description ?? null,
        coverUrl: dto.coverUrl ?? null,
        color: dto.color ?? null,
      },
      include: LIVE_ASSET_COUNT,
    });
    return ProjectResponseDto.from(project);
  }

  async list(
    ownerId: string,
    query: ListProjectsQueryDto,
  ): Promise<PaginatedResponseDto<ProjectResponseDto>> {
    const where: Prisma.ProjectWhereInput = {
      ownerId,
      deletedAt: query.deleted ? { not: null } : null,
      ...(query.includeArchived ? {} : { archivedAt: null }),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        include: LIVE_ASSET_COUNT,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return paginate(rows.map(ProjectResponseDto.from), total, query.page, query.limit);
  }

  async findOne(ownerId: string, id: string): Promise<ProjectResponseDto> {
    return ProjectResponseDto.from(await this.findOwnedOrThrow(ownerId, id));
  }

  async update(ownerId: string, id: string, dto: UpdateProjectDto): Promise<ProjectResponseDto> {
    await this.findOwnedOrThrow(ownerId, id);

    const data: Prisma.ProjectUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.coverUrl !== undefined) data.coverUrl = dto.coverUrl;
    if (dto.color !== undefined) data.color = dto.color;

    const updated = await this.prisma.project.update({
      where: { id },
      data,
      include: LIVE_ASSET_COUNT,
    });
    return ProjectResponseDto.from(updated);
  }

  /**
   * Archiving hides a project from the default listing without touching its
   * assets — the "finished client work" case, distinct from deleting.
   */
  async setArchived(ownerId: string, id: string, archived: boolean): Promise<ProjectResponseDto> {
    await this.findOwnedOrThrow(ownerId, id);
    const updated = await this.prisma.project.update({
      where: { id },
      data: { archivedAt: archived ? new Date() : null },
      include: LIVE_ASSET_COUNT,
    });
    return ProjectResponseDto.from(updated);
  }

  /**
   * Soft delete, matching the assets module.
   *
   * Assets keep their `projectId` rather than being unfiled, so restoring a
   * project restores its contents intact. They stay reachable in `GET /assets`
   * throughout — deleting a project must never look like losing the work in it.
   */
  async softDelete(ownerId: string, id: string): Promise<ProjectResponseDto> {
    const existing = await this.findOwnedOrThrow(ownerId, id);
    if (existing.deletedAt) {
      return ProjectResponseDto.from(existing);
    }
    const deleted = await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: LIVE_ASSET_COUNT,
    });
    return ProjectResponseDto.from(deleted);
  }

  async restore(ownerId: string, id: string): Promise<ProjectResponseDto> {
    await this.findOwnedOrThrow(ownerId, id);
    const restored = await this.prisma.project.update({
      where: { id },
      data: { deletedAt: null },
      include: LIVE_ASSET_COUNT,
    });
    return ProjectResponseDto.from(restored);
  }

  /**
   * The sections in use inside a project, with a count each.
   *
   * Sections are a free-text field on the asset rather than their own table, so
   * this is a `groupBy` over live assets. That keeps a section weightless to
   * create — typing a new one on an asset is all it takes — which is the point
   * of the sub-grouping being a string.
   */
  async listSections(ownerId: string, id: string): Promise<ProjectSectionDto[]> {
    await this.findOwnedOrThrow(ownerId, id);

    const groups = await this.prisma.asset.groupBy({
      by: ['section'],
      where: { ownerId, projectId: id, deletedAt: null },
      _count: { _all: true },
      orderBy: { section: 'asc' },
    });

    return groups.map((group) => ({
      section: group.section,
      assetCount: group._count._all,
    }));
  }

  async findOwnedOrThrow(ownerId: string, id: string): Promise<ProjectWithCount> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: LIVE_ASSET_COUNT,
    });
    // 404 rather than 403 for another user's project, matching the assets module.
    if (!project || project.ownerId !== ownerId) {
      throw new NotFoundException('Project not found.');
    }
    return project;
  }
}
