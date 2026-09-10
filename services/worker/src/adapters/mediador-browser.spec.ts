import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fetchMediadorWithBrowser, isMediadorBrowserEnabled } from './mediador-browser.ts';

describe('mediador browser adapter', () => {
  it('desligado por padrão', () => {
    const prev = process.env.MEDIADOR_BROWSER;
    delete process.env.MEDIADOR_BROWSER;
    assert.equal(isMediadorBrowserEnabled(), false);
    if (prev !== undefined) process.env.MEDIADOR_BROWSER = prev;
  });

  it('retorna null quando browser não está habilitado', async () => {
    const prev = process.env.MEDIADOR_BROWSER;
    delete process.env.MEDIADOR_BROWSER;
    const result = await fetchMediadorWithBrowser('https://www.mediador.mte.gov.br/');
    assert.equal(result, null);
    if (prev !== undefined) process.env.MEDIADOR_BROWSER = prev;
  });

  it('quando habilitado sem playwright, reporta unavailable', async () => {
    const prev = process.env.MEDIADOR_BROWSER;
    process.env.MEDIADOR_BROWSER = 'true';
    const result = await fetchMediadorWithBrowser('https://www.mediador.mte.gov.br/', {
      timeoutMs: 1000,
    });
    assert.ok(result);
    assert.equal(result!.ok, false);
    assert.equal(result!.blocked, true);
    assert.match(String(result!.reason), /playwright_unavailable|Cannot find module|playwright/i);
    if (prev === undefined) delete process.env.MEDIADOR_BROWSER;
    else process.env.MEDIADOR_BROWSER = prev;
  });
});
