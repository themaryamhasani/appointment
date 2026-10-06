import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { KavenegarSmsProvider, MockSmsProvider, SmsProvider } from './sms.providers';
import { AppException } from '../../common/exceptions/app.exception';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly sms: SmsProvider;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    mockSms: MockSmsProvider,
    kavenegar: KavenegarSmsProvider,
  ) {
    this.sms =
      this.config.get('SMS_PROVIDER', 'mock') === 'kavenegar' ? kavenegar : mockSms;
  }

  private key(purpose: string, phone: string) {
    return `otp:${purpose}:${phone}`;
  }

  private rateKey(purpose: string, phone: string) {
    return `otp_rate:${purpose}:${phone}`;
  }

  async request(phone: string, purpose: 'login' | 'verify' | 'reset'): Promise<{ sent: boolean }> {
    const rate = await this.redis.incr(this.rateKey(purpose, phone));
    if (rate === 1) await this.redis.expire(this.rateKey(purpose, phone), 60);
    if (rate > 3) {
      throw new AppException('OTP_RATE_LIMITED', 'Too many OTP requests. Try again later.', 429 as any);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.redis.set(this.key(purpose, phone), code, 300);
    await this.sms.send(phone, `کد تأیید مدی‌کلینیک: ${code}`);
    this.logger.log(`OTP generated for ${phone} purpose=${purpose}`);
    return { sent: true };
  }

  async verify(phone: string, purpose: string, code: string): Promise<boolean> {
    const stored = await this.redis.get(this.key(purpose, phone));
    if (!stored || stored !== code) {
      throw new AppException('INVALID_OTP', 'Invalid or expired OTP code');
    }
    await this.redis.del(this.key(purpose, phone));
    return true;
  }
}
