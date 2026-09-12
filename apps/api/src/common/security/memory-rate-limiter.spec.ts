import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MemoryRateLimiter } from './memory-rate-limiter';

describe('MemoryRateLimiter', () => {
  it('allows up to limit within window', () => {
    const lim = new MemoryRateLimiter(3, 60_000);
    assert.equal(lim.try('a', 1000), true);
    assert.equal(lim.try('a', 1001), true);
    assert.equal(lim.try('a', 1002), true);
    assert.equal(lim.try('a', 1003), false);
  });

  it('resets after window', () => {
    const lim = new MemoryRateLimiter(1, 1000);
    assert.equal(lim.try('b', 0), true);
    assert.equal(lim.try('b', 999), false);
    assert.equal(lim.try('b', 1000), true);
  });

  it('isolates keys', () => {
    const lim = new MemoryRateLimiter(1, 60_000);
    assert.equal(lim.try('x', 1), true);
    assert.equal(lim.try('y', 1), true);
  });
});
