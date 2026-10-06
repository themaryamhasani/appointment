export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface PaymentIntentResult {
  providerRef: string;
  redirectUrl?: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
}

export interface PaymentProvider {
  createIntent(params: {
    amount: number;
    currency: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentIntentResult>;

  verifyCallback(payload: Record<string, unknown>): Promise<{
    providerRef: string;
    status: 'PAID' | 'FAILED';
    amount?: number;
  }>;
}
