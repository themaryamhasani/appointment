import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MockPaymentProvider } from './providers/mock.provider';
import { ZarinpalPaymentProvider } from './providers/zarinpal.provider';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    MockPaymentProvider,
    ZarinpalPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, MockPaymentProvider, ZarinpalPaymentProvider],
      useFactory: (
        config: ConfigService,
        mock: MockPaymentProvider,
        zarinpal: ZarinpalPaymentProvider,
      ) => {
        const provider = config.get('PAYMENT_PROVIDER', 'mock');
        return provider === 'zarinpal' ? zarinpal : mock;
      },
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
