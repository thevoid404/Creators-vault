import { ConfigService } from '@nestjs/config';
import { MockPaymentProvider } from './mock-payment.provider';

describe('MockPaymentProvider', () => {
  const provider = new MockPaymentProvider(new ConfigService());

  it('declares itself as not live', () => {
    // Every API response reads this to keep telling callers no money moved.
    expect(provider.kind).toBe('mock');
    expect(provider.isLive).toBe(false);
  });

  it('returns a checkout session that points at the placeholder page', async () => {
    const session = await provider.createCheckoutSession({
      transactionId: 'tx-1',
      userId: 'user-1',
      userEmail: 'ada@example.com',
      listingId: 'listing-1',
      listingTitle: 'AudioLux UI Kit',
      amount: 29,
      currency: 'USD',
      successUrl: 'https://app.example.com/ok',
      cancelUrl: 'https://app.example.com/cancel',
    });

    expect(session.sessionId).toMatch(/^mock_cs_/);
    expect(session.checkoutUrl).toContain('/payments/mock-checkout/');
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('simulates a decline for amounts ending in .99', async () => {
    // The deliberate failure hook, so the frontend can build the failure path.
    const result = await provider.handleWebhook(
      JSON.stringify({ transactionId: 'tx-1', status: 'succeeded', amount: 12.99 }),
    );

    expect(result.status).toBe('failed');
    expect(result.failureReason).toContain('Simulated decline');
  });

  it('succeeds for any other amount', async () => {
    const result = await provider.handleWebhook(
      JSON.stringify({ transactionId: 'tx-1', status: 'succeeded', amount: 29 }),
    );

    expect(result.status).toBe('succeeded');
    expect(result.providerPaymentId).toMatch(/^mock_pi_/);
    expect(result.failureReason).toBeUndefined();
  });

  it('ignores a webhook that is not valid JSON', async () => {
    const result = await provider.handleWebhook('not json at all');
    expect(result.status).toBe('ignored');
  });

  it('ignores a webhook with no transactionId', async () => {
    const result = await provider.handleWebhook(JSON.stringify({ status: 'succeeded' }));
    expect(result.status).toBe('ignored');
  });

  it('accepts a Buffer body, as a real gateway would send', async () => {
    const result = await provider.handleWebhook(
      Buffer.from(JSON.stringify({ transactionId: 'tx-2', status: 'succeeded', amount: 10 })),
    );
    expect(result.transactionId).toBe('tx-2');
  });

  it('reports a refund as succeeded without moving money', async () => {
    const result = await provider.refund({
      transactionId: 'tx-1',
      providerPaymentId: 'mock_pi_x',
      amount: 29,
    });

    expect(result.status).toBe('succeeded');
    expect(result.refundId).toMatch(/^mock_re_/);
    expect(result.amount).toBe(29);
  });
});
