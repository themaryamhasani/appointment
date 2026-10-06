import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async send(to: string, subject: string, body: string): Promise<void> {
    const host = this.config.get('SMTP_HOST');
    // Real SMTP can be wired with nodemailer; for now structured log + optional fetch to mailhog-like endpoint
    this.logger.log(`[EMAIL] to=${to} subject=${subject} host=${host} body=${body.slice(0, 120)}`);
  }
}
