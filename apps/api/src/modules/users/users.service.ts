import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta, assertClinicAccess } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { AppException } from '../../common/exceptions/app.exception';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findStaff(user: AuthUser, clinicId: string, query: { page?: number; limit?: number }) {
    assertClinicAccess(user, clinicId);
    const { skip, take, page, limit } = paginate(query.page, query.limit);
    const [items, total] = await Promise.all([
      this.prisma.clinicStaff.findMany({
        where: { clinicId, isActive: true },
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              roles: { where: { clinicId }, include: { role: true } },
            },
          },
        },
      }),
      this.prisma.clinicStaff.count({ where: { clinicId, isActive: true } }),
    ]);
    return { items, meta: paginationMeta(total, page, limit) };
  }

  async assignRole(
    user: AuthUser,
    dto: { userId: string; roleId: string; clinicId: string },
  ) {
    assertClinicAccess(user, dto.clinicId);
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });
    if (role.name === 'SUPER_ADMIN' && !user.isSuperAdmin) {
      throw new AppException('FORBIDDEN', 'Cannot assign super admin');
    }

    await this.prisma.clinicStaff.upsert({
      where: { clinicId_userId: { clinicId: dto.clinicId, userId: dto.userId } },
      create: { clinicId: dto.clinicId, userId: dto.userId },
      update: { isActive: true },
    });

    const existing = await this.prisma.userRole.findFirst({
      where: { userId: dto.userId, roleId: dto.roleId, clinicId: dto.clinicId },
    });
    if (existing) return existing;

    return this.prisma.userRole.create({
      data: { userId: dto.userId, roleId: dto.roleId, clinicId: dto.clinicId },
    });
  }
}
