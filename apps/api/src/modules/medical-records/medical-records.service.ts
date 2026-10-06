import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { assertClinicAccess, paginate, paginationMeta } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class MedicalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForPatient(user: AuthUser, patientId?: string) {
    let pid = patientId;
    if (!pid) {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
      if (!patient) throw new NotFoundException({ code: 'PATIENT_NOT_FOUND', message: 'Not found' });
      pid = patient.id;
    } else if (!user.isSuperAdmin) {
      const patient = await this.prisma.patient.findUnique({ where: { id: pid } });
      if (!patient) throw new NotFoundException();
      if (patient.userId !== user.id) {
        const hasAccess = await this.prisma.appointment.findFirst({
          where: { patientId: pid, clinicId: { in: user.clinicIds } },
        });
        if (!hasAccess) assertClinicAccess(user, user.clinicIds[0] || '');
      }
    }

    return this.prisma.medicalRecord.findMany({
      where: { patientId: pid },
      orderBy: { createdAt: 'desc' },
      include: {
        visit: {
          include: {
            doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    });
  }

  async findAll(user: AuthUser, query: { page?: number; limit?: number; clinicId?: string }) {
    const { skip, take, page, limit } = paginate(query.page, query.limit);
    const clinicId = query.clinicId;
    if (clinicId) assertClinicAccess(user, clinicId);

    const where = {
      patient: {
        appointments: {
          some: clinicId
            ? { clinicId }
            : { clinicId: { in: user.isSuperAdmin ? undefined : user.clinicIds } },
        },
      },
    };

    const [items, total] = await Promise.all([
      this.prisma.medicalRecord.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      this.prisma.medicalRecord.count({ where }),
    ]);
    return { items, meta: paginationMeta(total, page, limit) };
  }
}
