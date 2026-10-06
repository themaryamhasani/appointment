import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertClinicAccess } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class LabRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(user: AuthUser, query: { clinicId?: string; status?: string; visitId?: string }) {
    const where: Record<string, unknown> = {};
    if (query.clinicId) {
      assertClinicAccess(user, query.clinicId);
      where.clinicId = query.clinicId;
    } else if (!user.isSuperAdmin) {
      where.clinicId = { in: user.clinicIds };
    }
    if (query.status) where.status = query.status;
    if (query.visitId) where.visitId = query.visitId;

    return this.prisma.labRequest.findMany({
      where,
      include: {
        items: true,
        patient: { include: { user: true } },
        visit: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    user: AuthUser,
    dto: {
      visitId: string;
      notes?: string;
      items: Array<{ testName: string; instructions?: string }>;
    },
  ) {
    const visit = await this.prisma.visit.findUnique({
      where: { id: dto.visitId },
      include: { appointment: true },
    });
    if (!visit) throw new NotFoundException();
    assertClinicAccess(user, visit.appointment.clinicId);

    const lab = await this.prisma.labRequest.create({
      data: {
        clinicId: visit.appointment.clinicId,
        visitId: visit.id,
        patientId: visit.patientId,
        notes: dto.notes,
        items: {
          create: dto.items.map((i) => ({
            testName: i.testName,
            instructions: i.instructions,
          })),
        },
      },
      include: { items: true },
    });

    await this.audit.log({
      actorId: user.id,
      clinicId: visit.appointment.clinicId,
      action: 'LAB_REQUEST_CREATED',
      entity: 'LabRequest',
      entityId: lab.id,
    });
    return lab;
  }

  async updateStatus(user: AuthUser, id: string, status: string) {
    const lab = await this.prisma.labRequest.findUnique({ where: { id } });
    if (!lab) throw new NotFoundException();
    assertClinicAccess(user, lab.clinicId);
    return this.prisma.labRequest.update({
      where: { id },
      data: { status },
      include: { items: true },
    });
  }
}
