import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RedisRateLimiter } from './redis-rate-limiter';

describe('RedisRateLimiter', () => {
  it('usa fallback em memória quando redis é null', async () => {
    const lim = new RedisRateLimiter(null, 2, 60_000);
    assert.equal(await lim.try('a'), true);
    assert.equal(await lim.try('a'), true);
    assert.equal(await lim.try('a'), false);
  });

  it('usa Redis INCR quando disponível', async () => {
    const store = new Map<string, number>();
    const redis = {
      incr: async (key: string) => {
        const n = (store.get(key) || 0) + 1;
        store.set(key, n);
        return n;
      },
      pexpire: async () => 1,
    };
    const lim = new RedisRateLimiter(redis as any, 2, 60_000);
    assert.equal(await lim.try('login'), true);
    assert.equal(await lim.try('login'), true);
    assert.equal(await lim.try('login'), false);
  });

  it('cai para memória se Redis lançar erro', async () => {
    const redis = {
      incr: async () => {
        throw new Error('down');
      },
      pexpire: async () => 1,
    };
    const lim = new RedisRateLimiter(redis as any, 1, 60_000);
    assert.equal(await lim.try('x'), true);
    assert.equal(await lim.try('x'), false);
  });
});
