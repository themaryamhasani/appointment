import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  PaymentProvider,
  PaymentIntentResult,
} from './payment-provider.interface';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  async createIntent(params: {
    amount: number;
    currency: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentIntentResult> {
    const providerRef = `mock_${randomUUID()}`;
    return {
      providerRef,
      redirectUrl: `/payments/mock-checkout?ref=${providerRef}&key=${params.idempotencyKey}`,
      status: 'PENDING',
    };
  }

  async verifyCallback(payload: Record<string, unknown>) {
    const status = payload.status === 'FAILED' ? 'FAILED' : 'PAID';
    return {
      providerRef: String(payload.providerRef || payload.ref),
      status: status as 'PAID' | 'FAILED',
      amount: payload.amount ? Number(payload.amount) : undefined,
    };
  }
}
