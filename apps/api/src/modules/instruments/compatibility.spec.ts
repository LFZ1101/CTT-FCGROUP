import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scoreCompanyInstrumentCompatibility } from './compatibility';

test('pontua alta quando UF, categoria e sindicato coincidem', () => {
  const result = scoreCompanyInstrumentCompatibility(
    {
      id: 'c1',
      state: 'SP',
      city: 'São Paulo',
      mainCnae: 'Comércio',
      secondaryCnaes: [],
      companyUnions: [
        {
          kind: 'LABOR',
          confirmed: true,
          union: {
            id: 'u1',
            name: 'Sindicato Demo',
            states: ['SP'],
            categories: ['Comércio'],
            cities: ['São Paulo'],
          },
        },
      ],
    },
    {
      id: 'i1',
      territory: ['SP'],
      categories: ['Comércio'],
      parties: [{ unionId: 'u1', kind: 'LABOR' }],
      summary: 'Partes: Sindicato Demo',
    },
  );
  assert.ok(result.score >= 0.7);
  assert.ok(result.reasons.some((r) => /UF/i.test(r)));
});

test('pontua baixa sem sobreposição territorial nem sindical', () => {
  const result = scoreCompanyInstrumentCompatibility(
    {
      id: 'c2',
      state: 'RJ',
      mainCnae: '4711-3/01',
      companyUnions: [],
    },
    {
      id: 'i2',
      territory: ['SP'],
      categories: ['Metalurgia'],
      parties: [],
    },
  );
  assert.ok(result.score < 0.4);
});
