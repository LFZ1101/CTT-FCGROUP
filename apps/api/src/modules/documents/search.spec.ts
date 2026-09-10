import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/** Espelha o ranking simples usado em DocumentsService.search */
function scoreHit(query: string, hay?: string | null, weight = 1) {
  if (!hay) return 0;
  const lower = query.toLowerCase();
  const idx = hay.toLowerCase().indexOf(lower);
  if (idx < 0) return 0;
  return weight * (idx === 0 ? 3 : 1) + Math.min(hay.length, 200) / 1000;
}

describe('document search ranking', () => {
  it('prefers title prefix matches over body matches', () => {
    const q = 'piso';
    const titleScore = scoreHit(q, 'Piso salarial da categoria', 5);
    const bodyScore = scoreHit(q, 'texto longo sem título contendo piso no meio', 1);
    assert.ok(titleScore > bodyScore);
  });

  it('returns zero when term is absent', () => {
    assert.equal(scoreHit('vale transporte', 'horas extras 50%'), 0);
  });
});
