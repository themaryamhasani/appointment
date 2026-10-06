import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertClinicAccess, paginate, paginationMeta } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ClinicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(user: AuthUser, dto: {
    nameFa: string; nameEn: string; slug: string;
    descriptionFa?: string; descriptionEn?: string;
    timezone?: string; phone?: string; email?: string; website?: string;
    city?: string; addressFa?: string; addressEn?: string;
  }) {
    const clinic = await this.prisma.clinic.create({ data: dto });
    await this.audit.log({
      actorId: user.id, clinicId: clinic.id,
      action: 'CLINIC_CREATED', entity: 'Clinic', entityId: clinic.id, after: clinic,
    });
    return clinic;
  }

  async findAll(query: { page?: number; limit?: number; search?: string; city?: string }) {
    const { skip, take, page, limit } = paginate(query.page, query.limit);
    const where: Record<string, unknown> = { isActive: true };
    if (query.city) where.city = query.city;
    if (query.search) {
      where.OR = [
        { nameFa: { contains: query.search, mode: 'insensitive' } },
        { nameEn: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.clinic.findMany({
        where, skip, take, orderBy: { nameEn: 'asc' },
        include: { _count: { select: { branches: true } } },
      }),
      this.prisma.clinic.count({ where }),
    ]);
    return { items, meta: paginationMeta(total, page, limit) };
  }

  async findBySlug(slug: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { slug },
      include: {
        branches: { where: { isActive: true } },
      },
    });
    if (!clinic) throw new NotFoundException({ code: 'CLINIC_NOT_FOUND', message: 'Clinic not found' });
    return clinic;
  }

  async findOne(id: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: { branches: true },
    });
    if (!clinic) throw new NotFoundException({ code: 'CLINIC_NOT_FOUND', message: 'Clinic not found' });
    return clinic;
  }

  async update(user: AuthUser, id: string, dto: Record<string, unknown>) {
    assertClinicAccess(user, id);
    const before = await this.findOne(id);
    const updated = await this.prisma.clinic.update({ where: { id }, data: dto });
    await this.audit.log({
      actorId: user.id, clinicId: id,
      action: 'CLINIC_UPDATED', entity: 'Clinic', entityId: id, before, after: updated,
    });
    return updated;
  }
}
