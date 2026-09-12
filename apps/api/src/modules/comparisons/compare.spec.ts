import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareClauses, jaccardSimilarity, summarizeClauseDiffs } from './compare';

describe('compareClauses', () => {
  it('marks identical numbered clauses as UNCHANGED', () => {
    const previous = [
      {
        id: 'p1',
        title: 'Piso salarial',
        category: 'remuneracao',
        clauseNumber: '1',
        text: 'O piso salarial da categoria sera de R$ 2000,00.',
      },
    ];
    const current = [
      {
        id: 'c1',
        title: 'Piso salarial',
        category: 'remuneracao',
        clauseNumber: '1',
        text: 'O piso salarial da categoria sera de R$ 2000,00.',
      },
    ];
    const diffs = compareClauses(previous, current);
    assert.equal(diffs.length, 1);
    assert.equal(diffs[0].changeType, 'UNCHANGED');
    assert.equal(diffs[0].currentClauseId, 'c1');
  });

  it('detects MODIFIED content on same clause number', () => {
    const previous = [
      {
        id: 'p1',
        title: 'Piso salarial',
        category: 'remuneracao',
        clauseNumber: '1',
        text: 'O piso salarial da categoria sera de R$ 2000,00 para jornada de 44 horas.',
      },
    ];
    const current = [
      {
        id: 'c1',
        title: 'Piso salarial',
        category: 'remuneracao',
        clauseNumber: '1',
        text: 'O piso salarial da categoria sera de R$ 2500,00 para jornada de 40 horas semanais.',
      },
    ];
    const diffs = compareClauses(previous, current);
    assert.equal(diffs[0].changeType, 'MODIFIED');
    assert.ok((diffs[0].similarity ?? 0) > 0.2);
  });

  it('detects ADDED and REMOVED clauses', () => {
    const previous = [
      {
        id: 'p1',
        title: 'Vale transporte',
        category: 'beneficios',
        clauseNumber: '2',
        text: 'A empresa concede vale transporte integral.',
      },
    ];
    const current = [
      {
        id: 'c1',
        title: 'Vale refeicao',
        category: 'beneficios',
        clauseNumber: '3',
        text: 'A empresa concede vale refeicao diario.',
      },
    ];
    const diffs = compareClauses(previous, current);
    const types = diffs.map((d) => d.changeType).sort();
    assert.deepEqual(types, ['ADDED', 'REMOVED']);
  });

  it('detects RENAMED when number matches but title changes', () => {
    const previous = [
      {
        id: 'p1',
        title: 'Adicional noturno',
        category: 'remuneracao',
        clauseNumber: '5',
        text: 'O trabalho noturno sera remunerado com adicional de 20 por cento.',
      },
    ];
    const current = [
      {
        id: 'c1',
        title: 'Adicional por trabalho noturno',
        category: 'remuneracao',
        clauseNumber: '5',
        text: 'O trabalho noturno sera remunerado com adicional de 20 por cento sobre a hora diurna.',
      },
    ];
    const diffs = compareClauses(previous, current);
    assert.equal(diffs[0].changeType, 'RENAMED');
  });
});

describe('jaccardSimilarity', () => {
  it('returns 1 for identical texts', () => {
    assert.equal(jaccardSimilarity('clausula de ferias anuais', 'clausula de ferias anuais'), 1);
  });

  it('returns 0 when one side is empty', () => {
    assert.equal(jaccardSimilarity('texto', ''), 0);
  });
});

describe('summarizeClauseDiffs', () => {
  it('aggregates material changes', () => {
    const summary = summarizeClauseDiffs([
      {
        previousClauseId: 'a',
        currentClauseId: 'b',
        changeType: 'MODIFIED',
        similarity: 0.5,
        summary: 'x',
        structuredDiff: {
          titleChanged: false,
          categoryChanged: false,
          numberChanged: false,
          previousTitle: null,
          currentTitle: null,
          previousCategory: null,
          currentCategory: null,
          previousNumber: null,
          currentNumber: null,
          previousPreview: null,
          currentPreview: null,
        },
      },
      {
        previousClauseId: null,
        currentClauseId: 'c',
        changeType: 'ADDED',
        similarity: 0,
        summary: 'y',
        structuredDiff: {
          titleChanged: false,
          categoryChanged: false,
          numberChanged: false,
          previousTitle: null,
          currentTitle: null,
          previousCategory: null,
          currentCategory: null,
          previousNumber: null,
          currentNumber: null,
          previousPreview: null,
          currentPreview: null,
        },
      },
    ]);
    assert.equal(summary.modified, 1);
    assert.equal(summary.added, 1);
    assert.equal(summary.materialChanges, 2);
  });
});
