import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AssetSourceType } from '@prisma/client';
import { AssetsService } from '../assets/assets.service';
import { AssetResponseDto } from '../assets/dto/asset-response.dto';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { CreateAssetFromUrlDto } from '../assets/dto/create-asset.dto';
import {
  CreateExtensionTokenDto,
  CreatedExtensionTokenDto,
  ExtensionCaptureDto,
  ExtensionTokenResponseDto,
} from './dto/extension.dto';
import { ExtensionTokenGuard } from './extension-token.guard';
import { ExtensionTokenService } from './extension-token.service';

/**
 * Backend surface for a future browser extension.
 *
 * **The extension itself is deliberately not built** — no manifest, no content
 * script, no packaging. This is the API it would call.
 */
@ApiTags('extension')
@Controller('extension')
export class ExtensionController {
  constructor(
    private readonly tokens: ExtensionTokenService,
    private readonly assets: AssetsService,
  ) {}

  // -------------------------------------------------------------------------
  // Token management — authenticated with a normal JWT
  // -------------------------------------------------------------------------

  @Post('token')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Issue a long-lived extension token.',
    description:
      'Call this from the signed-in web app and paste the result into the extension. The token is returned ONCE and only its hash is stored — it cannot be shown again.',
  })
  @ApiCreatedResponse({ type: CreatedExtensionTokenDto })
  async createToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExtensionTokenDto,
  ): Promise<CreatedExtensionTokenDto> {
    return this.tokens.create(user.id, dto);
  }

  @Get('tokens')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List the authenticated user’s extension tokens.',
    description: 'Shows a prefix and last-used time, never the token itself.',
  })
  @ApiOkResponse({ type: [ExtensionTokenResponseDto] })
  async listTokens(@CurrentUser() user: AuthenticatedUser): Promise<ExtensionTokenResponseDto[]> {
    return this.tokens.list(user.id);
  }

  @Delete('tokens/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Revoke an extension token.',
    description:
      'Takes effect immediately. The record is kept, marked revoked, so the user can still see it in the list.',
  })
  @ApiOkResponse({ type: ExtensionTokenResponseDto })
  @ApiNotFoundResponse({ description: 'No such token, or it is not yours.' })
  async revokeToken(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExtensionTokenResponseDto> {
    return this.tokens.revoke(user.id, id);
  }

  // -------------------------------------------------------------------------
  // The extension's own endpoints — authenticated with the extension token
  //
  // @Public() opts these out of the global JwtAuthGuard. They are not
  // unauthenticated; they authenticate differently.
  // -------------------------------------------------------------------------

  @Public()
  @UseGuards(ExtensionTokenGuard)
  @Get('me')
  @ApiSecurity('extension-token')
  @ApiOperation({
    summary: 'Verify an extension token and identify its owner.',
    description: 'The extension calls this once at setup to confirm the pasted token works.',
  })
  @ApiOkResponse({ schema: { example: { id: '9f1c…', email: 'ada@example.com', valid: true } } })
  @ApiUnauthorizedResponse({ description: 'Token missing, malformed, revoked or expired.' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return { id: user.id, email: user.email, valid: true };
  }

  @Public()
  @UseGuards(ExtensionTokenGuard)
  @Post('capture')
  @ApiSecurity('extension-token')
  @ApiOperation({
    summary: 'Capture the current page as an asset.',
    description:
      'Authenticated by the extension token, not a JWT. Runs the same asset-creation path as POST /assets/from-url — same validation, tag creation, project checks and background indexing — and records sourceType "extension".',
  })
  @ApiCreatedResponse({ type: AssetResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token missing, malformed, revoked or expired.' })
  async capture(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExtensionCaptureDto,
  ): Promise<AssetResponseDto> {
    // Reuse rather than reimplement: the same method the /assets/from-url route
    // calls, with the capture-specific parts passed as overrides.
    return this.assets.createFromUrl(
      user.id,
      {
        sourceUrl: dto.sourceUrl,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        category: dto.category,
        tags: dto.tags,
        projectId: dto.projectId,
        section: dto.section,
        licenseType: dto.licenseType,
        // Off by default: the extension can read the page directly, including
        // pages behind a login that the server could never fetch.
        fetchMetadata: dto.fetchMetadata ?? false,
      } as CreateAssetFromUrlDto,
      {
        sourceType: AssetSourceType.extension,
        previewUrl: dto.previewUrl ?? null,
        extraMetadata: { capturedBy: 'extension', capturedAt: new Date().toISOString() },
      },
    );
  }
}
