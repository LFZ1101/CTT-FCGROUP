import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Redis } from 'ioredis';
import { metricsRegistry } from './observability/metrics';
import { isSentryEnabled } from './observability/sentry';

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
      version: process.env.APP_VERSION || 'dev',
      sentry: isSentryEnabled(),
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  metrics() {
    return {
      service: 'cct-intelligence-api',
      ...metricsRegistry.snapshot(),
      timestamp: new Date().toISOString(),
    };
  }
}
