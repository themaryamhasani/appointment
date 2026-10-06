import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { paginate, paginationMeta, assertClinicAccess } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { Prisma } from '@prisma/client';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(user: AuthUser, query: { page?: number; limit?: number; search?: string; clinicId?: string }) {
    const { skip, take, page, limit } = paginate(query.page, query.limit);
    if (query.clinicId) assertClinicAccess(user, query.clinicId);

    const where: Prisma.PatientWhereInput = {};
    if (query.search) {
      where.OR = [
        { user: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { user: { phone: { contains: query.search } } },
        { nationalId: { contains: query.search } },
      ];
    }

    // Scope patients who have appointments at user's clinics
    if (!user.isSuperAdmin && query.clinicId) {
      where.appointments = { some: { clinicId: query.clinicId } };
    } else if (!user.isSuperAdmin) {
      where.appointments = { some: { clinicId: { in: user.clinicIds } } };
    }

    const [items, total] = await Promise.all([
      this.prisma.patient.findMany({
        where, skip, take,
        include: {
          user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return { items, meta: paginationMeta(total, page, limit) };
  }

  async findOne(user: AuthUser, id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
        appointments: {
          take: 10,
          orderBy: { appointmentDate: 'desc' },
          include: { doctor: { include: { user: true } }, branch: true },
        },
        medicalRecords: { take: 20, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!patient) throw new NotFoundException({ code: 'PATIENT_NOT_FOUND', message: 'Not found' });

    // Patient can view self; staff need clinic access via appointments
    if (patient.userId !== user.id && !user.isSuperAdmin) {
      const hasAccess = await this.prisma.appointment.findFirst({
        where: { patientId: id, clinicId: { in: user.clinicIds } },
      });
      if (!hasAccess) assertClinicAccess(user, user.clinicIds[0] || '');
    }

    return patient;
  }

  async update(user: AuthUser, id: string, dto: Record<string, unknown>) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException();
    if (patient.userId !== user.id && !user.isSuperAdmin) {
      // staff update
    }
    const updated = await this.prisma.patient.update({ where: { id }, data: dto });
    await this.audit.log({
      actorId: user.id, action: 'PATIENT_UPDATED', entity: 'Patient', entityId: id, after: updated,
    });
    return updated;
  }

  async getMe(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!patient) throw new NotFoundException({ code: 'PATIENT_NOT_FOUND', message: 'Patient profile not found' });
    return patient;
  }
}
