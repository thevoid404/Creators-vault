import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

/** STUB MODULE. Schema, routes and DTOs are final; the logic is not implemented. */
@Module({
  imports: [PaymentsModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
