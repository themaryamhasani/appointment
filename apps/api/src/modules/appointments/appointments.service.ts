import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../schedules/availability.service';
import { AppointmentStateMachine } from './appointment-state-machine';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  SlotUnavailableException,
  AppException,
} from '../../common/exceptions/app.exception';
import {
  assertClinicAccess,
  paginate,
  paginationMeta,
  parseDateOnly,
} from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly stateMachine: AppointmentStateMachine,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(
    user: AuthUser,
    dto: {
      doctorId: string;
      branchId: string;
      patientId?: string;
      appointmentDate: string;
      startTime: string;
      visitType?: 'IN_PERSON' | 'TELEHEALTH';
      notes?: string;
      specialtyId?: string;
    },
  ) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      include: { clinic: true },
    });
    if (!branch) throw new NotFoundException({ code: 'BRANCH_NOT_FOUND', message: 'Branch not found' });

    const doctor = await this.prisma.doctor.findUnique({ where: { id: dto.doctorId } });
    if (!doctor || !doctor.isActive) {
      throw new NotFoundException({ code: 'DOCTOR_NOT_FOUND', message: 'Doctor not found' });
    }

    // Resolve patient
    let patientId = dto.patientId;
    if (!patientId) {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
      if (!patient) throw new AppException('PATIENT_REQUIRED', 'Patient profile required');
      patientId = patient.id;
    } else {
      assertClinicAccess(user, branch.clinicId);
    }

    const date = parseDateOnly(dto.appointmentDate);

    // Validate slot is available
    const days = await this.availability.getAvailability({
      doctorId: dto.doctorId,
      branchId: dto.branchId,
      from: dto.appointmentDate,
      to: dto.appointmentDate,
    });
    const day = days[0];
    const slot = day?.slots.find((s) => s.startTime === dto.startTime && s.available);
    if (!slot) throw new SlotUnavailableException({ date: dto.appointmentDate, time: dto.startTime });

    // Check Redis reservation — allow if owned by current user or none
    const reservedBy = await this.availability.getReservationOwner(
      dto.doctorId,
      dto.branchId,
      dto.appointmentDate,
      dto.startTime,
    );
    if (reservedBy && reservedBy !== user.id) {
      throw new SlotUnavailableException({ reason: 'reserved_by_another' });
    }

    const endTime = slot.endTime;
    const fee = doctor.consultationFee;

    try {
      const appointment = await this.prisma.$transaction(
        async (tx) => {
          const created = await tx.appointment.create({
            data: {
              clinicId: branch.clinicId,
              branchId: dto.branchId,
              doctorId: dto.doctorId,
              patientId,
              specialtyId: dto.specialtyId,
              appointmentDate: date,
              startTime: dto.startTime,
              endTime,
              status: AppointmentStatus.PENDING,
              visitType: dto.visitType ?? 'IN_PERSON',
              notes: dto.notes,
              fee,
              currency: doctor.currency,
            },
            include: {
              doctor: { include: { user: true } },
              patient: { include: { user: true } },
              branch: true,
              clinic: true,
            },
          });

          await tx.appointmentStatusHistory.create({
            data: {
              appointmentId: created.id,
              fromStatus: null,
              toStatus: AppointmentStatus.PENDING,
              changedById: user.id,
            },
          });

          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      await this.availability.releaseSlot(
        dto.doctorId,
        dto.branchId,
        dto.appointmentDate,
        dto.startTime,
      );
      await this.availability.invalidateCache(dto.doctorId, dto.branchId);

      await this.audit.log({
        actorId: user.id,
        clinicId: branch.clinicId,
        action: 'APPOINTMENT_CREATED',
        entity: 'Appointment',
        entityId: appointment.id,
        after: { id: appointment.id, status: appointment.status },
      });

      await this.notifications.enqueue({
        type: 'AppointmentCreated',
        userId: appointment.patient.userId,
        clinicId: branch.clinicId,
        title: 'Appointment Created',
        body: `Your appointment on ${dto.appointmentDate} at ${dto.startTime} has been created.`,
        data: { appointmentId: appointment.id },
      });

      // Schedule reminders (24h / 2h) based on clinic settings
      try {
        const clinic = branch.clinic;
        const settings = (clinic.settings || {}) as { reminderHours?: number[] };
        const hours = settings.reminderHours?.length ? settings.reminderHours : [24, 2];
        const [y, m, d] = dto.appointmentDate.split('-').map(Number);
        const [hh, mm] = dto.startTime.split(':').map(Number);
        const apptAt = new Date(Date.UTC(y, m - 1, d, hh, mm));
        for (const h of hours) {
          const fireAt = new Date(apptAt.getTime() - h * 60 * 60 * 1000);
          if (fireAt.getTime() > Date.now()) {
            await this.notifications.scheduleReminder({
              appointmentId: appointment.id,
              userId: appointment.patient.userId,
              clinicId: branch.clinicId,
              fireAt,
              hoursBefore: h,
            });
          }
        }
      } catch {
        /* reminder scheduling best-effort */
      }

      return appointment;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new SlotUnavailableException({ reason: 'unique_constraint' });
      }
      throw error;
    }
  }

  async findAll(
    user: AuthUser,
    query: {
      page?: number;
      limit?: number;
      clinicId?: string;
      branchId?: string;
      doctorId?: string;
      patientId?: string;
      status?: AppointmentStatus;
      from?: string;
      to?: string;
    },
  ) {
    const { skip, take, page, limit } = paginate(query.page, query.limit);
    const where: Prisma.AppointmentWhereInput = {};

    if (query.clinicId) {
      assertClinicAccess(user, query.clinicId);
      where.clinicId = query.clinicId;
    } else if (!user.isSuperAdmin && !user.roles.includes('PATIENT')) {
      where.clinicId = { in: user.clinicIds };
    }

    if (user.roles.includes('PATIENT') && !user.isSuperAdmin) {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
      if (patient) where.patientId = patient.id;
    }

    if (query.branchId) where.branchId = query.branchId;
    if (query.doctorId) where.doctorId = query.doctorId;
    if (query.patientId) where.patientId = query.patientId;
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.appointmentDate = {};
      if (query.from) where.appointmentDate.gte = parseDateOnly(query.from);
      if (query.to) where.appointmentDate.lte = parseDateOnly(query.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take,
        orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
        include: {
          doctor: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
          patient: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
          branch: true,
          clinic: true,
          specialty: true,
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { items, meta: paginationMeta(total, page, limit) };
  }

  async findOne(user: AuthUser, id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        doctor: { include: { user: true, specialties: { include: { specialty: true } } } },
        patient: { include: { user: true } },
        branch: true,
        clinic: true,
        specialty: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        visit: { include: { prescription: { include: { items: true } } } },
        payments: true,
      },
    });
    if (!appointment) throw new NotFoundException({ code: 'APPOINTMENT_NOT_FOUND', message: 'Not found' });

    if (!user.isSuperAdmin) {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
      const isOwner = patient?.id === appointment.patientId;
      const isClinicStaff = user.clinicIds.includes(appointment.clinicId);
      if (!isOwner && !isClinicStaff) {
        assertClinicAccess(user, appointment.clinicId);
      }
    }

    return appointment;
  }

  async transition(
    user: AuthUser,
    id: string,
    toStatus: AppointmentStatus,
    reason?: string,
  ) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException({ code: 'APPOINTMENT_NOT_FOUND', message: 'Not found' });
    assertClinicAccess(user, appointment.clinicId);

    this.stateMachine.assertTransition(appointment.status, toStatus);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.appointment.update({
        where: { id },
        data: {
          status: toStatus,
          ...(toStatus === AppointmentStatus.CANCELLED
            ? { cancelReason: reason, cancelledAt: new Date(), cancelledById: user.id }
            : {}),
          ...(toStatus === AppointmentStatus.CHECKED_IN ? { checkedInAt: new Date() } : {}),
        },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus,
          changedById: user.id,
          reason,
        },
      });

      return result;
    });

    await this.availability.invalidateCache(appointment.doctorId, appointment.branchId);

    await this.audit.log({
      actorId: user.id,
      clinicId: appointment.clinicId,
      action: `APPOINTMENT_${toStatus}`,
      entity: 'Appointment',
      entityId: id,
      before: { status: appointment.status },
      after: { status: toStatus },
    });

    return updated;
  }

  async cancel(user: AuthUser, id: string, reason: string) {
    const appointment = await this.findOne(user, id);

    // Patients can cancel their own confirmed/pending appointments
    const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
    const isOwner = patient?.id === appointment.patientId;

    if (!isOwner && !user.isSuperAdmin) {
      assertClinicAccess(user, appointment.clinicId);
    }

    // Business rule: cannot cancel completed/in-progress without staff
    const lockedStatuses: AppointmentStatus[] = [
      AppointmentStatus.COMPLETED,
      AppointmentStatus.IN_PROGRESS,
    ];
    if (
      lockedStatuses.includes(appointment.status) &&
      isOwner &&
      !user.clinicIds.includes(appointment.clinicId)
    ) {
      throw new AppException('CANNOT_CANCEL', 'This appointment cannot be cancelled by the patient.');
    }

    return this.transition(user, id, AppointmentStatus.CANCELLED, reason);
  }

  async checkIn(user: AuthUser, id: string) {
    return this.transition(user, id, AppointmentStatus.CHECKED_IN);
  }

  async confirm(user: AuthUser, id: string) {
    return this.transition(user, id, AppointmentStatus.CONFIRMED);
  }

  async reschedule(
    user: AuthUser,
    id: string,
    dto: { appointmentDate: string; startTime: string; branchId?: string },
  ) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException({ code: 'APPOINTMENT_NOT_FOUND', message: 'Not found' });
    assertClinicAccess(user, appointment.clinicId);

    const reschedulable: AppointmentStatus[] = [
      AppointmentStatus.PENDING,
      AppointmentStatus.CONFIRMED,
    ];
    if (!reschedulable.includes(appointment.status)) {
      throw new AppException('CANNOT_RESCHEDULE', 'Only pending/confirmed appointments can be rescheduled');
    }

    const branchId = dto.branchId || appointment.branchId;
    const date = parseDateOnly(dto.appointmentDate);

    const days = await this.availability.getAvailability({
      doctorId: appointment.doctorId,
      branchId,
      from: dto.appointmentDate,
      to: dto.appointmentDate,
    });
    const slot = days[0]?.slots.find((s) => s.startTime === dto.startTime && s.available);
    if (!slot) throw new SlotUnavailableException({ date: dto.appointmentDate, time: dto.startTime });

    try {
      const updated = await this.prisma.$transaction(
        async (tx) => {
          const result = await tx.appointment.update({
            where: { id },
            data: {
              branchId,
              appointmentDate: date,
              startTime: dto.startTime,
              endTime: slot.endTime,
            },
          });
          await tx.appointmentStatusHistory.create({
            data: {
              appointmentId: id,
              fromStatus: appointment.status,
              toStatus: appointment.status,
              changedById: user.id,
              reason: `Rescheduled to ${dto.appointmentDate} ${dto.startTime}`,
            },
          });
          return result;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      await this.availability.invalidateCache(appointment.doctorId, appointment.branchId);
      await this.availability.invalidateCache(appointment.doctorId, branchId);
      await this.audit.log({
        actorId: user.id,
        clinicId: appointment.clinicId,
        action: 'APPOINTMENT_RESCHEDULED',
        entity: 'Appointment',
        entityId: id,
        before: {
          date: appointment.appointmentDate,
          startTime: appointment.startTime,
        },
        after: { date: dto.appointmentDate, startTime: dto.startTime },
      });
      return updated;
    } catch (error: any) {
      if (error?.code === 'P2002') throw new SlotUnavailableException({ reason: 'unique_constraint' });
      throw error;
    }
  }

  async markNoShow(user: AuthUser, id: string) {
    return this.transition(user, id, AppointmentStatus.NO_SHOW);
  }
}
