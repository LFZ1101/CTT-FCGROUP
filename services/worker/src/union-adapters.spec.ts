import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractPdfListingLinks,
  extractUnionCandidates,
  extractWordpressMediaLinks,
  resolveUnionAdapter,
} from './union-adapters.js';

const HTML = `
<html><body>
  <a href="/docs/cct-2026.pdf">CCT 2026</a>
  <a href="/wp-content/uploads/2026/01/convenção.pdf">Convenção</a>
  <a href="/sobre-nos">Sobre</a>
  <a href="/noticias/cct-metalurgicos">Notícia CCT</a>
  <a data-href="/files/acordo.pdf">Baixar</a>
</body></html>
`;

describe('union adapters', () => {
  it('resolveUnionAdapter defaults to generic-html', () => {
    assert.equal(resolveUnionAdapter(null), 'generic-html');
    assert.equal(resolveUnionAdapter({ adapter: 'wordpress-media' }), 'wordpress-media');
  });

  it('pdf-listing captura PDFs e data-href', () => {
    const links = extractPdfListingLinks(HTML, 'https://sindicato.example');
    assert.ok(links.some((l) => l.url.includes('cct-2026.pdf')));
    assert.ok(links.some((l) => l.url.includes('acordo.pdf')));
    assert.ok(!links.some((l) => l.url.includes('sobre-nos')));
  });

  it('wordpress-media prioriza uploads', () => {
    const links = extractWordpressMediaLinks(HTML, 'https://sindicato.example');
    assert.equal(links.length, 1);
    assert.match(links[0].url, /wp-content\/uploads/);
  });

  it('extractUnionCandidates aplica excludePatterns', () => {
    const { adapter, links } = extractUnionCandidates(HTML, 'https://sindicato.example', {
      adapter: 'pdf-listing',
      excludePatterns: ['acordo\\.pdf'],
    });
    assert.equal(adapter, 'pdf-listing');
    assert.ok(links.every((l) => !l.url.includes('acordo.pdf')));
    assert.ok(links.some((l) => l.url.includes('cct-2026.pdf')));
  });
});
