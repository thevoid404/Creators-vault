/**
 * The payment abstraction.
 *
 * **This is the single most important file for the "add payments later without a
 * rewrite" requirement.** Every route and every service in this codebase depends
 * on this interface and never on a gateway SDK. Adding Stripe means writing
 * `StripePaymentProvider implements PaymentProvider` and changing one `case` in
 * `PaymentsModule` — no controller, DTO, database table or calling site changes.
 *
 * The shapes below are deliberately gateway-neutral. They are modelled on what
 * every hosted-checkout provider actually offers (Stripe, Paddle,
 * Lemon Squeezy), rather than on any one of them, so the first real integration
 * does not force the contract to change.
 */

/** Injection token. Concrete providers are bound to it in `PaymentsModule`. */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface CheckoutSessionInput {
  /** Local transaction id. Sent to the gateway as its idempotency/reference key. */
  transactionId: string;
  userId: string;
  userEmail: string;
  listingId: string;
  listingTitle: string;
  /** Major units, e.g. 29.00. Providers needing minor units convert internally. */
  amount: number;
  /** ISO 4217, e.g. "USD". */
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  /** Provider-side session id, stored on the transaction as `providerSessionId`. */
  sessionId: string;
  /** Where the browser is sent to pay. */
  checkoutUrl: string;
  expiresAt: Date;
}

export interface WebhookResult {
  /** Which local transaction this event concerns. */
  transactionId: string;
  status: 'succeeded' | 'failed' | 'refunded' | 'cancelled' | 'ignored';
  providerPaymentId?: string;
  failureReason?: string;
  /** The raw event, persisted for reconciliation and replay. */
  raw?: unknown;
}

export interface RefundInput {
  transactionId: string;
  providerPaymentId: string;
  /** Omit for a full refund. */
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  status: 'succeeded' | 'pending' | 'failed';
  amount: number;
  failureReason?: string;
}

export interface PaymentProvider {
  /** Matches a `PaymentProviderKind` enum value; stored on each transaction. */
  readonly kind: 'mock' | 'stripe' | 'paddle' | 'lemonsqueezy';

  /** True when this provider could actually process a real payment. */
  readonly isLive: boolean;

  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession>;

  /**
   * Verifies and interprets an inbound webhook.
   *
   * `signature` is passed separately because every real gateway authenticates
   * webhooks with a header signature over the raw body — a provider that ignored
   * it would accept forged payment confirmations.
   */
  handleWebhook(rawBody: string | Buffer, signature?: string): Promise<WebhookResult>;

  refund(input: RefundInput): Promise<RefundResult>;
}
