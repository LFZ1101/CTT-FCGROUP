import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toVectorLiteral } from './pgvector';

describe('pgvector helpers', () => {
  it('formats vector literal', () => {
    assert.equal(toVectorLiteral([1, -0.5, 0]), '[1.000000,-0.500000,0.000000]');
  });
});
