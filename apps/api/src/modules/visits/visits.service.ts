import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppointmentStateMachine } from '../appointments/appointment-state-machine';
import { assertClinicAccess } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { AppException } from '../../common/exceptions/app.exception';

@Injectable()
export class VisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly stateMachine: AppointmentStateMachine,
  ) {}

  async start(user: AuthUser, appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) throw new NotFoundException();
    assertClinicAccess(user, appointment.clinicId);

    // Transition to IN_PROGRESS if needed
    if (appointment.status === AppointmentStatus.CHECKED_IN) {
      this.stateMachine.assertTransition(appointment.status, AppointmentStatus.IN_PROGRESS);
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.IN_PROGRESS },
      });
      await this.prisma.appointmentStatusHistory.create({
        data: {
          appointmentId,
          fromStatus: AppointmentStatus.CHECKED_IN,
          toStatus: AppointmentStatus.IN_PROGRESS,
          changedById: user.id,
        },
      });
    } else if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new AppException('INVALID_STATUS', 'Appointment must be checked in to start visit');
    }

    const visit = await this.prisma.visit.upsert({
      where: { appointmentId },
      create: {
        appointmentId,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
        startedAt: new Date(),
        meetingUrl:
          appointment.visitType === 'TELEHEALTH'
            ? `https://meet.healthcare.local/${appointmentId}`
            : undefined,
      },
      update: {
        startedAt: new Date(),
        meetingUrl:
          appointment.visitType === 'TELEHEALTH'
            ? `https://meet.healthcare.local/${appointmentId}`
            : undefined,
      },
    });

    await this.audit.log({
      actorId: user.id,
      clinicId: appointment.clinicId,
      action: 'VISIT_STARTED',
      entity: 'Visit',
      entityId: visit.id,
    });

    return visit;
  }

  async update(user: AuthUser, id: string, dto: {
    chiefComplaint?: string;
    symptoms?: string;
    doctorNotes?: string;
    diagnosis?: string;
    requestedTests?: string;
    followUpDate?: string;
    meetingUrl?: string;
  }) {
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: { appointment: true },
    });
    if (!visit) throw new NotFoundException();
    assertClinicAccess(user, visit.appointment.clinicId);

    return this.prisma.visit.update({
      where: { id },
      data: {
        ...dto,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
      },
    });
  }

  async complete(user: AuthUser, id: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: { appointment: true },
    });
    if (!visit) throw new NotFoundException();
    assertClinicAccess(user, visit.appointment.clinicId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const v = await tx.visit.update({
        where: { id },
        data: { completedAt: new Date() },
      });

      await tx.appointment.update({
        where: { id: visit.appointmentId },
        data: { status: AppointmentStatus.COMPLETED },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: visit.appointmentId,
          fromStatus: visit.appointment.status,
          toStatus: AppointmentStatus.COMPLETED,
          changedById: user.id,
        },
      });

      if (visit.diagnosis || visit.doctorNotes) {
        await tx.medicalRecord.create({
          data: {
            patientId: visit.patientId,
            visitId: visit.id,
            title: 'Visit Record',
            content: [visit.chiefComplaint, visit.diagnosis, visit.doctorNotes]
              .filter(Boolean)
              .join('\n\n'),
            recordType: 'VISIT',
          },
        });
      }

      return v;
    });

    await this.audit.log({
      actorId: user.id,
      clinicId: visit.appointment.clinicId,
      action: 'VISIT_COMPLETED',
      entity: 'Visit',
      entityId: id,
    });

    return updated;
  }

  async findOne(user: AuthUser, id: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: {
        appointment: true,
        prescription: { include: { items: true } },
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });
    if (!visit) throw new NotFoundException();
    assertClinicAccess(user, visit.appointment.clinicId);
    return visit;
  }
}
