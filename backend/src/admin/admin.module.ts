import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { PaymentsModule } from '../payments/payments.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

/**
 * The admin panel's backend. Every route is `@Roles(admin)`-guarded on the
 * controller. This module composes read/aggregate views across the other modules
 * rather than duplicating their logic — it imports their services and adds
 * platform-wide (not owner-scoped) queries plus moderation actions.
 */
@Module({
  imports: [UsersModule, AssetsModule, MarketplaceModule, PaymentsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
