import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertClinicAccess } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(user: AuthUser, dto: {
    clinicId: string; nameFa: string; nameEn: string; slug: string;
    phone?: string; email?: string; city?: string;
    addressFa?: string; addressEn?: string;
    latitude?: number; longitude?: number;
  }) {
    assertClinicAccess(user, dto.clinicId);
    const branch = await this.prisma.branch.create({ data: dto });
    await this.audit.log({
      actorId: user.id, clinicId: dto.clinicId,
      action: 'BRANCH_CREATED', entity: 'Branch', entityId: branch.id, after: branch,
    });
    return branch;
  }

  async findByClinic(clinicId: string) {
    return this.prisma.branch.findMany({
      where: { clinicId, isActive: true },
      orderBy: { nameEn: 'asc' },
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { clinic: true },
    });
    if (!branch) throw new NotFoundException({ code: 'BRANCH_NOT_FOUND', message: 'Branch not found' });
    return branch;
  }

  async update(user: AuthUser, id: string, dto: Record<string, unknown>) {
    const branch = await this.findOne(id);
    assertClinicAccess(user, branch.clinicId);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }
}
