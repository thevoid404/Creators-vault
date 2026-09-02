import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AuthProvider } from '@prisma/client';
import { Strategy, type Profile } from 'passport-github2';
import type { OAuthProfile } from '../../users/users.service';

type VerifyCallback = (error: unknown, user?: OAuthProfile) => void;

/**
 * Optional second provider, deliberately identical in shape to
 * `GoogleStrategy` — the point of the pattern is that adding a provider is a new
 * file and one conditional registration, nothing more.
 *
 * Only instantiated when `GITHUB_CLIENT_ID` is configured. When it is not, the
 * GitHub routes answer 503 and Google is entirely unaffected.
 */
@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('github.clientId') ?? '',
      clientSecret: config.get<string>('github.clientSecret') ?? '',
      callbackURL: config.get<string>('github.callbackUrl') ?? '',
      // GitHub only returns an email address when this scope is requested, and
      // even then only if the account has a public or verified primary address.
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(
        new UnauthorizedException(
          'Your GitHub account has no accessible email address. Make one public, or sign in with Google.',
        ),
      );
      return;
    }

    const mapped: OAuthProfile = {
      provider: AuthProvider.github,
      providerId: String(profile.id),
      email: email.toLowerCase(),
      name: profile.displayName ?? profile.username ?? null,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, mapped);
  }
}
