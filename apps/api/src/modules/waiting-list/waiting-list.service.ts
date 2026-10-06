import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertClinicAccess } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { AppException } from '../../common/exceptions/app.exception';

@Injectable()
export class WaitingListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(user: AuthUser, query: { clinicId?: string; doctorId?: string; status?: string }) {
    const where: Record<string, unknown> = {};
    if (query.clinicId) {
      assertClinicAccess(user, query.clinicId);
      where.clinicId = query.clinicId;
    } else if (!user.isSuperAdmin) {
      where.clinicId = { in: user.clinicIds };
    }
    if (query.doctorId) where.doctorId = query.doctorId;
    if (query.status) where.status = query.status;

    return this.prisma.waitingListEntry.findMany({
      where,
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async join(
    user: AuthUser,
    dto: {
      clinicId: string;
      doctorId: string;
      patientId: string;
      branchId?: string;
      preferredDate?: string;
      notes?: string;
    },
  ) {
    assertClinicAccess(user, dto.clinicId);
    const existing = await this.prisma.waitingListEntry.findFirst({
      where: {
        clinicId: dto.clinicId,
        doctorId: dto.doctorId,
        patientId: dto.patientId,
        status: 'WAITING',
      },
    });
    if (existing) return existing;

    const entry = await this.prisma.waitingListEntry.create({
      data: {
        clinicId: dto.clinicId,
        doctorId: dto.doctorId,
        patientId: dto.patientId,
        branchId: dto.branchId,
        preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : undefined,
        notes: dto.notes,
      },
    });
    await this.audit.log({
      actorId: user.id,
      clinicId: dto.clinicId,
      action: 'WAITING_LIST_JOINED',
      entity: 'WaitingListEntry',
      entityId: entry.id,
    });
    return entry;
  }

  async promote(user: AuthUser, id: string) {
    const entry = await this.prisma.waitingListEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException();
    assertClinicAccess(user, entry.clinicId);
    if (entry.status !== 'WAITING') {
      throw new AppException('INVALID_STATUS', 'Entry is not waiting');
    }
    return this.prisma.waitingListEntry.update({
      where: { id },
      data: { status: 'PROMOTED' },
    });
  }

  async cancel(user: AuthUser, id: string) {
    const entry = await this.prisma.waitingListEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException();
    assertClinicAccess(user, entry.clinicId);
    return this.prisma.waitingListEntry.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
