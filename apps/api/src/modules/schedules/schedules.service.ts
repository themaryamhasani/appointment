import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AvailabilityService } from './availability.service';
import { assertClinicAccess } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { DayOfWeek } from '@prisma/client';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly availability: AvailabilityService,
  ) {}

  async create(
    user: AuthUser,
    dto: {
      doctorId: string;
      branchId: string;
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      slotDurationMinutes?: number;
      breakDurationMinutes?: number;
      bufferMinutes?: number;
      isActive?: boolean;
    },
  ) {
    const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } });
    if (!branch) throw new NotFoundException({ code: 'BRANCH_NOT_FOUND', message: 'Branch not found' });
    assertClinicAccess(user, branch.clinicId);

    const schedule = await this.prisma.doctorSchedule.create({
      data: {
        doctorId: dto.doctorId,
        branchId: dto.branchId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        slotDurationMinutes: dto.slotDurationMinutes ?? 20,
        breakDurationMinutes: dto.breakDurationMinutes ?? 0,
        bufferMinutes: dto.bufferMinutes ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.availability.invalidateCache(dto.doctorId, dto.branchId);
    await this.audit.log({
      actorId: user.id,
      clinicId: branch.clinicId,
      action: 'SCHEDULE_CREATED',
      entity: 'DoctorSchedule',
      entityId: schedule.id,
      after: schedule,
    });

    return schedule;
  }

  async findByDoctor(doctorId: string, branchId?: string) {
    return this.prisma.doctorSchedule.findMany({
      where: {
        doctorId,
        ...(branchId ? { branchId } : {}),
        isActive: true,
      },
      include: { branch: { include: { clinic: true } } },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async update(user: AuthUser, id: string, dto: Partial<{
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    breakDurationMinutes: number;
    bufferMinutes: number;
    isActive: boolean;
  }>) {
    const existing = await this.prisma.doctorSchedule.findUnique({
      where: { id },
      include: { branch: true },
    });
    if (!existing) throw new NotFoundException({ code: 'SCHEDULE_NOT_FOUND', message: 'Schedule not found' });
    assertClinicAccess(user, existing.branch.clinicId);

    const updated = await this.prisma.doctorSchedule.update({
      where: { id },
      data: dto,
    });

    await this.availability.invalidateCache(existing.doctorId, existing.branchId);
    await this.audit.log({
      actorId: user.id,
      clinicId: existing.branch.clinicId,
      action: 'SCHEDULE_UPDATED',
      entity: 'DoctorSchedule',
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async createException(
    user: AuthUser,
    dto: {
      doctorId?: string;
      branchId?: string;
      type: 'LEAVE' | 'HOLIDAY' | 'OVERRIDE' | 'BLOCKED' | 'EMERGENCY';
      date: string;
      startTime?: string;
      endTime?: string;
      reason?: string;
      isAllDay?: boolean;
    },
  ) {
    let clinicId: string | undefined;
    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } });
      if (!branch) throw new NotFoundException();
      clinicId = branch.clinicId;
      assertClinicAccess(user, clinicId);
    }

    const exception = await this.prisma.scheduleException.create({
      data: {
        doctorId: dto.doctorId,
        branchId: dto.branchId,
        type: dto.type,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        reason: dto.reason,
        isAllDay: dto.isAllDay ?? false,
      },
    });

    if (dto.doctorId && dto.branchId) {
      await this.availability.invalidateCache(dto.doctorId, dto.branchId);
    }

    await this.audit.log({
      actorId: user.id,
      clinicId,
      action: 'SCHEDULE_EXCEPTION_CREATED',
      entity: 'ScheduleException',
      entityId: exception.id,
      after: exception,
    });

    return exception;
  }
}
