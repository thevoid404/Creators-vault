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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import {
  CreateTagDto,
  ListTagsQueryDto,
  SuggestTagsDto,
  TagResponseDto,
  TagSuggestionDto,
  UpdateTagDto,
} from './dto/tag.dto';
import { TagsService } from './tags.service';

@ApiTags('tags')
@ApiBearerAuth('access-token')
@Controller('tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a tag.',
    description:
      'Idempotent — a name that slugs to an existing tag returns that tag rather than a conflict. Tags are also created implicitly when you send `tags` on an asset.',
  })
  @ApiCreatedResponse({ type: TagResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTagDto,
  ): Promise<TagResponseDto> {
    return this.tags.create(user.id, dto);
  }

  @Post('suggest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suggest tags for an asset or for typed text.',
    description:
      'Blends three signals: tags you already use that match the text, tags that co-occur on your similar assets, and salient new terms. Works with no AI provider configured; when one is, an extra semantic pass re-ranks the results.',
  })
  @ApiOkResponse({ type: [TagSuggestionDto] })
  @ApiNotFoundResponse({ description: 'The given assetId does not exist or is not yours.' })
  async suggest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SuggestTagsDto,
  ): Promise<TagSuggestionDto[]> {
    return this.tags.suggest(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List the authenticated user’s tags.',
    description: 'Sorted by usage by default. `q` matches both the name and the slug.',
  })
  @ApiPaginatedResponse(TagResponseDto)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTagsQueryDto,
  ): Promise<PaginatedResponseDto<TagResponseDto>> {
    return this.tags.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch one tag.' })
  @ApiOkResponse({ type: TagResponseDto })
  @ApiNotFoundResponse({ description: 'No such tag, or it belongs to another user.' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TagResponseDto> {
    return this.tags.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Rename or recolour a tag.',
    description:
      'Renaming also changes the slug, which is what asset filters use — update any saved filters accordingly.',
  })
  @ApiOkResponse({ type: TagResponseDto })
  @ApiConflictResponse({ description: 'You already have a different tag with that name.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    return this.tags.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a tag.',
    description:
      'Permanent, unlike assets and projects — a tag holds no content, so deleting it only detaches it from assets. No asset is deleted.',
  })
  @ApiOkResponse({ schema: { example: { id: 'aa11…', detachedAssets: 12 } } })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string; detachedAssets: number }> {
    return this.tags.remove(user.id, id);
  }
}
