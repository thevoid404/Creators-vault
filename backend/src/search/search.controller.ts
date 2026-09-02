import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { AssetResponseDto } from '../assets/dto/asset-response.dto';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  KeywordSearchQueryDto,
  ScoredAssetDto,
  SemanticSearchDto,
  SemanticSearchResponseDto,
  SimilarAssetsQueryDto,
} from './dto/search.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@ApiBearerAuth('access-token')
@Controller('search')
export class SearchController {
  constructor(
    private readonly search: SearchService,
    private readonly embeddings: EmbeddingsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Keyword search. The fast default.',
    description:
      'Matches title, description, category, source platform and tag names. Makes no AI call, so it is instant and free — use this for most queries.',
  })
  @ApiPaginatedResponse(AssetResponseDto)
  async keyword(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: KeywordSearchQueryDto,
  ): Promise<PaginatedResponseDto<AssetResponseDto>> {
    return this.search.keywordSearch(user.id, query);
  }

  @Post('semantic')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Semantic search by meaning.',
    description:
      'Embeds the query and ranks assets by cosine similarity to their stored vectors. Degrades to keyword search rather than failing — always check `strategy` in the response.',
  })
  @ApiOkResponse({ type: SemanticSearchResponseDto })
  async semantic(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SemanticSearchDto,
  ): Promise<SemanticSearchResponseDto> {
    return this.search.semanticSearch(user.id, dto);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Whether semantic search is usable right now, and how much is indexed.',
  })
  @ApiOkResponse({
    schema: {
      example: {
        driver: 'local',
        available: true,
        pgvector: true,
        pendingAssets: 0,
      },
    },
  })
  async status(@CurrentUser() user: AuthenticatedUser) {
    return {
      driver: this.embeddings.driver,
      available: await this.embeddings.isAvailable(),
      pgvector: await this.prisma.hasVectorExtension(),
      pendingAssets: await this.embeddings.countPending(user.id),
    };
  }

  @Post('reindex')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Index the authenticated user’s assets that have no embedding yet.',
    description:
      'Indexing normally happens automatically in the background when an asset is created. This catches up assets created while the provider was down, or before one was configured, and is the migration path after changing EMBEDDING_DRIVER.',
  })
  @ApiOkResponse({ schema: { example: { processed: 12, indexed: 12, failed: 0 } } })
  async reindex(@CurrentUser() user: AuthenticatedUser) {
    return this.embeddings.backfill(user.id, 200);
  }
}

/**
 * Lives on the `assets` path because it reads as a property of an asset. Kept in
 * this module so all ranking logic stays in one place.
 */
@ApiTags('search')
@ApiBearerAuth('access-token')
@Controller('assets')
export class AssetSimilarityController {
  constructor(private readonly search: SearchService) {}

  @Get(':id/similar')
  @ApiOperation({
    summary: 'Assets similar to this one, with a similarity score.',
    description:
      'Compares stored embeddings, so it makes no AI call. Returns an empty list with a `reason` when the asset has not been indexed yet.',
  })
  @ApiOkResponse({
    schema: {
      example: {
        data: [{ asset: { id: '…', title: 'Icon set' }, score: 0.92, scoreLabel: '92% similar' }],
        total: 1,
        reason: null,
      },
    },
  })
  @ApiNotFoundResponse({ description: 'No such asset, or it is not yours.' })
  async similar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SimilarAssetsQueryDto,
  ): Promise<{ data: ScoredAssetDto[]; total: number; reason: string | null }> {
    return this.search.findSimilar(user.id, id, query);
  }
}
