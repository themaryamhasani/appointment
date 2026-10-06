import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type MemoryEntry = { value: string; expiresAt?: number };

/**
 * Redis wrapper with in-memory fallback when Redis is unreachable (local Windows without Docker).
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private useMemory = false;
  private readonly memory = new Map<string, MemoryEntry>();

  constructor(private readonly config: ConfigService) {
    const host = this.config.get('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);
    const forceMemory = this.config.get('REDIS_FALLBACK') === 'memory';

    if (forceMemory) {
      this.useMemory = true;
      this.client = null;
      this.logger.warn('REDIS_FALLBACK=memory — using in-memory store');
      return;
    }

    try {
      this.client = new Redis({
        host,
        port,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 1500,
        retryStrategy: () => null,
        lazyConnect: true,
      });

      this.client.on('error', () => {
        if (!this.useMemory) {
          this.useMemory = true;
          this.logger.warn('Redis unavailable — using in-memory store for locks/cache');
        }
      });
    } catch {
      this.useMemory = true;
      this.client = null;
      this.logger.warn('Redis init failed — using in-memory store');
    }

    void this.probe();
  }

  private async probe() {
    if (!this.client) {
      this.useMemory = true;
      return;
    }
    try {
      await this.client.connect();
      await this.client.ping();
      this.useMemory = false;
      this.logger.log('Connected to Redis');
    } catch {
      this.useMemory = true;
      this.logger.warn('Redis unreachable — using in-memory store for locks/cache');
      try {
        this.client.disconnect();
      } catch {
        /* ignore */
      }
      this.client = null;
    }
  }

  getClient(): Redis {
    if (!this.client) {
      // BullMQ may still need a client — return a dummy that will fail softly
      return new Redis({
        host: '127.0.0.1',
        port: 6379,
        lazyConnect: true,
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      });
    }
    return this.client;
  }

  private purgeExpired(key: string) {
    const entry = this.memory.get(key);
    if (entry?.expiresAt && entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.useMemory || !this.client) {
      this.purgeExpired(key);
      return this.memory.get(key)?.value ?? null;
    }
    try {
      return await this.client.get(key);
    } catch {
      this.useMemory = true;
      return this.get(key);
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.useMemory || !this.client) {
      this.memory.set(key, {
        value,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
      });
      return;
    }
    try {
      if (ttlSeconds) await this.client.set(key, value, 'EX', ttlSeconds);
      else await this.client.set(key, value);
    } catch {
      this.useMemory = true;
      await this.set(key, value, ttlSeconds);
    }
  }

  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (this.useMemory || !this.client) {
      this.purgeExpired(key);
      if (this.memory.has(key)) return false;
      this.memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      return true;
    }
    try {
      const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch {
      this.useMemory = true;
      return this.setNx(key, value, ttlSeconds);
    }
  }

  async del(key: string): Promise<void> {
    if (this.useMemory || !this.client) {
      this.memory.delete(key);
      return;
    }
    try {
      await this.client.del(key);
    } catch {
      this.useMemory = true;
      await this.del(key);
    }
  }

  async incr(key: string): Promise<number> {
    if (this.useMemory || !this.client) {
      this.purgeExpired(key);
      const current = Number(this.memory.get(key)?.value || 0) + 1;
      const prev = this.memory.get(key);
      this.memory.set(key, { value: String(current), expiresAt: prev?.expiresAt });
      return current;
    }
    try {
      return await this.client.incr(key);
    } catch {
      this.useMemory = true;
      return this.incr(key);
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (this.useMemory || !this.client) {
      const entry = this.memory.get(key);
      if (entry) entry.expiresAt = Date.now() + ttlSeconds * 1000;
      return;
    }
    try {
      await this.client.expire(key, ttlSeconds);
    } catch {
      this.useMemory = true;
      await this.expire(key, ttlSeconds);
    }
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    if (this.useMemory || !this.client) {
      for (const key of [...this.memory.keys()]) {
        if (key.startsWith(prefix)) this.memory.delete(key);
      }
      return;
    }
    try {
      const keys = await this.client.keys(`${prefix}*`);
      if (keys.length) await this.client.del(...keys);
    } catch {
      this.useMemory = true;
      await this.deleteByPrefix(prefix);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        /* ignore */
      }
    }
  }
}
