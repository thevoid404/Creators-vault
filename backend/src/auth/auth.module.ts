import { Logger, Module, type Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GithubStrategy } from './strategies/github.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

const logger = new Logger('AuthModule');

/**
 * OAuth strategies are registered only when their credentials are present.
 *
 * `passport-oauth2` throws from its constructor on a blank client id, so
 * unconditionally providing these classes would take the whole application down
 * for anyone who has not filled in `.env` yet. Registering conditionally is also
 * what keeps Google working independently of GitHub, as required: a missing
 * GitHub client id disables exactly the GitHub routes and nothing else.
 */
function oauthStrategyProvider(
  key: 'google' | 'github',
  StrategyClass: typeof GoogleStrategy | typeof GithubStrategy,
): Provider {
  return {
    provide: StrategyClass,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
      const clientId = config.get<string>(`${key}.clientId`);
      const clientSecret = config.get<string>(`${key}.clientSecret`);
      if (!clientId || !clientSecret) {
        logger.warn(`${key} OAuth strategy not registered — credentials are missing`);
        return null;
      }
      logger.log(`${key} OAuth strategy registered`);
      return new (StrategyClass as new (config: ConfigService) => unknown)(config);
    },
  };
}

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    // Secrets are passed per-signing call in AuthService, because access and
    // refresh tokens are signed with different secrets.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    oauthStrategyProvider('google', GoogleStrategy),
    oauthStrategyProvider('github', GithubStrategy),
  ],
  exports: [AuthService],
})
export class AuthModule {}
