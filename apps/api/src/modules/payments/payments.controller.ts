import { Controller, Get, Post, Body, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { Public, RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.PAYMENT_MANAGE)
  @ApiOperation({ summary: 'Create payment intent for appointment' })
  create(@CurrentUser() user: AuthUser, @Body() body: { appointmentId: string }) {
    return this.payments.createIntent(user, body.appointmentId);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Payment gateway webhook (idempotent)' })
  webhook(@Body() payload: Record<string, unknown>) {
    return this.payments.handleWebhook(payload);
  }

  @Public()
  @Get('callback')
  @ApiOperation({ summary: 'Zarinpal return callback' })
  async callback(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const result = await this.payments.handleWebhook({
      Authority: query.Authority,
      Status: query.Status,
      authority: query.Authority,
      status: query.Status,
      idempotencyKey: query.idempotencyKey,
      providerRef: query.Authority,
      amount: query.amount ? Number(query.amount) : undefined,
    });
    const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
    const ok = result.status === 'PAID';
    return res.redirect(
      `${appUrl}/fa/payments/result?status=${ok ? 'success' : 'failed'}&paymentId=${result.id}`,
    );
  }

  @Get()
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.PAYMENT_READ)
  findAll(@CurrentUser() user: AuthUser, @Query() query: any) {
    return this.payments.findAll(user, query);
  }

  @Post(':id/refund')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.PAYMENT_MANAGE)
  refund(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { amount?: number; reason?: string },
  ) {
    return this.payments.refund(user, id, body.amount || 0, body.reason);
  }

  @Post('invoices')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.PAYMENT_MANAGE)
  invoice(@CurrentUser() user: AuthUser, @Body() body: { appointmentId: string }) {
    return this.payments.createInvoice(user, body.appointmentId);
  }
}
