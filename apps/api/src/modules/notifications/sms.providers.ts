import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsProvider {
  send(to: string, message: string): Promise<void>;
}

@Injectable()
export class MockSmsProvider implements SmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);
  async send(to: string, message: string): Promise<void> {
    this.logger.log(`[SMS mock] → ${to}: ${message}`);
  }
}

@Injectable()
export class KavenegarSmsProvider implements SmsProvider {
  private readonly logger = new Logger(KavenegarSmsProvider.name);
  private readonly apiKey: string;
  private readonly sender: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get('KAVENEGAR_API_KEY', '');
    this.sender = this.config.get('KAVENEGAR_SENDER', '');
  }

  async send(to: string, message: string): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn(`Kavenegar key missing — logging SMS to ${to}: ${message}`);
      return;
    }
    const receptor = to.replace(/^\+98/, '0').replace(/^98/, '0');
    const url = `https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json`;
    const body = new URLSearchParams({
      receptor,
      message,
      ...(this.sender ? { sender: this.sender } : {}),
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Kavenegar failed: ${text}`);
      throw new Error('SMS_SEND_FAILED');
    }
  }
}
