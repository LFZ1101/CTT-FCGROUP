import { Redis } from 'ioredis';
import { MemoryRateLimiter } from './memory-rate-limiter';

const INCR_EXPIRE_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return current
`;

/**
 * Rate limit distribuído via Redis (INCR+PEXPIRE atômico), com fallback em memória.
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
      const count = Number(
        await this.redis.eval(INCR_EXPIRE_LUA, 1, redisKey, String(this.windowMs)),
      );
      return count <= this.limit;
    } catch {
      return this.fallback.try(key);
    }
  }
}
