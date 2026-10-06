import { PaymentsService } from './payments.service';
import { PaymentStatus } from '@prisma/client';

describe('PaymentsService webhook idempotency', () => {
  const prisma = {
    payment: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const audit = { log: jest.fn() };
  const notifications = { enqueue: jest.fn() };
  const config = { get: jest.fn() };
  const provider = {
    verifyCallback: jest.fn(),
    createIntent: jest.fn(),
  };

  let service: PaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentsService(
      prisma as any,
      audit as any,
      notifications as any,
      config as any,
      provider as any,
    );
  });

  it('returns existing PAID payment without double-processing', async () => {
    const paid = {
      id: 'pay1',
      status: PaymentStatus.PAID,
      appointmentId: 'a1',
      clinicId: 'c1',
      amount: 100,
      idempotencyKey: 'key1',
    };
    prisma.payment.findFirst.mockResolvedValue(paid);
    provider.verifyCallback.mockResolvedValue({
      status: 'PAID',
      providerRef: 'auth1',
      amount: 100,
    });

    const result = await service.handleWebhook({
      Authority: 'auth1',
      Status: 'OK',
      idempotencyKey: 'key1',
    });

    expect(result.status).toBe(PaymentStatus.PAID);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
