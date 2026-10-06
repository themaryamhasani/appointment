import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationProcessor } from './notification.processor';
import { ReminderProcessor } from './reminder.processor';
import { OtpService } from './otp.service';
import { KavenegarSmsProvider, MockSmsProvider } from './sms.providers';
import { EmailService } from './email.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'notifications' }),
    BullModule.registerQueue({ name: 'appointment-reminders' }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationProcessor,
    ReminderProcessor,
    OtpService,
    MockSmsProvider,
    KavenegarSmsProvider,
    EmailService,
  ],
  exports: [NotificationsService, OtpService, EmailService],
})
export class NotificationsModule {}
