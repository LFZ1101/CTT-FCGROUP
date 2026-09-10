import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deliverWebhook, signWebhookBody } from './webhook';

describe('webhook delivery', () => {
  it('skips when URL is not configured', async () => {
    const prev = process.env.NOTIFY_WEBHOOK_URL;
    delete process.env.NOTIFY_WEBHOOK_URL;
    const result = await deliverWebhook({ type: 'alert' });
    assert.equal(result.sent, false);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, 'webhook_unconfigured');
    if (prev) process.env.NOTIFY_WEBHOOK_URL = prev;
  });

  it('assinatura HMAC é estável', () => {
    const a = signWebhookBody('{"a":1}', 'secret');
    const b = signWebhookBody('{"a":1}', 'secret');
    assert.equal(a, b);
    assert.match(a, /^sha256=[a-f0-9]{64}$/);
  });
});
