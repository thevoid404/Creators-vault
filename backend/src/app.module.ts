import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AssetsModule } from './assets/assets.module';
import { AuthModule } from './auth/auth.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { ExtensionModule } from './extension/extension.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { PaymentsModule } from './payments/payments.module';
import { ProjectsModule } from './projects/projects.module';
import { RelationshipsModule } from './relationships/relationships.module';
import { SearchModule } from './search/search.module';
import { StorageModule } from './storage/storage.module';
import { TagsModule } from './tags/tags.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { configuration } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

/**
 * Root module. Domain modules are registered here one per phase, in the order
 * laid out in mission.md, so the wiring reads as the build order.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttlSeconds', 60) * 1000,
          limit: config.get<number>('throttle.limit', 120),
        },
      ],
    }),
    PrismaModule,
    HealthModule,
    // Phase 1
    AuthModule,
    UsersModule,
    // Phase 2
    StorageModule,
    AssetsModule,
    // Phase 3
    ProjectsModule,
    TagsModule,
    // Phase 4
    RelationshipsModule,
    // Phase 5
    EmbeddingsModule,
    SearchModule,
    // Phase 6
    ExtensionModule,
    // Phase 7 - stubs by design
    PaymentsModule,
    MarketplaceModule,
  ],
  providers: [
    // Order matters: authenticate, then check the role.
    //
    // Both guards are global so that a newly added endpoint is protected by
    // default. Opting out is explicit, via @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
