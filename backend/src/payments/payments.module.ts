import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider.interface';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockPaymentProvider } from './providers/mock-payment.provider';

/**
 * THIS FACTORY IS THE ONE FILE THAT CHANGES WHEN PAYMENTS GO LIVE.
 *
 * Adding Stripe means writing StripePaymentProvider against the PaymentProvider
 * interface and adding one case below. No controller, DTO, database table or
 * calling site is touched — which is the whole point of the interface.
 */
@Module({
  imports: [UsersModule],
  controllers: [PaymentsController],
  providers: [
    MockPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, MockPaymentProvider],
      useFactory: (config: ConfigService, mock: MockPaymentProvider): PaymentProvider => {
        const logger = new Logger('PaymentsModule');
        const driver = config.get<string>('payment.driver', 'mock');

        switch (driver) {
          case 'mock':
            logger.warn('Payment driver: mock. No gateway is integrated and no money moves.');
            return mock;
          default:
            logger.warn(
              `PAYMENT_DRIVER="${driver}" is not implemented yet - falling back to the mock provider.`,
            );
            return mock;
        }
      },
    },
    PaymentsService,
  ],
  exports: [PaymentsService, PAYMENT_PROVIDER],
})
export class PaymentsModule {}
