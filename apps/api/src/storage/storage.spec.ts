import { createHash } from 'crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('hash SHA-256 de conteúdo é determinístico', () => {
  const a = createHash('sha256').update(Buffer.from('%PDF-1.4 demo')).digest('hex');
  const b = createHash('sha256').update(Buffer.from('%PDF-1.4 demo')).digest('hex');
  assert.equal(a, b);
  assert.notEqual(a, createHash('sha256').update('outra').digest('hex'));
});
