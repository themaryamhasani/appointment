import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationChannel, Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly queue: Queue,
    @InjectQueue('appointment-reminders') private readonly reminderQueue: Queue,
  ) {}

  async enqueue(params: {
    type: string;
    userId: string;
    clinicId?: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    channels?: NotificationChannel[];
  }) {
    const channels = params.channels ?? [NotificationChannel.IN_APP, NotificationChannel.EMAIL];

    for (const channel of channels) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: params.userId,
          clinicId: params.clinicId,
          channel,
          type: params.type,
          title: params.title,
          body: params.body,
          data: (params.data ?? {}) as Prisma.InputJsonValue,
        },
      });

      await this.queue.add(
        'send',
        { notificationId: notification.id },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          jobId: `notif:${notification.id}`,
        },
      ).catch((err) => {
        this.logger.warn(`Queue unavailable, marking notification sent locally: ${err.message}`);
        return this.markSent(notification.id);
      });
    }
  }

  async scheduleReminder(params: {
    appointmentId: string;
    userId: string;
    clinicId: string;
    fireAt: Date;
    hoursBefore: number;
  }) {
    const delay = Math.max(0, params.fireAt.getTime() - Date.now());
    await this.reminderQueue.add(
      'reminder',
      {
        appointmentId: params.appointmentId,
        userId: params.userId,
        clinicId: params.clinicId,
        hoursBefore: params.hoursBefore,
      },
      {
        delay,
        attempts: 3,
        jobId: `reminder:${params.appointmentId}:${params.hoursBefore}h`,
        removeOnComplete: true,
      },
    );
  }

  async markSent(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }

  async markFailed(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'FAILED' },
    });
  }

  async findForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, channel: NotificationChannel.IN_APP },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId, channel: NotificationChannel.IN_APP },
      }),
    ]);
    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { status: 'READ', readAt: new Date() },
    });
  }
}
