import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extensionForMime, isAllowedMime } from './mime.js';
import { normalizeUrl, extractCandidateLinks } from './scrape.js';

test('aceita MIME de PDF e HTML', () => {
  assert.equal(isAllowedMime('application/pdf'), true);
  assert.equal(isAllowedMime('text/html'), true);
  assert.equal(isAllowedMime('application/zip'), false);
});

test('extensão por MIME', () => {
  assert.equal(extensionForMime('application/pdf'), 'pdf');
  assert.equal(extensionForMime('text/html'), 'html');
});

test('normaliza URL removendo hash e UTM', () => {
  const normalized = normalizeUrl('https://exemplo.com/cct.pdf?utm_source=x#frag');
  assert.equal(normalized, 'https://exemplo.com/cct.pdf');
});

test('extrai links candidatos a CCT/PDF', () => {
  const html = `
    <a href="/docs/cct-2026.pdf">CCT 2026</a>
    <a href="/sobre">Sobre</a>
    <a href="https://exemplo.com/acordo-coletivo">Acordo Coletivo</a>
  `;
  const links = extractCandidateLinks(html, 'https://sindicato.exemplo.com');
  assert.equal(links.length, 2);
  assert.ok(links.some((l) => l.url.includes('cct-2026.pdf')));
});
