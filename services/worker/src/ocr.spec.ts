import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assessExtraction, maybeApplyOcr } from './ocr.ts';

describe('assessExtraction', () => {
  it('não marca OCR quando há texto denso', () => {
    const text = 'CLÁUSULA PRIMEIRA — PISO SALARIAL. '.repeat(20);
    const result = assessExtraction([{ text }, { text }]);
    assert.equal(result.needsOcr, false);
    assert.equal(result.reason, null);
    assert.ok(result.avgCharsPerPage >= 80);
  });

  it('marca OCR para PDF quase sem texto', () => {
    const result = assessExtraction([{ text: '' }, { text: '   ' }, { text: 'ab' }]);
    assert.equal(result.needsOcr, true);
    assert.equal(result.reason, 'texto_quase_vazio');
  });

  it('marca OCR quando metade das páginas está vazia', () => {
    const dense = 'texto coletivo com cláusulas e valores salariais suficientes aqui';
    const result = assessExtraction([
      { text: dense },
      { text: '' },
      { text: dense },
      { text: '' },
    ]);
    assert.equal(result.needsOcr, true);
    assert.ok(result.emptyPages >= 2);
  });
});

describe('maybeApplyOcr', () => {
  it('não tenta OCR quando não é necessário', async () => {
    const pages = [{ pageNumber: 1, text: 'CLÁUSULA. '.repeat(40) }];
    const assessment = assessExtraction(pages);
    const result = await maybeApplyOcr(Buffer.from('%PDF'), pages, assessment);
    assert.equal(result.ocr.attempted, false);
    assert.equal(result.ocr.reason, 'not_needed');
  });

  it('respeita OCR_ENABLED=false mesmo com texto vazio', async () => {
    const prev = process.env.OCR_ENABLED;
    delete process.env.OCR_ENABLED;
    const pages = [{ pageNumber: 1, text: '' }];
    const assessment = assessExtraction(pages);
    const result = await maybeApplyOcr(Buffer.from('%PDF'), pages, assessment);
    assert.equal(result.ocr.attempted, false);
    assert.equal(result.ocr.reason, 'ocr_disabled');
    if (prev !== undefined) process.env.OCR_ENABLED = prev;
  });
});
