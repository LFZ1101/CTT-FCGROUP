import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computePortfolioCoverage, classifySourceHealth } from './coverage';

describe('surveillance coverage', () => {
  it('calcula cobertura explicável', () => {
    const result = computePortfolioCoverage([
      {
        id: 'c1',
        legalName: 'A',
        companyUnions: [
          {
            status: 'CONFIRMED',
            confirmed: true,
            unionId: 'u1',
            union: { id: 'u1', name: 'U1', sources: [{ id: 's1', enabled: true }] },
          },
        ],
      },
      {
        id: 'c2',
        legalName: 'B',
        companyUnions: [],
      },
      {
        id: 'c3',
        legalName: 'C',
        companyUnions: [
          {
            status: 'CONFIRMED',
            confirmed: true,
            unionId: 'u2',
            union: { id: 'u2', name: 'U2', sources: [] },
          },
        ],
      },
    ]);
    assert.equal(result.totalCompanies, 3);
    assert.equal(result.monitoredCompanies, 1);
    assert.equal(result.companiesWithoutUnion, 1);
    assert.equal(result.companiesWithoutSource, 1);
    assert.ok(result.coveragePct > 30 && result.coveragePct < 40);
  });

  it('classifica saúde de fonte', () => {
    assert.equal(
      classifySourceHealth({
        id: 's',
        name: 'x',
        type: 'MEDIADOR_MTE',
        enabled: false,
      }),
      'DISABLED',
    );
    assert.equal(
      classifySourceHealth({
        id: 's',
        name: 'x',
        type: 'MEDIADOR_MTE',
        enabled: true,
        recentCheckStatus: 'BLOCKED',
        lastSuccessAt: new Date(),
      }),
      'FAILURE',
    );
    assert.equal(
      classifySourceHealth({
        id: 's',
        name: 'x',
        type: 'MEDIADOR_MTE',
        enabled: true,
        lastSuccessAt: new Date(),
      }),
      'OK',
    );
  });
});
