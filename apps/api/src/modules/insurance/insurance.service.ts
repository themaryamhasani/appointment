import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertClinicAccess } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class InsuranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findProviders(clinicId: string) {
    return this.prisma.insuranceProvider.findMany({
      where: { clinicId, isActive: true },
      orderBy: { nameEn: 'asc' },
    });
  }

  async createProvider(
    user: AuthUser,
    dto: { clinicId: string; nameFa: string; nameEn: string },
  ) {
    assertClinicAccess(user, dto.clinicId);
    const provider = await this.prisma.insuranceProvider.create({ data: dto });
    await this.audit.log({
      actorId: user.id,
      clinicId: dto.clinicId,
      action: 'INSURANCE_PROVIDER_CREATED',
      entity: 'InsuranceProvider',
      entityId: provider.id,
    });
    return provider;
  }

  async updateProvider(user: AuthUser, id: string, dto: Record<string, unknown>) {
    const provider = await this.prisma.insuranceProvider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException();
    assertClinicAccess(user, provider.clinicId);
    return this.prisma.insuranceProvider.update({ where: { id }, data: dto });
  }

  async findPatientInsurance(patientId: string) {
    return this.prisma.patientInsurance.findMany({
      where: { patientId },
      include: { provider: true },
    });
  }

  async linkPatient(
    user: AuthUser,
    dto: { patientId: string; providerId: string; policyNumber: string; isPrimary?: boolean },
  ) {
    const provider = await this.prisma.insuranceProvider.findUnique({
      where: { id: dto.providerId },
    });
    if (!provider) throw new NotFoundException();
    assertClinicAccess(user, provider.clinicId);

    if (dto.isPrimary !== false) {
      await this.prisma.patientInsurance.updateMany({
        where: { patientId: dto.patientId },
        data: { isPrimary: false },
      });
    }

    return this.prisma.patientInsurance.create({
      data: {
        patientId: dto.patientId,
        providerId: dto.providerId,
        policyNumber: dto.policyNumber,
        isPrimary: dto.isPrimary !== false,
      },
      include: { provider: true },
    });
  }
}
