import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'path';
import { describe, it } from 'node:test';
import {
  buildMediadorConsultationUrl,
  detectMediadorBlock,
  extractMediadorLinks,
  isMediadorUrl,
  mergeCandidates,
} from './mediador.js';

describe('mediador adapter (real integration helpers)', () => {
  it('detects mediador hosts', () => {
    assert.equal(isMediadorUrl('https://www.mediador.mte.gov.br/consulta'), true);
    assert.equal(isMediadorUrl('https://example.com'), false);
  });

  it('builds consultation URLs', () => {
    const url = buildMediadorConsultationUrl({ registro: 'MR-2024.1', nrReq: '99' });
    assert.match(url, /mediador\.mte\.gov\.br/);
    assert.match(url, /registro=MR-2024/);
    assert.match(url, /nrReq=99/);
  });

  it('parses fixture HTML for PDF/consulta/data-href/iframe', () => {
    const html = readFileSync(
      resolve(process.cwd(), '../../fixtures/mediador/consulta-sample.html'),
      'utf8',
    );
    const links = extractMediadorLinks(html, 'https://www.mediador.mte.gov.br/');
    assert.ok(links.some((l) => /visualizarPDF/i.test(l.url)));
    assert.ok(links.some((l) => /solicitacao\/99/i.test(l.url)));
    assert.ok(links.some((l) => /anexo\/demo\.pdf/i.test(l.url)));
    assert.ok(links.some((l) => /registro=MR-2024/i.test(l.url)));
  });

  it('detects captcha/challenge blocks', () => {
    assert.equal(detectMediadorBlock('captcha challenge', 200).blocked, true);
    assert.equal(detectMediadorBlock('<html>ok</html>', 200).blocked, false);
    assert.equal(detectMediadorBlock('x', 403).blocked, true);
  });

  it('merges without duplicates', () => {
    const merged = mergeCandidates(
      [{ url: 'https://a', title: '1' }],
      [
        { url: 'https://a', title: 'dup' },
        { url: 'https://b', title: '2' },
      ],
    );
    assert.equal(merged.length, 2);
  });

  it('live probe is best-effort (skip if DNS/rede bloqueada)', async () => {
    const { fetchMediadorPage } = await import('./mediador.js');
    const result = await fetchMediadorPage('https://www.mediador.mte.gov.br/', {
      timeoutMs: 8000,
    });
    if (result.status === 0) {
      assert.match(String(result.reason || ''), /fetch|network|resolve|abort|ENOTFOUND|DNS|Failed/i);
      return;
    }
    assert.ok(result.status > 0);
    assert.equal(typeof result.html, 'string');
  });
});
