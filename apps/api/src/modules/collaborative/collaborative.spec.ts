import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  originTrustLabel,
  requestGroupKey,
  titleSimilarity,
  unionMatchKey,
  CONSENT_TERM_VERSION,
} from './collaborative.service';

describe('collaborative network helpers', () => {
  it('unionMatchKey prefers CNPJ', () => {
    assert.equal(
      unionMatchKey({ cnpj: '12.345.678/0001-90', name: 'Sind X', states: ['PR'] }),
      'cnpj:12345678000190',
    );
  });

  it('unionMatchKey falls back to name+uf', () => {
    const a = unionMatchKey({ name: 'Sindicato dos Metalúrgicos', states: ['SP', 'PR'] });
    const b = unionMatchKey({ name: 'Sindicato dos Metalurgicos', states: ['PR', 'SP'] });
    assert.equal(a, b);
    assert.match(a, /^name:/);
  });

  it('requestGroupKey aggregates logically', () => {
    assert.equal(requestGroupKey('u1', 'cct', '2026/2027'), 'u1|CCT|2026/2027');
    assert.equal(requestGroupKey('u1'), 'u1|CCT|ANY');
  });

  it('originTrustLabel differentiates official vs collaborative', () => {
    const official = originTrustLabel({ sourceType: 'MEDIADOR_MTE' });
    const collab = originTrustLabel({ collaborative: true, officialConfirmed: false });
    const confirmed = originTrustLabel({ collaborative: true, officialConfirmed: true });
    assert.equal(official.level, 'OFFICIAL');
    assert.equal(collab.level, 'COLLAB_VALIDATED');
    assert.equal(confirmed.level, 'COLLAB_CONFIRMED');
    assert.notEqual(official.tone, collab.tone);
  });

  it('titleSimilarity high for same CCT titles and low for unrelated', () => {
    const high = titleSimilarity(
      'CCT Sindicato Metalúrgicos 2026/2027',
      'CCT Sindicato Metalurgicos 2026 2027',
    );
    const low = titleSimilarity('CCT Metalúrgicos 2026', 'Regimento interno escola municipal');
    assert.ok(high >= 0.72);
    assert.ok(low < 0.4);
  });

  it('consent term version is audited constant', () => {
    assert.equal(CONSENT_TERM_VERSION, 'collaborative-share-v1');
  });
});
