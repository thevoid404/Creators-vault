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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RelationType } from '@prisma/client';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import {
  AssetConnectionDto,
  CreateRelationshipDto,
  ListRelationshipsQueryDto,
  RelationshipResponseDto,
  UpdateRelationshipDto,
} from './dto/relationship.dto';
import { RelationshipsService } from './relationships.service';

@ApiTags('relationships')
@ApiBearerAuth('access-token')
@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly relationships: RelationshipsService) {}

  @Post()
  @ApiOperation({
    summary: 'Connect an asset to another asset or to a project.',
    description:
      'Edges are directed and are not mirrored: "A used_in B" does not create "B used_in A". Both endpoints must be yours.',
  })
  @ApiCreatedResponse({ type: RelationshipResponseDto })
  @ApiBadRequestResponse({ description: 'No target, both targets, or an asset related to itself.' })
  @ApiConflictResponse({ description: 'An identical edge already exists.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRelationshipDto,
  ): Promise<RelationshipResponseDto> {
    return this.relationships.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List relationships.',
    description:
      'Filter by `assetId` (matches either end), `projectId`, or `relationType`. `q` searches the reason text.',
  })
  @ApiPaginatedResponse(RelationshipResponseDto)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRelationshipsQueryDto,
  ): Promise<PaginatedResponseDto<RelationshipResponseDto>> {
    return this.relationships.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch one relationship.' })
  @ApiOkResponse({ type: RelationshipResponseDto })
  @ApiNotFoundResponse({ description: 'No such relationship, or it is not yours.' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RelationshipResponseDto> {
    return this.relationships.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Change a relationship’s type or reason.',
    description: 'Re-pointing an edge is not an update — delete it and create the new one.',
  })
  @ApiOkResponse({ type: RelationshipResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRelationshipDto,
  ): Promise<RelationshipResponseDto> {
    return this.relationships.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a relationship.',
    description: 'Permanent, and neither asset is affected — an edge holds no content of its own.',
  })
  @ApiOkResponse({ schema: { example: { id: '7c2d…' } } })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string }> {
    return this.relationships.remove(user.id, id);
  }
}

/**
 * Lives on the `assets` path because it reads as a property of an asset, which
 * is how the UI uses it. Kept in this module so all graph logic stays together.
 */
@ApiTags('relationships')
@ApiBearerAuth('access-token')
@Controller('assets')
export class AssetRelationshipsController {
  constructor(private readonly relationships: RelationshipsService) {}

  @Get(':id/relationships')
  @ApiOperation({
    summary: 'Everything connected to this asset, with the reason text.',
    description:
      'Returns edges in both directions, flattened so each entry describes the other end. `direction` is "outgoing" when this asset is the source and "incoming" when another asset points at it.',
  })
  @ApiQuery({
    name: 'relationType',
    enum: RelationType,
    required: false,
    description: 'Return only edges of this type.',
  })
  @ApiOkResponse({ type: [AssetConnectionDto] })
  @ApiNotFoundResponse({ description: 'No such asset, or it is not yours.' })
  async listForAsset(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('relationType') relationType?: RelationType,
  ): Promise<AssetConnectionDto[]> {
    return this.relationships.listForAsset(user.id, id, relationType);
  }
}
