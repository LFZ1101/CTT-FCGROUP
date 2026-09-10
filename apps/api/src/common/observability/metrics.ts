/**
 * Contadores leves em processo (réplica local).
 * Para cluster, preferir Prometheus/OTel externo depois.
 */
export class MetricsRegistry {
  private requests = 0;
  private errors = 0;
  private readonly byStatus = new Map<number, number>();
  private readonly durationsMs: number[] = [];
  private readonly startedAt = Date.now();

  observe(statusCode: number, durationMs: number) {
    this.requests += 1;
    if (statusCode >= 500) this.errors += 1;
    this.byStatus.set(statusCode, (this.byStatus.get(statusCode) || 0) + 1);
    this.durationsMs.push(durationMs);
    if (this.durationsMs.length > 500) this.durationsMs.shift();
  }

  snapshot() {
    const sorted = [...this.durationsMs].sort((a, b) => a - b);
    const p = (q: number) =>
      sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))] : 0;
    return {
      uptimeSec: Math.round((Date.now() - this.startedAt) / 1000),
      requests: this.requests,
      errors5xx: this.errors,
      byStatus: Object.fromEntries(this.byStatus.entries()),
      latencyMs: {
        p50: p(0.5),
        p95: p(0.95),
        p99: p(0.99),
        samples: sorted.length,
      },
    };
  }
}

export const metricsRegistry = new MetricsRegistry();
