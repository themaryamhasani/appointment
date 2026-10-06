import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { paginate, paginationMeta, assertClinicAccess } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { Prisma } from '@prisma/client';

@Injectable()
export class DoctorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: {
    page?: number; limit?: number; search?: string;
    specialtyId?: string; clinicId?: string; branchId?: string; city?: string;
  }) {
    const { skip, take, page, limit } = paginate(query.page, query.limit);
    const where: Prisma.DoctorWhereInput = { isActive: true };

    if (query.search) {
      where.OR = [
        { user: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { bioEn: { contains: query.search, mode: 'insensitive' } },
        { bioFa: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.specialtyId) {
      where.specialties = { some: { specialtyId: query.specialtyId } };
    }
    if (query.branchId) {
      where.branches = { some: { branchId: query.branchId, isActive: true } };
    } else if (query.clinicId) {
      where.branches = { some: { branch: { clinicId: query.clinicId }, isActive: true } };
    } else if (query.city) {
      where.branches = { some: { branch: { city: query.city }, isActive: true } };
    }

    const [items, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where, skip, take,
        orderBy: [{ rating: 'desc' }, { experienceYears: 'desc' }],
        include: {
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          specialties: { include: { specialty: true } },
          branches: {
            where: { isActive: true },
            include: { branch: { include: { clinic: true } } },
          },
        },
      }),
      this.prisma.doctor.count({ where }),
    ]);

    return { items, meta: paginationMeta(total, page, limit) };
  }

  async findBySlug(slug: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { slug },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true, email: true } },
        specialties: { include: { specialty: true } },
        branches: {
          where: { isActive: true },
          include: { branch: { include: { clinic: true } } },
        },
        schedules: { where: { isActive: true }, include: { branch: true } },
      },
    });
    if (!doctor) throw new NotFoundException({ code: 'DOCTOR_NOT_FOUND', message: 'Doctor not found' });
    return doctor;
  }

  async findOne(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        specialties: { include: { specialty: true } },
        branches: { include: { branch: { include: { clinic: true } } } },
      },
    });
    if (!doctor) throw new NotFoundException({ code: 'DOCTOR_NOT_FOUND', message: 'Doctor not found' });
    return doctor;
  }

  async assignBranch(user: AuthUser, doctorId: string, branchId: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException();
    assertClinicAccess(user, branch.clinicId);

    const link = await this.prisma.doctorBranch.upsert({
      where: { doctorId_branchId: { doctorId, branchId } },
      create: { doctorId, branchId },
      update: { isActive: true },
    });

    await this.audit.log({
      actorId: user.id, clinicId: branch.clinicId,
      action: 'DOCTOR_BRANCH_ASSIGNED', entity: 'DoctorBranch', entityId: link.id,
    });
    return link;
  }

  async assignSpecialty(user: AuthUser, doctorId: string, specialtyId: string, isPrimary = false) {
    return this.prisma.doctorSpecialty.upsert({
      where: { doctorId_specialtyId: { doctorId, specialtyId } },
      create: { doctorId, specialtyId, isPrimary },
      update: { isPrimary },
    });
  }
}
