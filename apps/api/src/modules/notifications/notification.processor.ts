import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<{ notificationId: string }>) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: job.data.notificationId },
      include: { user: true },
    });
    if (!notification) return;

    try {
      // Mock channel delivery — replace with real SMS/email/push providers
      this.logger.log(
        `[${notification.channel}] → ${notification.user.email || notification.user.phone}: ${notification.title}`,
      );
      await this.notifications.markSent(notification.id);
    } catch (err) {
      await this.notifications.markFailed(notification.id);
      throw err;
    }
  }
}
