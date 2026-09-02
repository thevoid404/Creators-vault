import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AuthProvider } from '@prisma/client';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';
import type { OAuthProfile } from '../../users/users.service';

/**
 * Google is the primary way into the product.
 *
 * This class is only instantiated when `GOOGLE_CLIENT_ID` is configured — see
 * the conditional provider in `AuthModule`. Passport itself throws on
 * construction with an empty client id, which would take the whole app down.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('google.clientId') ?? '',
      clientSecret: config.get<string>('google.clientSecret') ?? '',
      callbackURL: config.get<string>('google.callbackUrl') ?? '',
      scope: ['email', 'profile'],
    });
  }

  /**
   * Maps the Google profile onto the provider-neutral shape the users module
   * consumes. Every OAuth strategy ends here, which is what makes adding a third
   * provider a new file rather than a change to the login flow.
   */
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new UnauthorizedException('Google did not return an email address for this account.'));
      return;
    }

    const mapped: OAuthProfile = {
      provider: AuthProvider.google,
      providerId: profile.id,
      email: email.toLowerCase(),
      name: profile.displayName ?? null,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, mapped);
  }
}
