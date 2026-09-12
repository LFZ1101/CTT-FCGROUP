import { randomBytes } from 'node:crypto';

export type SpanStatus = 'ok' | 'error';

export type ActiveSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startNs: bigint;
  attributes: Record<string, string | number | boolean>;
};

type FinishedSpan = ActiveSpan & {
  endNs: bigint;
  status: SpanStatus;
};

const pending: FinishedSpan[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function hex(bytes: number) {
  return randomBytes(bytes).toString('hex');
}

export function isOtelEnabled() {
  if (process.env.OTEL_SDK_DISABLED === 'true') return false;
  return Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_ENABLED === 'true');
}

export function parseTraceparent(header?: string | null): {
  traceId: string;
  parentSpanId: string;
} | null {
  if (!header) return null;
  const m = String(header).trim().match(/^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i);
  if (!m) return null;
  return { traceId: m[1].toLowerCase(), parentSpanId: m[2].toLowerCase() };
}

export function formatTraceparent(traceId: string, spanId: string, sampled = true) {
  return `00-${traceId}-${spanId}-${sampled ? '01' : '00'}`;
}

export function startSpan(
  name: string,
  opts?: {
    traceId?: string;
    parentSpanId?: string;
    attributes?: Record<string, string | number | boolean>;
  },
): ActiveSpan {
  return {
    traceId: opts?.traceId || hex(16),
    spanId: hex(8),
    parentSpanId: opts?.parentSpanId,
    name,
    startNs: process.hrtime.bigint(),
    attributes: { ...(opts?.attributes || {}) },
  };
}

export function endSpan(span: ActiveSpan, status: SpanStatus = 'ok') {
  if (!isOtelEnabled()) return;
  const finished: FinishedSpan = {
    ...span,
    endNs: process.hrtime.bigint(),
    status,
  };
  pending.push(finished);
  if (pending.length > 200) pending.splice(0, pending.length - 200);
  ensureFlushLoop();
}

function attrValue(v: string | number | boolean) {
  if (typeof v === 'number') return { doubleValue: v };
  if (typeof v === 'boolean') return { boolValue: v };
  return { stringValue: String(v) };
}

export async function flushOtel(): Promise<{ flushed: number; skipped?: boolean; reason?: string }> {
  if (!isOtelEnabled()) return { flushed: 0, skipped: true, reason: 'otel_disabled' };
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return { flushed: 0, skipped: true, reason: 'no_endpoint' };
  if (!pending.length) return { flushed: 0 };

  const batch = pending.splice(0, pending.length);
  const serviceName = process.env.OTEL_SERVICE_NAME || 'cct-intelligence-api';
  const now = BigInt(Date.now()) * 1_000_000n;

  const body = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: serviceName } },
            {
              key: 'deployment.environment',
              value: { stringValue: process.env.OTEL_ENV || process.env.NODE_ENV || 'development' },
            },
          ],
        },
        scopeSpans: [
          {
            scope: { name: 'cct-lite-otel', version: '1.0.0' },
            spans: batch.map((s, idx) => {
              const duration = s.endNs - s.startNs;
              const end = now - BigInt((batch.length - idx - 1) * 1000);
              const start = end - duration;
              return {
                traceId: s.traceId,
                spanId: s.spanId,
                parentSpanId: s.parentSpanId,
                name: s.name,
                kind: 2,
                startTimeUnixNano: String(start > 0n ? start : now),
                endTimeUnixNano: String(end > 0n ? end : now),
                attributes: Object.entries(s.attributes).map(([key, value]) => ({
                  key,
                  value: attrValue(value),
                })),
                status: { code: s.status === 'error' ? 2 : 1 },
              };
            }),
          },
        ],
      },
    ],
  };

  const url = endpoint.replace(/\/$/, '') + '/v1/traces';
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (process.env.OTEL_EXPORTER_OTLP_HEADERS) {
    for (const part of process.env.OTEL_EXPORTER_OTLP_HEADERS.split(',')) {
      const [k, ...rest] = part.split('=');
      if (k && rest.length) headers[k.trim()] = rest.join('=').trim();
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Number(process.env.OTEL_EXPORT_TIMEOUT_MS || 5000)),
    });
    if (!res.ok) {
      // requeue small batch on failure
      pending.unshift(...batch.slice(0, 50));
      return { flushed: 0, reason: `http_${res.status}` };
    }
    return { flushed: batch.length };
  } catch (err) {
    pending.unshift(...batch.slice(0, 50));
    return {
      flushed: 0,
      reason: err instanceof Error ? err.message.slice(0, 120) : 'export_failed',
    };
  }
}

function ensureFlushLoop() {
  if (flushTimer || !isOtelEnabled() || !process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;
  const every = Math.max(2000, Number(process.env.OTEL_FLUSH_INTERVAL_MS || 5000));
  flushTimer = setInterval(() => {
    void flushOtel();
  }, every);
  if (typeof flushTimer === 'object' && 'unref' in flushTimer) flushTimer.unref();
}

export function otelSnapshot() {
  return {
    enabled: isOtelEnabled(),
    endpoint: Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT),
    pendingSpans: pending.length,
    serviceName: process.env.OTEL_SERVICE_NAME || 'cct-intelligence-api',
  };
}
