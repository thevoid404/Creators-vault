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
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import {
  CreateListingDto,
  ListListingsQueryDto,
  ListingResponseDto,
  PurchaseListingDto,
  PurchaseResponseDto,
  UpdateListingDto,
} from './dto/marketplace.dto';
import { MarketplaceService } from './marketplace.service';

/**
 * STUB MODULE. Routes and DTOs are final; the logic behind them is not
 * implemented. See `MarketplaceService` for what each endpoint actually does.
 */
@ApiTags('marketplace')
@ApiBearerAuth('access-token')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Post('listings')
  @ApiOperation({
    summary: '[STUB] Create a marketplace listing.',
    description:
      'NOT IMPLEMENTED — returns 501. The route, DTO and database schema are final; selling requires seller verification and payouts, which are out of scope for this build.',
  })
  @ApiCreatedResponse({ type: ListingResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateListingDto,
  ): Promise<ListingResponseDto> {
    return this.marketplace.create(user.id, dto);
  }

  @Get('listings')
  @ApiOperation({
    summary: '[STUB] Browse marketplace listings.',
    description:
      'Returns sample listings so the frontend can be built today. Every filter below is honoured against the samples. Each listing carries `isStub: true`.',
  })
  @ApiPaginatedResponse(ListingResponseDto)
  async list(
    @Query() query: ListListingsQueryDto,
  ): Promise<PaginatedResponseDto<ListingResponseDto>> {
    return this.marketplace.list(query);
  }

  @Get('listings/:id')
  @ApiOperation({
    summary: '[STUB] Fetch one listing.',
    description: 'Only the sample listings exist. Anything else returns 404.',
  })
  @ApiOkResponse({ type: ListingResponseDto })
  @ApiNotFoundResponse({ description: 'No such sample listing.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ListingResponseDto> {
    return this.marketplace.findOne(id);
  }

  @Patch('listings/:id')
  @ApiOperation({
    summary: '[STUB] Update a listing.',
    description: 'NOT IMPLEMENTED — returns 501. The DTO is final.',
  })
  @ApiOkResponse({ type: ListingResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingDto,
  ): Promise<ListingResponseDto> {
    return this.marketplace.update(user.id, id, dto);
  }

  @Delete('listings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '[STUB] Delete a listing.',
    description: 'NOT IMPLEMENTED — returns 501.',
  })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.marketplace.remove(user.id, id);
  }

  @Post('listings/:id/purchase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[STUB] Buy a listing.',
    description:
      'NO MONEY MOVES. This does run the full path for real — it creates a Transaction row and goes through the PaymentProvider interface — so the flow is testable end to end and the response shape is final. `isLive` is false while MockPaymentProvider is bound.',
  })
  @ApiOkResponse({ type: PurchaseResponseDto })
  @ApiNotFoundResponse({ description: 'No such sample listing.' })
  async purchase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PurchaseListingDto,
  ): Promise<PurchaseResponseDto> {
    return this.marketplace.purchase(user.id, id, dto);
  }
}
