import { Redis } from 'ioredis';
import { MemoryRateLimiter } from './memory-rate-limiter';

/**
 * Rate limit distribuído via Redis (INCR + PEXPIRE), com fallback em memória.
 */
export class RedisRateLimiter {
  private readonly fallback: MemoryRateLimiter;

  constructor(
    private readonly redis: Redis | null,
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly prefix = 'rl:',
  ) {
    this.fallback = new MemoryRateLimiter(limit, windowMs);
  }

  async try(key: string): Promise<boolean> {
    if (!this.redis) return this.fallback.try(key);

    const redisKey = `${this.prefix}${key}`;
    try {
      if (this.redis.status === 'wait') {
        await this.redis.connect();
      }
      const count = await this.redis.incr(redisKey);
      if (count === 1) {
        await this.redis.pexpire(redisKey, this.windowMs);
      }
      return count <= this.limit;
    } catch {
      return this.fallback.try(key);
    }
  }
}
