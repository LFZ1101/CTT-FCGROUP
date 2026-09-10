import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Redis } from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async status() {
    const checks: Record<string, 'ok' | 'error' | 'skip'> = {
      api: 'ok',
      database: 'skip',
      redis: 'skip',
    };
    let overall: 'ok' | 'degraded' = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
      overall = 'degraded';
    }

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 1500,
        lazyConnect: true,
      });
      try {
        await redis.connect();
        const pong = await redis.ping();
        checks.redis = pong === 'PONG' ? 'ok' : 'error';
        if (checks.redis === 'error') overall = 'degraded';
      } catch {
        checks.redis = 'error';
        overall = 'degraded';
      } finally {
        redis.disconnect();
      }
    }

    return {
      status: overall,
      service: 'cct-intelligence-api',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
