import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatTraceparent,
  parseTraceparent,
  startSpan,
  endSpan,
  isOtelEnabled,
  otelSnapshot,
} from './tracing';

describe('lite otel tracing', () => {
  it('parseia e formata traceparent W3C', () => {
    const tp = formatTraceparent('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb');
    assert.equal(tp, '00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01');
    const parsed = parseTraceparent(tp);
    assert.equal(parsed?.traceId, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    assert.equal(parsed?.parentSpanId, 'bbbbbbbbbbbbbbbb');
    assert.equal(parseTraceparent('bad'), null);
  });

  it('cria spans com ids hex válidos', () => {
    const span = startSpan('HTTP GET', { attributes: { 'http.method': 'GET' } });
    assert.match(span.traceId, /^[0-9a-f]{32}$/);
    assert.match(span.spanId, /^[0-9a-f]{16}$/);
    endSpan(span, 'ok');
  });

  it('respeita flag disabled', () => {
    const prev = process.env.OTEL_SDK_DISABLED;
    process.env.OTEL_SDK_DISABLED = 'true';
    assert.equal(isOtelEnabled(), false);
    if (prev === undefined) delete process.env.OTEL_SDK_DISABLED;
    else process.env.OTEL_SDK_DISABLED = prev;
    const snap = otelSnapshot();
    assert.equal(typeof snap.pendingSpans, 'number');
  });
});
