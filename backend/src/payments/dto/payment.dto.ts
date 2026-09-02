import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProviderKind, TransactionStatus, type Transaction } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const TRANSACTION_SORT_FIELDS = ['createdAt', 'amount', 'status'] as const;

export class ListTransactionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TRANSACTION_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(TRANSACTION_SORT_FIELDS)
  sortBy: (typeof TRANSACTION_SORT_FIELDS)[number] = 'createdAt';

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  listingId?: string;
}

export class TransactionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) listingId!: string | null;
  @ApiProperty({ example: 29.0 }) amount!: number;
  @ApiProperty({ example: 'USD' }) currency!: string;
  @ApiProperty({ enum: TransactionStatus }) status!: TransactionStatus;
  @ApiProperty({ enum: PaymentProviderKind }) provider!: PaymentProviderKind;
  @ApiPropertyOptional({ nullable: true }) providerSessionId!: string | null;
  @ApiPropertyOptional({ nullable: true }) providerPaymentId!: string | null;
  @ApiPropertyOptional({ nullable: true }) failureReason!: string | null;
  @ApiPropertyOptional({ nullable: true }) completedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) refundedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  @ApiProperty({
    example: false,
    description: 'False in this build — no real payment gateway processed this transaction.',
  })
  isLive!: boolean;

  static from(transaction: Transaction, isLive: boolean): TransactionResponseDto {
    return {
      id: transaction.id,
      userId: transaction.userId,
      listingId: transaction.listingId,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      status: transaction.status,
      provider: transaction.provider,
      providerSessionId: transaction.providerSessionId,
      providerPaymentId: transaction.providerPaymentId,
      failureReason: transaction.failureReason,
      completedAt: transaction.completedAt,
      refundedAt: transaction.refundedAt,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      isLive,
    };
  }
}

export class RefundTransactionDto {
  @ApiPropertyOptional({
    minimum: 0,
    description: 'Partial refund amount. Omit to refund in full.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  reason?: string;
}

export class PaymentStatusDto {
  @ApiProperty({ enum: PaymentProviderKind, example: 'mock' })
  provider!: PaymentProviderKind;

  @ApiProperty({
    example: false,
    description: 'Whether the bound provider can process real payments. False in this build.',
  })
  isLive!: boolean;

  @ApiProperty({
    example: 'Payments are stubbed. No gateway is integrated and no money moves.',
  })
  message!: string;
}
