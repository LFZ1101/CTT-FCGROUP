import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { estimateEmployeeFloorImpacts, extractFloorCentsFromText, parseBrlToCents } from './floor-impact';

describe('floor payroll impact', () => {
  it('parseia BRL para centavos', () => {
    assert.equal(parseBrlToCents('2.080,00'), 208000);
    assert.equal(parseBrlToCents('R$ 1950'), 195000);
  });

  it('extrai piso do texto', () => {
    const cents = extractFloorCentsFromText('O piso salarial fica em R$ 2.080,00 a partir de maio.');
    assert.equal(cents, 208000);
  });

  it('estima impactos abaixo do piso', () => {
    const r = estimateEmployeeFloorImpacts({
      floorCents: 208000,
      employees: [
        { id: '1', displayName: 'João', companyId: 'c', baseSalaryCents: 195000 },
        { id: '2', displayName: 'Ana', companyId: 'c', baseSalaryCents: 200000 },
        { id: '3', displayName: 'Lucas', companyId: 'c', baseSalaryCents: 225000 },
        { id: '4', displayName: 'Sem salário', companyId: 'c', baseSalaryCents: null },
      ],
    });
    assert.equal(r.impactedCount, 2);
    assert.equal(r.impacted[0].deltaCents, 13000);
    assert.equal(r.impacted[1].deltaCents, 8000);
    assert.equal(r.employeesWithoutSalary, 1);
  });
});
