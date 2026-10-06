import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async ready() {
    const checks: Record<string, string> = {};
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'up';
    } catch {
      checks.database = 'down';
    }
    try {
      await this.redis.getClient().ping();
      checks.redis = 'up';
    } catch {
      checks.redis = 'down';
    }
    const healthy = Object.values(checks).every((v) => v === 'up');
    return { status: healthy ? 'ok' : 'degraded', checks, timestamp: new Date().toISOString() };
  }
}
