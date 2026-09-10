import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractDeadlinesFromClauses } from './extract-deadlines';
import { buildOperationalSummary } from './operational-summary';

describe('deadlines extraction', () => {
  it('extrai oposição com prazo em dias', () => {
    const base = new Date('2026-01-01T00:00:00Z');
    const out = extractDeadlinesFromClauses(
      [
        {
          id: 'cl1',
          title: 'Contribuição assistencial',
          page: 38,
          text: 'O empregado poderá exercer oposição sindical no prazo de 10 dias contados da assinatura.',
        },
      ],
      { baseDate: base },
    );
    assert.ok(out.some((d) => d.deadlineType === 'EMPLOYEE_OPPOSITION'));
    const opp = out.find((d) => d.deadlineType === 'EMPLOYEE_OPPOSITION')!;
    assert.ok(opp.dueDate);
    assert.ok(opp.sourceExcerpt.includes('oposição'));
  });

  it('deduplica por tipo+cláusula', () => {
    const out = extractDeadlinesFromClauses([
      {
        id: 'cl1',
        text: 'oposição sindical dos empregados e oposição sindical dos empregados novamente',
      },
    ]);
    const ops = out.filter((d) => d.deadlineType === 'EMPLOYEE_OPPOSITION');
    assert.equal(ops.length, 1);
  });
});

describe('operational summary', () => {
  it('monta itens com evidência', () => {
    const summary = buildOperationalSummary([
      {
        id: '1',
        page: 10,
        title: 'Reajuste',
        text: 'Fica concedido reajuste salarial de 6,25% a partir da data-base.',
      },
      {
        id: '2',
        page: 12,
        title: 'Piso',
        text: 'O piso salarial será de R$ 2.080,00.',
      },
      {
        id: '3',
        page: 38,
        text: 'Oposição sindical no prazo de 10 dias.',
      },
    ]);
    assert.equal(summary.modelVersion, 'operational-summary-v1');
    assert.ok(summary.items.some((i) => i.code === 'SALARY_ADJUSTMENT' && i.value?.includes('6,25')));
    assert.ok(summary.items.some((i) => i.code === 'FLOOR' && i.evidence));
    assert.ok(summary.items.every((i) => i.clauseId && i.confidence > 0));
  });
});
