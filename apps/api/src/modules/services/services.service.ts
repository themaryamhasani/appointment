import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertClinicAccess } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findByClinic(clinicId: string) {
    return this.prisma.service.findMany({
      where: { clinicId, isActive: true },
      include: { doctors: { include: { doctor: { include: { user: true } } } } },
      orderBy: { nameEn: 'asc' },
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: { doctors: true },
    });
    if (!service) throw new NotFoundException();
    return service;
  }

  async create(
    user: AuthUser,
    dto: {
      clinicId: string;
      nameFa: string;
      nameEn: string;
      slug: string;
      descriptionFa?: string;
      descriptionEn?: string;
      price?: number;
      durationMinutes?: number;
      doctorIds?: string[];
    },
  ) {
    assertClinicAccess(user, dto.clinicId);
    const service = await this.prisma.service.create({
      data: {
        clinicId: dto.clinicId,
        nameFa: dto.nameFa,
        nameEn: dto.nameEn,
        slug: dto.slug,
        descriptionFa: dto.descriptionFa,
        descriptionEn: dto.descriptionEn,
        price: dto.price ?? 0,
        durationMinutes: dto.durationMinutes ?? 20,
        doctors: dto.doctorIds?.length
          ? { create: dto.doctorIds.map((doctorId) => ({ doctorId })) }
          : undefined,
      },
      include: { doctors: true },
    });
    await this.audit.log({
      actorId: user.id,
      clinicId: dto.clinicId,
      action: 'SERVICE_CREATED',
      entity: 'Service',
      entityId: service.id,
    });
    return service;
  }

  async update(user: AuthUser, id: string, dto: Record<string, unknown>) {
    const service = await this.findOne(id);
    assertClinicAccess(user, service.clinicId);
    const { doctorIds, ...rest } = dto as { doctorIds?: string[] } & Record<string, unknown>;
    if (doctorIds) {
      await this.prisma.doctorService.deleteMany({ where: { serviceId: id } });
      await this.prisma.doctorService.createMany({
        data: doctorIds.map((doctorId) => ({ doctorId, serviceId: id })),
      });
    }
    return this.prisma.service.update({
      where: { id },
      data: rest,
      include: { doctors: true },
    });
  }

  async remove(user: AuthUser, id: string) {
    const service = await this.findOne(id);
    assertClinicAccess(user, service.clinicId);
    return this.prisma.service.update({ where: { id }, data: { isActive: false } });
  }
}
