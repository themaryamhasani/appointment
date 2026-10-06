import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertClinicAccess } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    user: AuthUser,
    dto: {
      visitId: string;
      notes?: string;
      items: Array<{
        medicineName: string;
        dosage: string;
        frequency: string;
        duration: string;
        instructions?: string;
      }>;
    },
  ) {
    const visit = await this.prisma.visit.findUnique({
      where: { id: dto.visitId },
      include: { appointment: true },
    });
    if (!visit) throw new NotFoundException();
    assertClinicAccess(user, visit.appointment.clinicId);

    const prescription = await this.prisma.prescription.create({
      data: {
        visitId: dto.visitId,
        notes: dto.notes,
        items: {
          create: dto.items.map((item, i) => ({ ...item, sortOrder: i })),
        },
      },
      include: { items: true },
    });

    await this.audit.log({
      actorId: user.id,
      clinicId: visit.appointment.clinicId,
      action: 'PRESCRIPTION_CREATED',
      entity: 'Prescription',
      entityId: prescription.id,
    });

    return prescription;
  }

  async findByPatient(user: AuthUser, patientId?: string) {
    let pid = patientId;
    if (!pid) {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
      if (!patient) throw new NotFoundException();
      pid = patient.id;
    }

    return this.prisma.prescription.findMany({
      where: { visit: { patientId: pid } },
      include: {
        items: true,
        visit: {
          include: {
            doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
            appointment: { select: { appointmentDate: true, clinicId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
