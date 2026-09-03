import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  CurrentUser,
  type AuthenticatedUser,
  type RequestWithUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { AuthService, type SessionContext } from './auth.service';
import { AuthTokensDto, RefreshTokenDto } from './dto/auth-tokens.dto';
import { GithubOAuthGuard, GoogleOAuthGuard } from './guards/oauth.guards';
import type { OAuthProfile } from '../users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  // -------------------------------------------------------------------------
  // Google — the mandatory provider
  // -------------------------------------------------------------------------

  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({
    summary: 'Start the Google OAuth flow.',
    description:
      'Open this in a browser — it 302s to Google’s consent screen. Not callable from fetch/XHR.',
  })
  @ApiServiceUnavailableResponse({ description: 'Google OAuth is not configured on this server.' })
  googleLogin(): void {
    // The guard performs the redirect; this body is never reached.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiExcludeEndpoint()
  async googleCallback(@Req() req: RequestWithUser, @Res() res: Response): Promise<void> {
    return this.completeOAuth(req, res);
  }

  // -------------------------------------------------------------------------
  // GitHub — optional, identical pattern
  // -------------------------------------------------------------------------

  @Public()
  @Get('github')
  @UseGuards(GithubOAuthGuard)
  @ApiOperation({
    summary: 'Start the GitHub OAuth flow.',
    description: 'Optional provider. Returns 503 when GITHUB_CLIENT_ID is not set.',
  })
  @ApiServiceUnavailableResponse({ description: 'GitHub OAuth is not configured on this server.' })
  githubLogin(): void {
    // The guard performs the redirect.
  }

  @Public()
  @Get('github/callback')
  @UseGuards(GithubOAuthGuard)
  @ApiExcludeEndpoint()
  async githubCallback(@Req() req: RequestWithUser, @Res() res: Response): Promise<void> {
    return this.completeOAuth(req, res);
  }

  // -------------------------------------------------------------------------
  // Session lifecycle
  // -------------------------------------------------------------------------

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a refresh token for a new token pair.',
    description:
      'Refresh tokens rotate: the presented token is revoked and a new one returned. Replaying an already-rotated token revokes every session for that user.',
  })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Token is unknown, expired, or already used.' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: RequestWithUser): Promise<AuthTokensDto> {
    return this.auth.refresh(dto.refreshToken, this.sessionContext(req));
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke one refresh token.',
    description: 'Idempotent — revoking an unknown or already-revoked token is not an error.',
  })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke every refresh token for the authenticated user.' })
  @ApiOkResponse({ schema: { example: { revokedSessions: 3 } } })
  async logoutAll(@CurrentUser() user: AuthenticatedUser): Promise<{ revokedSessions: number }> {
    return { revokedSessions: await this.auth.revokeAllForUser(user.id) };
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'The authenticated user’s profile.' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.users.toResponse(await this.users.findById(user.id));
  }

  // -------------------------------------------------------------------------

  private sessionContext(req: RequestWithUser): SessionContext {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }

  /**
   * Both provider callbacks land here.
   *
   * The redirect target depends on the `state` the flow was started with:
   * `state=admin` (from the operators-only admin panel) comes back to
   * `ADMIN_URL`, everything else to `FRONTEND_URL`. With the chosen target blank,
   * the tokens are returned as JSON instead — how the flow is tested with curl
   * or Postman before any frontend exists.
   */
  private async completeOAuth(req: RequestWithUser, res: Response): Promise<void> {
    const profile = req.user as unknown as OAuthProfile;
    const tokens = await this.auth.loginWithOAuth(profile, this.sessionContext(req));

    const isAdmin = req.query?.state === 'admin';
    const target = isAdmin
      ? this.config.get<string>('adminUrl')
      : this.config.get<string>('frontendUrl');

    if (!target) {
      res.status(HttpStatus.OK).json(tokens);
      return;
    }

    const redirect = new URL('/auth/callback', target);
    redirect.searchParams.set('accessToken', tokens.accessToken);
    redirect.searchParams.set('refreshToken', tokens.refreshToken);
    res.redirect(redirect.toString());
  }
}
