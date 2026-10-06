import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentProvider,
  PaymentIntentResult,
} from './payment-provider.interface';

@Injectable()
export class ZarinpalPaymentProvider implements PaymentProvider {
  private readonly merchantId: string;
  private readonly sandbox: boolean;
  private readonly callbackUrl: string;

  constructor(private readonly config: ConfigService) {
    this.merchantId = this.config.get('ZARINPAL_MERCHANT_ID', '');
    this.sandbox = this.config.get('ZARINPAL_SANDBOX', 'true') === 'true';
    this.callbackUrl = this.config.get(
      'PAYMENT_CALLBACK_URL',
      'http://localhost:4000/api/v1/payments/webhook',
    );
  }

  private get baseUrl() {
    return this.sandbox
      ? 'https://sandbox.zarinpal.com/pg/v4/payment'
      : 'https://api.zarinpal.com/pg/v4/payment';
  }

  private get startPayUrl() {
    return this.sandbox
      ? 'https://sandbox.zarinpal.com/pg/StartPay'
      : 'https://www.zarinpal.com/pg/StartPay';
  }

  async createIntent(params: {
    amount: number;
    currency: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentIntentResult> {
    if (!this.merchantId) {
      // Fallback behavior when merchant not configured: treat as pending mock-like redirect
      return {
        providerRef: `zp_pending_${params.idempotencyKey}`,
        redirectUrl: `${this.startPayUrl}/demo`,
        status: 'PENDING',
      };
    }

    const amountToman = Math.round(params.amount);
    const res = await fetch(`${this.baseUrl}/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount: amountToman,
        callback_url: `${this.callbackUrl}?idempotencyKey=${encodeURIComponent(params.idempotencyKey)}`,
        description: `Appointment payment ${params.metadata?.appointmentId || ''}`,
        metadata: params.metadata || {},
      }),
    });
    const json = (await res.json()) as any;
    const authority = json?.data?.authority;
    if (!authority) {
      return {
        providerRef: `zp_failed_${params.idempotencyKey}`,
        status: 'FAILED',
      };
    }
    return {
      providerRef: authority,
      redirectUrl: `${this.startPayUrl}/${authority}`,
      status: 'PENDING',
    };
  }

  async verifyCallback(payload: Record<string, unknown>) {
    const authority = String(payload.Authority || payload.authority || payload.providerRef || '');
    const status = String(payload.Status || payload.status || '');
    if (status === 'NOK' || status === 'FAILED') {
      return { providerRef: authority, status: 'FAILED' as const };
    }

    if (!this.merchantId) {
      return { providerRef: authority, status: 'PAID' as const };
    }

    const amount = payload.amount ? Number(payload.amount) : undefined;
    const res = await fetch(`${this.baseUrl}/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount,
        authority,
      }),
    });
    const json = (await res.json()) as any;
    const code = json?.data?.code;
    const paid = code === 100 || code === 101;
    return {
      providerRef: authority,
      status: paid ? ('PAID' as const) : ('FAILED' as const),
      amount,
    };
  }
}
