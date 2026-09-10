import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  INSUFFICIENT_EVIDENCE,
  buildExtractiveAnswer,
  jaccardSimilarity,
  retrieveChunks,
} from './retrieve';

describe('retrieveChunks', () => {
  const chunks = [
    {
      id: 'c1',
      title: 'Horas extraordinárias',
      clauseNumber: '12',
      category: 'OVERTIME',
      text: 'As horas extras serão remuneradas com adicional de 70% sobre a hora normal.',
      pageStart: 14,
      pageEnd: 14,
    },
    {
      id: 'c2',
      title: 'Vale refeição',
      clauseNumber: '5',
      category: 'MEAL_VOUCHER',
      text: 'A empresa concede vale refeição no valor diário de R$ 35,00.',
      pageStart: 6,
      pageEnd: 6,
    },
    {
      id: 'c3',
      title: 'Piso salarial',
      clauseNumber: '1',
      category: 'FLOOR',
      text: 'O piso salarial da categoria é de R$ 2.500,00.',
      pageStart: 2,
      pageEnd: 2,
    },
  ];

  it('ranks overtime clause for hours-extra question', () => {
    const hits = retrieveChunks('Qual o adicional de horas extras?', chunks, 3);
    assert.equal(hits[0].id, 'c1');
    assert.ok(hits[0].score > hits[1].score);
  });

  it('returns empty for empty question', () => {
    assert.deepEqual(retrieveChunks('   ', chunks), []);
  });
});

describe('buildExtractiveAnswer', () => {
  it('refuses when scores are too low', () => {
    const result = buildExtractiveAnswer('xyzzy', [
      {
        id: 'c1',
        title: 'Foo',
        clauseNumber: '1',
        category: null,
        text: 'bar',
        pageStart: 1,
        pageEnd: 1,
        score: 0.01,
        snippet: 'bar',
      },
    ]);
    assert.equal(result.insufficientEvidence, true);
    assert.equal(result.answer, INSUFFICIENT_EVIDENCE);
    assert.equal(result.citations.length, 0);
  });

  it('returns citations for strong hits', () => {
    const result = buildExtractiveAnswer('adicional horas extras', [
      {
        id: 'c1',
        title: 'Horas extraordinárias',
        clauseNumber: '12',
        category: 'OVERTIME',
        text: 'As horas extras serão remuneradas com adicional de 70%.',
        pageStart: 14,
        pageEnd: 14,
        score: 0.55,
        snippet: 'As horas extras serão remuneradas com adicional de 70%.',
      },
    ]);
    assert.equal(result.insufficientEvidence, false);
    assert.equal(result.citations.length, 1);
    assert.equal(result.citations[0].clauseNumber, '12');
    assert.match(result.answer, /70%/);
  });
});

describe('jaccardSimilarity', () => {
  it('is 1 for identical strings', () => {
    assert.equal(jaccardSimilarity('horas extras', 'horas extras'), 1);
  });
});
