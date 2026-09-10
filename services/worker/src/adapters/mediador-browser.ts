/**
 * Fetch Mediador via Playwright (opcional).
 * Ativar com MEDIADOR_BROWSER=true|playwright.
 * Requer `playwright` instalado no worker (não é dependência fixa do monorepo).
 */

import type { MediadorFetchResult } from './mediador.js';
import { detectMediadorBlock } from './mediador-detect.js';

export function isMediadorBrowserEnabled() {
  const v = (process.env.MEDIADOR_BROWSER || '').toLowerCase();
  return v === 'true' || v === '1' || v === 'playwright';
}

async function loadPlaywright(): Promise<{ chromium: any } | null> {
  try {
    const dynImport = new Function('s', 'return import(s)') as (s: string) => Promise<any>;
    return await dynImport('playwright');
  } catch {
    return null;
  }
}

export async function fetchMediadorWithBrowser(
  url: string,
  init?: { timeoutMs?: number; userAgent?: string },
): Promise<MediadorFetchResult | null> {
  if (!isMediadorBrowserEnabled()) return null;

  const pw = await loadPlaywright();
  if (!pw?.chromium) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      html: '',
      blocked: true,
      reason: 'playwright_unavailable',
    };
  }

  const timeoutMs = init?.timeoutMs ?? Number(process.env.MEDIADOR_TIMEOUT_MS || 45_000);
  const browser = await pw.chromium.launch({
    headless: process.env.MEDIADOR_BROWSER_HEADLESS !== 'false',
    args: ['--disable-blink-features=AutomationControlled'],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        init?.userAgent ||
        process.env.MEDIADOR_UA ||
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'pt-BR',
      extraHTTPHeaders: {
        'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
    });
    const page = await context.newPage();
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });
    await page.waitForTimeout(Number(process.env.MEDIADOR_BROWSER_WAIT_MS || 1500));
    const html = await page.content();
    const status = response?.status() || 0;
    const finalUrl = page.url() || url;
    const block = detectMediadorBlock(html, status);
    return {
      ok: status >= 200 && status < 400 && !block.blocked,
      status,
      finalUrl,
      html,
      blocked: block.blocked,
      reason: block.reason || (block.blocked ? undefined : 'browser'),
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      html: '',
      blocked: true,
      reason: String(err?.message || err).slice(0, 200),
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}
