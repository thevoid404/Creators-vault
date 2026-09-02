import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AssetsService } from '../assets/assets.service';
import { AssetResponseDto } from '../assets/dto/asset-response.dto';
import { ListAssetsQueryDto } from '../assets/dto/list-assets-query.dto';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import {
  CreateProjectDto,
  ListProjectsQueryDto,
  ProjectResponseDto,
  ProjectSectionDto,
  UpdateProjectDto,
} from './dto/project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth('access-token')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly assets: AssetsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a project.' })
  @ApiCreatedResponse({ type: ProjectResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projects.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List the authenticated user’s projects.',
    description:
      'Archived projects are hidden unless `includeArchived=true`. `q` matches name and description.',
  })
  @ApiPaginatedResponse(ProjectResponseDto)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListProjectsQueryDto,
  ): Promise<PaginatedResponseDto<ProjectResponseDto>> {
    return this.projects.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch one project.' })
  @ApiOkResponse({ type: ProjectResponseDto })
  @ApiNotFoundResponse({ description: 'No such project, or it belongs to another user.' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectResponseDto> {
    return this.projects.findOne(user.id, id);
  }

  @Get(':id/assets')
  @ApiOperation({
    summary: 'List the assets in a project.',
    description:
      'Accepts every filter `GET /assets` does — filter by `section` to read one sub-group.',
  })
  @ApiPaginatedResponse(AssetResponseDto)
  async listAssets(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListAssetsQueryDto,
  ): Promise<PaginatedResponseDto<AssetResponseDto>> {
    await this.projects.findOwnedOrThrow(user.id, id);
    // The path parameter is authoritative — a mismatched projectId in the query
    // string would otherwise silently return another project's contents.
    return this.assets.list(user.id, { ...query, projectId: id } as ListAssetsQueryDto);
  }

  @Get(':id/sections')
  @ApiOperation({
    summary: 'The sections in use in a project, with a count each.',
    description:
      'Sections are free text on the asset, so this is derived from the assets rather than stored. A `section` of null groups the unfiled assets.',
  })
  @ApiOkResponse({ type: [ProjectSectionDto] })
  async listSections(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectSectionDto[]> {
    return this.projects.listSections(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project. Only the fields you send change.' })
  @ApiOkResponse({ type: ProjectResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projects.update(user.id, id, dto);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Archive a project.',
    description: 'Hides it from the default listing. Its assets are untouched.',
  })
  @ApiOkResponse({ type: ProjectResponseDto })
  async archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectResponseDto> {
    return this.projects.setArchived(user.id, id, true);
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bring an archived project back into the default listing.' })
  @ApiOkResponse({ type: ProjectResponseDto })
  async unarchive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectResponseDto> {
    return this.projects.setArchived(user.id, id, false);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Move a project to the trash.',
    description:
      'A soft delete. Its assets keep their projectId and stay listed in GET /assets, so nothing looks lost. Reversible with POST /projects/:id/restore.',
  })
  @ApiOkResponse({ type: ProjectResponseDto })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectResponseDto> {
    return this.projects.softDelete(user.id, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a project from the trash.' })
  @ApiOkResponse({ type: ProjectResponseDto })
  async restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectResponseDto> {
    return this.projects.restore(user.id, id);
  }
}
