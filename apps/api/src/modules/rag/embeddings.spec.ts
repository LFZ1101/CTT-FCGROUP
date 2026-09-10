import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cosineSimilarity, embedText } from './embeddings';

describe('embedText / cosineSimilarity', () => {
  it('is similar for related overtime texts', () => {
    const a = embedText('adicional de horas extras remuneradas com 50 por cento');
    const b = embedText('horas extraordinarias pagas com adicional de cinquenta por cento');
    const c = embedText('vale refeicao diario concedido pela empresa no valor de trinta e cinco reais');
    const related = cosineSimilarity(a, b);
    const unrelated = cosineSimilarity(a, c);
    assert.ok(related > unrelated, `expected ${related} > ${unrelated}`);
    assert.ok(related > 0.15);
  });

  it('returns zero for empty/mismatched vectors', () => {
    assert.equal(cosineSimilarity([], [1, 0]), 0);
    assert.equal(cosineSimilarity(null, embedText('teste')), 0);
  });

  it('produces fixed dimension unit vectors', () => {
    const v = embedText('piso salarial da categoria');
    assert.equal(v.length, 256);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    assert.ok(Math.abs(norm - 1) < 0.02);
  });
});
