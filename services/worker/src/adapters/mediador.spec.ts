import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractMediadorLinks,
  isMediadorUrl,
  mergeCandidates,
} from './mediador.js';

describe('mediador adapter', () => {
  it('detects mediador hosts', () => {
    assert.equal(isMediadorUrl('https://www.mediador.mte.gov.br/consulta'), true);
    assert.equal(isMediadorUrl('https://example.com'), false);
  });

  it('extracts consulta/pdf anchors and data-href', () => {
    const html = `
      <a href="/ConsultaInstrumentos/visualizarPDF?id=12">Baixar PDF</a>
      <div data-href="/solicitacao/99">x</div>
      Registro Mediador: MR-2024.12345/SP
    `;
    const links = extractMediadorLinks(html, 'https://www.mediador.mte.gov.br/');
    assert.ok(links.some((l) => /visualizarPDF/i.test(l.url)));
    assert.ok(links.some((l) => /solicitacao\/99/i.test(l.url)));
    assert.ok(links.some((l) => /registro=MR-2024/i.test(l.url)));
  });

  it('merges without duplicates', () => {
    const a = [{ url: 'https://a', title: '1' }];
    const b = [
      { url: 'https://a', title: 'dup' },
      { url: 'https://b', title: '2' },
    ];
    const merged = mergeCandidates(a, b);
    assert.equal(merged.length, 2);
  });
});
