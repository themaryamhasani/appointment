import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { assertClinicAccess } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, clinicId?: string) {
    if (clinicId) assertClinicAccess(user, clinicId);
    return this.prisma.role.findMany({
      where: {
        OR: [
          { isSystem: true, clinicId: null },
          ...(clinicId ? [{ clinicId }] : []),
        ],
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async findPermissions() {
    return this.prisma.permission.findMany({ orderBy: { code: 'asc' } });
  }
}
