import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import {
  ListTransactionsQueryDto,
  PaymentStatusDto,
  RefundTransactionDto,
  TransactionResponseDto,
} from './dto/payment.dto';
import { PaymentsService } from './payments.service';

/**
 * STUB MODULE. No real gateway is integrated — see `PaymentsService`.
 * The routes and DTOs are final and wired through the `PaymentProvider`
 * interface, so a real provider is a one-file change.
 */
@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Get('status')
  @ApiOperation({
    summary: 'Which payment provider is bound, and whether it is live.',
    description: 'Public so a frontend can hide or label purchase UI before anyone signs in.',
  })
  @ApiOkResponse({ type: PaymentStatusDto })
  status(): PaymentStatusDto {
    return this.payments.status();
  }

  @Get('transactions')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'The authenticated user’s transactions.',
    description:
      'These are real database rows. They record purchase attempts made through the stubbed provider, so `isLive` is false on every one.',
  })
  @ApiPaginatedResponse(TransactionResponseDto)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTransactionsQueryDto,
  ): Promise<PaginatedResponseDto<TransactionResponseDto>> {
    return this.payments.list(user.id, query);
  }

  @Get('transactions/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Fetch one transaction.' })
  @ApiOkResponse({ type: TransactionResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionResponseDto> {
    return this.payments.findOne(user.id, id);
  }

  @Post('transactions/:id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '[STUB] Refund a transaction.',
    description:
      'Goes through PaymentProvider.refund(). With MockPaymentProvider bound this always reports success and moves no money.',
  })
  @ApiOkResponse({ type: TransactionResponseDto })
  async refund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundTransactionDto,
  ): Promise<TransactionResponseDto> {
    return this.payments.refund(user.id, id, dto);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[STUB] Payment provider webhook.',
    description:
      'Public, because the gateway calls it — authentication is by signature, not by token. A real provider MUST verify the signature over the raw body before trusting the event.',
  })
  @ApiOkResponse({
    schema: { example: { received: true, transactionId: '…', status: 'succeeded' } },
  })
  async webhook(
    @Req() request: Request,
    @Headers('x-signature') signature?: string,
  ): Promise<{ received: true; transactionId: string; status: string }> {
    // `rawBody` is preferred when available: gateways sign the exact bytes, and
    // re-serialising parsed JSON would break signature verification.
    const raw = (request as Request & { rawBody?: Buffer }).rawBody ?? JSON.stringify(request.body);
    return this.payments.handleWebhook(raw, signature);
  }

  @Public()
  @Get('mock-checkout/:sessionId')
  @ApiExcludeEndpoint()
  mockCheckout(@Param('sessionId') sessionId: string) {
    // Where MockPaymentProvider's checkoutUrl points. It exists so the URL in a
    // purchase response resolves to something self-explanatory rather than 404.
    return {
      sessionId,
      message:
        'This is a placeholder checkout page. No payment gateway is integrated in this build and no money can be taken.',
      howToComplete:
        'POST /api/v1/payments/webhook with { "transactionId": "<id>", "status": "succeeded" } to simulate payment completion.',
    };
  }
}
