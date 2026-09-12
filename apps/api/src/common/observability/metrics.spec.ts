import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MetricsRegistry } from './metrics';

describe('MetricsRegistry', () => {
  it('agrega requests, erros e latência', () => {
    const m = new MetricsRegistry();
    m.observe(200, 10);
    m.observe(200, 20);
    m.observe(500, 50);
    const snap = m.snapshot();
    assert.equal(snap.requests, 3);
    assert.equal(snap.errors5xx, 1);
    assert.equal(snap.byStatus[200], 2);
    assert.equal(snap.byStatus[500], 1);
    assert.ok(snap.latencyMs.p50 >= 10);
    assert.ok(snap.latencyMs.samples === 3);
  });
});
