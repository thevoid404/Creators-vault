import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderKind, Prisma, TransactionStatus } from '@prisma/client';
import { paginate, type PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { PurchaseResponseDto } from '../marketplace/dto/marketplace.dto';
import {
  TransactionResponseDto,
  type ListTransactionsQueryDto,
  type PaymentStatusDto,
  type RefundTransactionDto,
} from './dto/payment.dto';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider.interface';

/**
 * ============================================================================
 * PAYMENTS — STUB MODULE
 * ============================================================================
 *
 * **No real payment gateway is integrated.** `MockPaymentProvider` is the only
 * implementation bound, and it moves no money.
 *
 * What *is* real here is the plumbing, and that is the point: transactions are
 * genuinely written to the database, and every gateway interaction goes through
 * the `PaymentProvider` interface. So the route shapes, the transaction
 * lifecycle and the webhook handling are all final and exercisable today, and
 * introducing Stripe means writing one provider class and changing one `case` in
 * `PaymentsModule`.
 *
 * Every response carries `isLive: false` while that remains true.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  status(): PaymentStatusDto {
    return {
      provider: this.provider.kind as PaymentProviderKind,
      isLive: this.provider.isLive,
      message: this.provider.isLive
        ? `Payments are handled by ${this.provider.kind}.`
        : 'Payments are stubbed. No gateway is integrated and no money moves. Transactions are recorded so the flow can be tested end to end.',
    };
  }

  /**
   * Creates a transaction and asks the provider for a checkout session.
   *
   * The transaction row is written *before* the provider is called, so a
   * provider failure still leaves an auditable record of the attempt rather than
   * a silent gap. That ordering is what a real integration needs too.
   */
  async startCheckout(input: {
    buyerId: string;
    listingId: string;
    listingTitle: string;
    amount: number;
    currency: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<PurchaseResponseDto> {
    const buyer = await this.users.findById(input.buyerId);
    const frontend =
      this.config.get<string>('frontendUrl') || this.config.get<string>('apiBaseUrl');

    const transaction = await this.prisma.transaction.create({
      data: {
        userId: input.buyerId,
        // The stub's listings are fixtures with no database row, so the foreign
        // key is left null rather than pointing at something that is not there.
        // A real implementation sets it; the column and index already exist.
        listingId: null,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency,
        status: TransactionStatus.pending,
        provider: this.provider.kind as PaymentProviderKind,
        providerPayload: { stubListingId: input.listingId, listingTitle: input.listingTitle },
      },
    });

    const session = await this.provider.createCheckoutSession({
      transactionId: transaction.id,
      userId: buyer.id,
      userEmail: buyer.email,
      listingId: input.listingId,
      listingTitle: input.listingTitle,
      amount: input.amount,
      currency: input.currency,
      successUrl: input.successUrl ?? `${frontend}/purchases/success`,
      cancelUrl: input.cancelUrl ?? `${frontend}/purchases/cancelled`,
    });

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { providerSessionId: session.sessionId, status: TransactionStatus.processing },
    });

    return {
      transactionId: transaction.id,
      status: TransactionStatus.processing,
      sessionId: session.sessionId,
      checkoutUrl: session.checkoutUrl,
      expiresAt: session.expiresAt,
      provider: this.provider.kind,
      isLive: this.provider.isLive,
    };
  }

  async list(
    userId: string,
    query: ListTransactionsQueryDto,
  ): Promise<PaginatedResponseDto<TransactionResponseDto>> {
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.listingId ? { listingId: query.listingId } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return paginate(
      rows.map((row) => TransactionResponseDto.from(row, this.provider.isLive)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(userId: string, id: string): Promise<TransactionResponseDto> {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });
    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundException('Transaction not found.');
    }
    return TransactionResponseDto.from(transaction, this.provider.isLive);
  }

  /**
   * Applies a provider webhook to the local transaction.
   *
   * The raw body is passed through untouched because a real gateway signs the
   * exact bytes — re-serialising parsed JSON would break signature verification.
   */
  async handleWebhook(
    rawBody: string | Buffer,
    signature?: string,
  ): Promise<{ received: true; transactionId: string; status: string }> {
    const result = await this.provider.handleWebhook(rawBody, signature);

    if (result.status === 'ignored' || !result.transactionId) {
      this.logger.warn(`Webhook ignored: ${result.failureReason ?? 'no matching transaction'}`);
      return { received: true, transactionId: result.transactionId, status: 'ignored' };
    }

    const statusMap: Record<string, TransactionStatus> = {
      succeeded: TransactionStatus.succeeded,
      failed: TransactionStatus.failed,
      refunded: TransactionStatus.refunded,
      cancelled: TransactionStatus.cancelled,
    };
    const status = statusMap[result.status];

    await this.prisma.transaction.updateMany({
      where: { id: result.transactionId },
      data: {
        status,
        providerPaymentId: result.providerPaymentId ?? null,
        failureReason: result.failureReason ?? null,
        completedAt: status === TransactionStatus.succeeded ? new Date() : null,
        refundedAt: status === TransactionStatus.refunded ? new Date() : null,
        providerPayload: (result.raw ?? {}) as Prisma.InputJsonValue,
      },
    });

    // TODO: implement when payment integration is added — on `succeeded`, grant
    // the buyer access to the listing's assets. The schema for that
    // (marketplace_listing_items) already exists.

    return { received: true, transactionId: result.transactionId, status: result.status };
  }

  async refund(
    userId: string,
    transactionId: string,
    dto: RefundTransactionDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundException('Transaction not found.');
    }

    const result = await this.provider.refund({
      transactionId,
      providerPaymentId: transaction.providerPaymentId ?? '',
      amount: dto.amount ?? Number(transaction.amount),
      reason: dto.reason,
    });

    const updated = await this.prisma.transaction.update({
      where: { id: transactionId },
      data:
        result.status === 'succeeded'
          ? { status: TransactionStatus.refunded, refundedAt: new Date() }
          : { failureReason: result.failureReason ?? 'Refund did not succeed.' },
    });

    return TransactionResponseDto.from(updated, this.provider.isLive);
  }
}
