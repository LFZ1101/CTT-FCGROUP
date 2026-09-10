import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getVapidPublicKey, isWebPushConfigured } from './webpush';

describe('webpush config', () => {
  it('reports unconfigured without VAPID keys', () => {
    const prevPub = process.env.VAPID_PUBLIC_KEY;
    const prevPriv = process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    assert.equal(isWebPushConfigured(), false);
    assert.equal(getVapidPublicKey(), null);
    if (prevPub) process.env.VAPID_PUBLIC_KEY = prevPub;
    if (prevPriv) process.env.VAPID_PRIVATE_KEY = prevPriv;
  });
});
