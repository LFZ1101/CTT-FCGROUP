import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rankUnionSuggestions, scoreCompanyUnionMatch } from './union-match';

describe('union-match assisted scoring', () => {
  const company = {
    id: 'c1',
    legalName: 'Demo Corp',
    mainCnae: '4711-3/01',
    secondaryCnaes: ['4712-1/00'],
    city: 'São Paulo',
    state: 'SP',
  };

  it('pontua alto para sindicato com UF/cidade/categoria', () => {
    const s = scoreCompanyUnionMatch(company, {
      id: 'u1',
      name: 'Sindicato dos Comerciários de São Paulo',
      scope: 'laboral',
      states: ['SP'],
      cities: ['São Paulo'],
      categories: ['4711-3/01', 'comercio'],
    });
    assert.ok(s.score >= 0.6);
    assert.equal(s.label.includes('potencialmente'), true);
    assert.ok(s.factors.some((f) => f.code === 'UF' && f.status === 'match'));
    assert.ok(s.factors.some((f) => f.code === 'KIND' && f.status === 'warning'));
  });

  it('ranqueia e filtra por score mínimo', () => {
    const ranked = rankUnionSuggestions(
      company,
      [
        {
          id: 'u1',
          name: 'Sindicato SP',
          states: ['SP'],
          cities: ['São Paulo'],
          categories: ['4711-3/01'],
        },
        {
          id: 'u2',
          name: 'Sindicato RJ',
          states: ['RJ'],
          cities: ['Rio de Janeiro'],
          categories: ['6201-5/00'],
        },
      ],
      { minScore: 0.35, limit: 5 },
    );
    assert.ok(ranked.length >= 1);
    assert.equal(ranked[0].unionId, 'u1');
  });
});
