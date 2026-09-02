import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type {
  CheckoutSession,
  CheckoutSessionInput,
  PaymentProvider,
  RefundInput,
  RefundResult,
  WebhookResult,
} from '../payment-provider.interface';

/**
 * A payment provider that processes nothing.
 *
 * **No real gateway is integrated in this build, by design.** This exists so
 * that the marketplace and payment routes are wired end to end through the
 * `PaymentProvider` interface and can be exercised from Postman — proving the
 * seam works — without a single line of real payment logic.
 *
 * It simulates both outcomes: a checkout for an amount ending in `.99` fails,
 * everything else succeeds. That is a deliberate hook so a frontend developer
 * can build and test the failure path today rather than discovering it later.
 *
 * `isLive` is `false`, which is what the API uses to keep telling callers, in
 * every response, that no money moved.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly kind = 'mock' as const;
  readonly isLive = false;

  private readonly logger = new Logger(MockPaymentProvider.name);

  constructor(private readonly config: ConfigService) {}

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession> {
    // TODO: implement when payment integration is added.
    // A real provider calls its SDK here and returns the hosted checkout URL.
    this.logger.log(
      `[MOCK] Checkout for listing ${input.listingId}: ${input.amount} ${input.currency} — no charge made`,
    );

    const sessionId = `mock_cs_${randomUUID().replace(/-/g, '')}`;
    const base = this.config.get<string>('apiBaseUrl') ?? '';

    return {
      sessionId,
      // Points back at this API's own mock page rather than a real gateway, so
      // it is obvious at a glance that nothing is being charged.
      checkoutUrl: `${base}/api/v1/payments/mock-checkout/${sessionId}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  async handleWebhook(rawBody: string | Buffer, signature?: string): Promise<WebhookResult> {
    // TODO: implement when payment integration is added.
    // A real provider MUST verify `signature` over the raw body before trusting
    // anything in it; without that check, anyone can forge a payment success.
    this.logger.log(`[MOCK] Webhook received (signature: ${signature ?? 'none'})`);

    let event: { transactionId?: string; status?: string; amount?: number };
    try {
      event = JSON.parse(rawBody.toString());
    } catch {
      return { transactionId: '', status: 'ignored', failureReason: 'Body is not valid JSON.' };
    }

    if (!event.transactionId) {
      return { transactionId: '', status: 'ignored', failureReason: 'No transactionId in event.' };
    }

    const failed = this.shouldFail(event.amount);
    return {
      transactionId: event.transactionId,
      status: failed ? 'failed' : ((event.status as WebhookResult['status']) ?? 'succeeded'),
      providerPaymentId: `mock_pi_${randomUUID().replace(/-/g, '')}`,
      failureReason: failed ? 'Simulated decline: amounts ending in .99 always fail.' : undefined,
      raw: event,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    // TODO: implement when payment integration is added.
    this.logger.log(`[MOCK] Refund for transaction ${input.transactionId} — no money moved`);

    return {
      refundId: `mock_re_${randomUUID().replace(/-/g, '')}`,
      status: 'succeeded',
      amount: input.amount ?? 0,
    };
  }

  /** The simulated-failure hook: any amount ending in .99 declines. */
  private shouldFail(amount?: number): boolean {
    if (amount === undefined) {
      return false;
    }
    return Math.round((amount % 1) * 100) === 99;
  }
}
