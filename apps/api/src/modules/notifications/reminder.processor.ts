import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Processor('appointment-reminders')
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<{ appointmentId: string; userId: string; clinicId: string; hoursBefore: number }>) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: job.data.appointmentId },
      include: { patient: true },
    });
    if (!appt) return;
    const remindable: AppointmentStatus[] = [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING];
    if (!remindable.includes(appt.status)) return;

    this.logger.log(`Sending ${job.data.hoursBefore}h reminder for ${appt.id}`);
    await this.notifications.enqueue({
      type: 'AppointmentReminder',
      userId: job.data.userId,
      clinicId: job.data.clinicId,
      title: 'Appointment Reminder',
      body: `Reminder: your appointment is in ${job.data.hoursBefore} hours (${String(appt.appointmentDate).slice(0, 10)} ${appt.startTime}).`,
      data: { appointmentId: appt.id, hoursBefore: job.data.hoursBefore },
      channels: ['IN_APP', 'SMS', 'EMAIL'] as any,
    });
  }
}
