import { OtpService } from './otp.service';

describe('OtpService', () => {
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  };
  const mockSms = { send: jest.fn().mockResolvedValue(undefined) };
  const kavenegar = { send: jest.fn() };
  const config = {
    get: jest.fn((key: string, def?: string) => {
      if (key === 'SMS_PROVIDER') return 'mock';
      return def;
    }),
  };

  let service: OtpService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OtpService(redis as any, config as any, mockSms as any, kavenegar as any);
  });

  it('stores OTP with TTL and sends SMS', async () => {
    redis.incr.mockResolvedValue(1);
    const result = await service.request('+989121234567', 'login');
    expect(redis.set).toHaveBeenCalled();
    expect(mockSms.send).toHaveBeenCalled();
    expect(result).toEqual({ sent: true });
  });

  it('verifies matching code', async () => {
    redis.get.mockResolvedValue('123456');
    const ok = await service.verify('+989121234567', 'login', '123456');
    expect(ok).toBe(true);
    expect(redis.del).toHaveBeenCalled();
  });

  it('rejects invalid code', async () => {
    redis.get.mockResolvedValue('111111');
    await expect(service.verify('+989121234567', 'login', '000000')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_OTP' }),
    });
  });
});
