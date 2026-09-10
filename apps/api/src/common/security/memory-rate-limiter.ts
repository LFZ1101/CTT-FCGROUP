/**
 * Rate limit em memória por chave (ex.: e-mail de login).
 * Adequado para instância única; em cluster usar Redis.
 */
export class MemoryRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** @returns true se a tentativa é permitida */
  try(key: string, now = Date.now()): boolean {
    const since = now - this.windowMs;
    const prev = (this.hits.get(key) || []).filter((t) => t > since);
    if (prev.length >= this.limit) {
      this.hits.set(key, prev);
      return false;
    }
    prev.push(now);
    this.hits.set(key, prev);
    return true;
  }

  remaining(key: string, now = Date.now()): number {
    const since = now - this.windowMs;
    const prev = (this.hits.get(key) || []).filter((t) => t > since);
    return Math.max(0, this.limit - prev.length);
  }
}
