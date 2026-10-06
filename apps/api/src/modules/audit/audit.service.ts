import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta, assertClinicAccess } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';

const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'secret', 'accessToken', 'refreshToken'];

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    actorId?: string;
    clinicId?: string;
    action: string;
    entity: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        clinicId: params.clinicId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        before: params.before
          ? (this.sanitize(params.before) as Prisma.InputJsonValue)
          : undefined,
        after: params.after
          ? (this.sanitize(params.after) as Prisma.InputJsonValue)
          : undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  async findAll(
    user: AuthUser,
    query: { page?: number; limit?: number; clinicId?: string; entity?: string; action?: string },
  ) {
    const { skip, take, page, limit } = paginate(query.page, query.limit);
    const where: Record<string, unknown> = {};

    if (query.clinicId) {
      assertClinicAccess(user, query.clinicId);
      where.clinicId = query.clinicId;
    } else if (!user.isSuperAdmin) {
      where.clinicId = { in: user.clinicIds };
    }

    if (query.entity) where.entity = query.entity;
    if (query.action) where.action = query.action;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, meta: paginationMeta(total, page, limit) };
  }

  private sanitize(data: unknown): Record<string, unknown> {
    if (!data || typeof data !== 'object') return {};
    const clone = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
    const scrub = (obj: Record<string, unknown>) => {
      for (const key of Object.keys(obj)) {
        if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
          obj[key] = '[REDACTED]';
        } else if (obj[key] && typeof obj[key] === 'object') {
          scrub(obj[key] as Record<string, unknown>);
        }
      }
    };
    scrub(clone);
    return clone;
  }
}
