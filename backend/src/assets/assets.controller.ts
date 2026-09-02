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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { AssetsService, type UploadedFile } from './assets.service';
import { AssetResponseDto } from './dto/asset-response.dto';
import {
  CreateAssetDto,
  CreateAssetFromMarketplaceLinkDto,
  CreateAssetFromUrlDto,
  UpdateAssetDto,
  UploadAssetDto,
} from './dto/create-asset.dto';
import { ListAssetsQueryDto } from './dto/list-assets-query.dto';

/** Multipart field limit. Matches the `FilesInterceptor` registration below. */
const MAX_FILES_PER_REQUEST = 25;

@ApiTags('assets')
@ApiBearerAuth('access-token')
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assets: AssetsService,
    private readonly config: ConfigService,
  ) {}

  // -------------------------------------------------------------------------
  // Ingestion
  // -------------------------------------------------------------------------

  @Post()
  @ApiOperation({
    summary: 'Create an asset with no file and no source URL.',
    description: 'For notes, references and placeholders. The file-backed routes are below.',
  })
  @ApiCreatedResponse({ type: AssetResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAssetDto,
  ): Promise<AssetResponseDto> {
    return this.assets.createManual(user.id, dto);
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', MAX_FILES_PER_REQUEST))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload one or more files, or a folder as a zip.',
    description:
      'Send files under the `files` field. One asset is created per file. Pass `expandZip=true` to unpack a .zip into one asset per entry — that is how a folder is imported. Returns an array even for a single file.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        title: { type: 'string', description: 'Only applied when exactly one file is sent.' },
        description: { type: 'string' },
        type: { type: 'string' },
        category: { type: 'string' },
        tags: { type: 'string', description: 'Comma-separated.' },
        projectId: { type: 'string', format: 'uuid' },
        section: { type: 'string' },
        licenseType: { type: 'string' },
        licenseNote: { type: 'string' },
        expandZip: { type: 'boolean', default: false },
      },
    },
  })
  @ApiCreatedResponse({ type: [AssetResponseDto] })
  @ApiPayloadTooLargeResponse({
    description: 'File too large, or the storage quota would be exceeded.',
  })
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFiles() files: UploadedFile[],
    @Body() dto: UploadAssetDto,
  ): Promise<AssetResponseDto[]> {
    return this.assets.createFromUpload(user.id, files ?? [], dto);
  }

  @Post('from-url')
  @ApiOperation({
    summary: 'Import an asset from a pasted URL.',
    description:
      'Fetches the page for its title, description and preview image unless `fetchMetadata` is false. A site that is slow or blocks scrapers does not fail the import — the domain is used as the title instead.',
  })
  @ApiCreatedResponse({ type: AssetResponseDto })
  async createFromUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAssetFromUrlDto,
  ): Promise<AssetResponseDto> {
    return this.assets.createFromUrl(user.id, dto);
  }

  @Post('from-marketplace-link')
  @ApiOperation({
    summary: 'Import a purchased asset from a marketplace link.',
    description:
      'The URL import plus manually entered purchase details. No marketplace API is contacted — every purchase field is optional and supplied by you.',
  })
  @ApiCreatedResponse({ type: AssetResponseDto })
  async createFromMarketplaceLink(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAssetFromMarketplaceLinkDto,
  ): Promise<AssetResponseDto> {
    return this.assets.createFromMarketplaceLink(user.id, dto);
  }

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  @Get()
  @ApiOperation({
    summary: 'List the authenticated user’s assets.',
    description:
      'Paginated, sortable and filterable. `q` matches title, description and category. Pass `deleted=true` for the trash.',
  })
  @ApiPaginatedResponse(AssetResponseDto)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAssetsQueryDto,
  ): Promise<PaginatedResponseDto<AssetResponseDto>> {
    return this.assets.list(user.id, query);
  }

  @Get('limits')
  @ApiOperation({ summary: 'Upload limits this server enforces.' })
  @ApiOkResponse({
    schema: {
      example: { maxUploadSizeMB: 100, maxFilesPerRequest: 25, storageQuotaMB: 2048 },
    },
  })
  limits() {
    return {
      maxUploadSizeMB: this.config.get<number>('storage.maxUploadSizeMB'),
      maxFilesPerRequest: MAX_FILES_PER_REQUEST,
      storageQuotaMB: this.config.get<number>('storage.userQuotaMB'),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch one asset.' })
  @ApiOkResponse({ type: AssetResponseDto })
  @ApiNotFoundResponse({ description: 'No such asset, or it belongs to another user.' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssetResponseDto> {
    return this.assets.findOne(user.id, id);
  }

  // -------------------------------------------------------------------------
  // Write
  // -------------------------------------------------------------------------

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an asset.',
    description:
      'Only the fields you send change. Sending `tags` replaces the whole tag set for the asset.',
  })
  @ApiOkResponse({ type: AssetResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ): Promise<AssetResponseDto> {
    return this.assets.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Move an asset to the trash.',
    description:
      'A soft delete — assets are never hard-deleted. The file stays in storage and the asset stops counting against your quota. Reversible with POST /assets/:id/restore.',
  })
  @ApiOkResponse({ type: AssetResponseDto })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssetResponseDto> {
    return this.assets.softDelete(user.id, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore an asset from the trash.' })
  @ApiOkResponse({ type: AssetResponseDto })
  @ApiPayloadTooLargeResponse({ description: 'Restoring would exceed the storage quota.' })
  async restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssetResponseDto> {
    return this.assets.restore(user.id, id);
  }
}
