import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzePayrollImpact } from './impact';

describe('analyzePayrollImpact', () => {
  it('detecta aumento de piso com evidência em R$', () => {
    const result = analyzePayrollImpact([
      {
        changeType: 'MODIFIED',
        previousCategory: 'FLOOR',
        currentCategory: 'FLOOR',
        previous: {
          id: 'p1',
          number: '1',
          title: 'Piso salarial',
          text: 'O piso salarial será de R$ 1.800,00',
        },
        current: {
          id: 'c1',
          number: '1',
          title: 'Piso salarial',
          text: 'O piso salarial será de R$ 2.000,00',
        },
      },
    ]);
    assert.equal(result.summary.increases, 1);
    assert.equal(result.factors[0].code, 'FLOOR');
    assert.equal(result.factors[0].direction, 'INCREASE');
    assert.equal(result.factors[0].numericDelta?.previousValue, 1800);
    assert.equal(result.factors[0].numericDelta?.currentValue, 2000);
  });

  it('ignora UNCHANGED e categorias irrelevantes sem sinal', () => {
    const result = analyzePayrollImpact([
      {
        changeType: 'UNCHANGED',
        currentCategory: 'FLOOR',
        current: { id: 'x', text: 'igual' },
      },
      {
        changeType: 'MODIFIED',
        currentCategory: 'OTHER',
        previous: { id: 'a', text: 'preambulo institucional' },
        current: { id: 'b', text: 'preambulo revisado' },
      },
    ]);
    assert.equal(result.factors.length, 0);
  });
});
