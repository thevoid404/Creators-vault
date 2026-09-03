import {
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
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { AssetResponseDto } from '../assets/dto/asset-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { ListingResponseDto } from '../marketplace/dto/marketplace.dto';
import { TransactionResponseDto } from '../payments/dto/payment.dto';
import { AdminService } from './admin.service';
import {
  AdminListAssetsQueryDto,
  AdminListListingsQueryDto,
  AdminListTransactionsQueryDto,
  AdminListUsersQueryDto,
} from './dto/admin-query.dto';
import {
  AdminActionResultDto,
  AdminUserDetailDto,
  PlatformStatsDto,
  SystemStatusDto,
} from './dto/admin.dto';

/**
 * The operators-only admin panel's backend.
 *
 * Every route requires the `admin` role — declared once on the controller and
 * enforced by the global `RolesGuard`. There is no public "become admin" flow by
 * design: the first admin is set directly in the database
 * (`scripts/promote-admin.ts`), after which admins promote others here via
 * `PATCH /users/:id`.
 */
@ApiTags('admin')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Caller is not an admin.' })
@Roles(Role.admin)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // -------------------------------------------------------------------------
  // Overview
  // -------------------------------------------------------------------------

  @Get('stats')
  @ApiOperation({
    summary: 'Platform-wide counts and a recent-activity feed.',
    description:
      'Users, assets, projects, storage, active listings and transaction count, plus recent signups/uploads/listings. Marketplace figures are stub data and transaction figures move no money — see the flags on the response.',
  })
  @ApiOkResponse({ type: PlatformStatsDto })
  stats(): Promise<PlatformStatsDto> {
    return this.admin.stats();
  }

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------

  @Get('users')
  @ApiOperation({
    summary: 'List every user, with account status.',
    description:
      'Paginated. `q` matches email and name. Filter by `role`, `plan` and `status` (active|suspended). Sort by createdAt, email, name, storageUsedMB.',
  })
  @ApiPaginatedResponse(UserResponseDto)
  listUsers(
    @Query() query: AdminListUsersQueryDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    return this.admin.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({
    summary: 'One user, with their asset/project/tag/transaction counts and recent assets.',
  })
  @ApiOkResponse({ type: AdminUserDetailDto })
  userDetail(@Param('id', ParseUUIDPipe) id: string): Promise<AdminUserDetailDto> {
    return this.admin.userDetail(id);
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suspend a user account.',
    description:
      'Reversible. A suspended user cannot obtain or refresh a session; existing access tokens stop working on the next request. Use POST /admin/users/:id/reactivate to undo.',
  })
  @ApiOkResponse({ type: AdminActionResultDto })
  suspend(@Param('id', ParseUUIDPipe) id: string): Promise<AdminActionResultDto> {
    return this.admin.setUserSuspended(id, true);
  }

  @Post('users/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lift a suspension. The user must sign in again.' })
  @ApiOkResponse({ type: AdminActionResultDto })
  reactivate(@Param('id', ParseUUIDPipe) id: string): Promise<AdminActionResultDto> {
    return this.admin.setUserSuspended(id, false);
  }

  // -------------------------------------------------------------------------
  // Assets — platform-wide
  // -------------------------------------------------------------------------

  @Get('assets')
  @ApiOperation({
    summary: 'Every asset on the platform, from any owner.',
    description:
      'Paginated. Filter by `type`, `sourceType`, `ownerId`, `createdAfter`/`createdBefore`, and `deleted` (hidden assets). `q` matches title, description and category.',
  })
  @ApiPaginatedResponse(AssetResponseDto)
  listAssets(
    @Query() query: AdminListAssetsQueryDto,
  ): Promise<PaginatedResponseDto<AssetResponseDto>> {
    return this.admin.listAssets(query);
  }

  @Get('assets/:id')
  @ApiOperation({ summary: 'One asset, regardless of owner.' })
  @ApiOkResponse({ type: AssetResponseDto })
  assetDetail(@Param('id', ParseUUIDPipe) id: string): Promise<AssetResponseDto> {
    return this.admin.assetDetail(id);
  }

  @Post('assets/:id/hide')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hide (soft-delete) an asset as a moderation action.',
    description:
      'Matches the owner-facing soft delete: the row and its file are kept, and the owner’s storage total is decremented. Reversible with POST /admin/assets/:id/restore.',
  })
  @ApiOkResponse({ type: AssetResponseDto })
  hideAsset(@Param('id', ParseUUIDPipe) id: string): Promise<AssetResponseDto> {
    return this.admin.setAssetHidden(id, true);
  }

  @Post('assets/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a hidden asset.' })
  @ApiOkResponse({ type: AssetResponseDto })
  restoreAsset(@Param('id', ParseUUIDPipe) id: string): Promise<AssetResponseDto> {
    return this.admin.setAssetHidden(id, false);
  }

  // -------------------------------------------------------------------------
  // Marketplace & transactions
  // -------------------------------------------------------------------------

  @Get('marketplace/listings')
  @ApiOperation({
    summary: '[STUB] Marketplace listings for review.',
    description:
      'The marketplace is a deliberate stub — these are the sample listings, each carrying `isStub: true`. `pendingOnly=true` returns only listings in `draft` status.',
  })
  @ApiPaginatedResponse(ListingResponseDto)
  listListings(
    @Query() query: AdminListListingsQueryDto,
  ): Promise<PaginatedResponseDto<ListingResponseDto>> {
    return this.admin.listListings(query.pendingOnly === 'true');
  }

  @Post('marketplace/listings/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[STUB] Approve a listing for publication.',
    description:
      'NOT IMPLEMENTED — returns 501. The marketplace is a stub with no listing rows; this route and response are final and real moderation lands with the real marketplace.',
  })
  approveListing(@Param('id', ParseUUIDPipe) id: string): Promise<never> {
    return this.admin.moderateListing(id, 'approve');
  }

  @Post('marketplace/listings/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[STUB] Reject a listing.',
    description: 'NOT IMPLEMENTED — returns 501. See POST /admin/marketplace/listings/:id/approve.',
  })
  rejectListing(@Param('id', ParseUUIDPipe) id: string): Promise<never> {
    return this.admin.moderateListing(id, 'reject');
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Every transaction on the platform.',
    description:
      'Real database rows, but `isLive: false` on every one — MockPaymentProvider is the only implementation bound. Filter by `status`, `provider`, `userId`.',
  })
  @ApiPaginatedResponse(TransactionResponseDto)
  listTransactions(
    @Query() query: AdminListTransactionsQueryDto,
  ): Promise<PaginatedResponseDto<TransactionResponseDto>> {
    return this.admin.listTransactions(query);
  }

  // -------------------------------------------------------------------------
  // System status
  // -------------------------------------------------------------------------

  @Get('system/status')
  @ApiOperation({
    summary: 'Which backend modules are live vs. intentionally stubbed.',
    description:
      'The module list is maintained in the backend (src/admin/system-modules.ts) alongside api.md and todo.md, so it stays accurate as the backend evolves. Also bundles the live GET /health and GET /payments/status payloads.',
  })
  @ApiOkResponse({ type: SystemStatusDto })
  systemStatus(): Promise<SystemStatusDto> {
    return this.admin.systemStatus();
  }
}
