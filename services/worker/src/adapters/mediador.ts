import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { detectMediadorBlock, isMediadorUrl } from './mediador-detect.js';
import { fetchMediadorWithBrowser } from './mediador-browser.js';

export { detectMediadorBlock, isMediadorUrl } from './mediador-detect.js';

/**
 * Cliente/adaptador Mediador (MTE).
 *
 * Integração real = HTTP stealth + parsing; Playwright opcional (MEDIADOR_BROWSER).
 * Limitações conhecidas (CAPTCHA) → status BLOCKED explícito.
 * MEDIADOR_MODE=fixture usa HTML local (staging offline).
 */

export type CandidateLink = {
  url: string;
  title?: string;
  contentType?: string;
  registration?: string;
  requestNumber?: string;
};

export type MediadorFetchResult = {
  ok: boolean;
  status: number;
  finalUrl: string;
  html: string;
  blocked: boolean;
  reason?: string;
};

const DEFAULT_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Cookie jar simples por host para sessão HTTP stealth. */
const cookieJar = new Map<string, string>();
const lastUrlByHost = new Map<string, string>();

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function rememberCookies(url: string, response: Response) {
  const host = hostOf(url);
  if (!host) return;
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const raw = headers.getSetCookie?.() || [];
  const fallback = response.headers.get('set-cookie');
  const parts = raw.length ? raw : fallback ? [fallback] : [];
  if (!parts.length) return;
  const existing = cookieJar.get(host) || '';
  const jar = new Map<string, string>();
  for (const piece of existing.split(';').map((s) => s.trim()).filter(Boolean)) {
    const [k, ...rest] = piece.split('=');
    if (k) jar.set(k, rest.join('='));
  }
  for (const set of parts) {
    const first = set.split(';')[0];
    const [k, ...rest] = first.split('=');
    if (k) jar.set(k.trim(), rest.join('=').trim());
  }
  cookieJar.set(
    host,
    [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '),
  );
}

/** Monta URL de consulta pública por número de registro / NRReq quando possível. */
export function buildMediadorConsultationUrl(params: {
  baseUrl?: string;
  registro?: string;
  nrReq?: string;
}): string {
  const base =
    params.baseUrl ||
    'https://www.mediador.mte.gov.br/mediador/consultarInstrumentos';
  const u = new URL(base);
  if (params.registro) u.searchParams.set('registro', params.registro);
  if (params.nrReq) u.searchParams.set('nrReq', params.nrReq);
  return u.toString();
}

async function loadMediadorFixture(url: string): Promise<MediadorFetchResult | null> {
  if (process.env.MEDIADOR_MODE !== 'fixture') return null;
  const fixtureRel =
    process.env.MEDIADOR_FIXTURE_PATH || 'fixtures/mediador/consulta-sample.html';
  const candidates = [
    resolve(process.cwd(), fixtureRel),
    resolve(process.cwd(), '../../', fixtureRel),
    resolve(process.cwd(), '../..', fixtureRel),
  ];
  const path = candidates.find((p) => existsSync(p));
  if (!path) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      html: '',
      blocked: true,
      reason: 'fixture_missing',
    };
  }
  const html = readFileSync(path, 'utf8');
  return {
    ok: true,
    status: 200,
    finalUrl: url,
    html,
    blocked: false,
    reason: 'fixture',
  };
}

export async function fetchMediadorPage(
  url: string,
  init?: { timeoutMs?: number; userAgent?: string; attempts?: number },
): Promise<MediadorFetchResult> {
  const fixture = await loadMediadorFixture(url);
  if (fixture) return fixture;

  const browserResult = await fetchMediadorWithBrowser(url, init);
  if (browserResult) return browserResult;

  const attempts = Math.max(1, init?.attempts ?? Number(process.env.MEDIADOR_MAX_ATTEMPTS || 3));
  const baseDelay = Math.max(100, Number(process.env.MEDIADOR_RETRY_MS || 800));
  let last: MediadorFetchResult | null = null;

  for (let i = 0; i < attempts; i++) {
    last = await fetchMediadorPageOnce(url, init);
    const retryable =
      last.status === 429 ||
      last.status === 503 ||
      last.status === 502 ||
      (last.status === 0 && /abort|timeout|network|fetch/i.test(last.reason || ''));
    if (last.ok || last.blocked || !retryable || i === attempts - 1) {
      return last;
    }
    await new Promise((r) => setTimeout(r, baseDelay * (i + 1)));
  }

  return last!;
}

async function fetchMediadorPageOnce(
  url: string,
  init?: { timeoutMs?: number; userAgent?: string },
): Promise<MediadorFetchResult> {
  const timeoutMs = init?.timeoutMs ?? Number(process.env.MEDIADOR_TIMEOUT_MS || 20_000);
  const host = hostOf(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      'user-agent': init?.userAgent || process.env.MEDIADOR_UA || DEFAULT_UA,
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'upgrade-insecure-requests': '1',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': lastUrlByHost.has(host) ? 'same-origin' : 'none',
      'sec-fetch-user': '?1',
    };
    const cookie = cookieJar.get(host);
    if (cookie) headers.cookie = cookie;
    const referer = lastUrlByHost.get(host);
    if (referer) headers.referer = referer;

    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers,
    });
    rememberCookies(url, response);
    lastUrlByHost.set(host, response.url || url);
    const html = await response.text();
    const block = detectMediadorBlock(html, response.status);
    return {
      ok: response.ok && !block.blocked,
      status: response.status,
      finalUrl: response.url || url,
      html,
      blocked: block.blocked,
      reason: block.reason || (response.ok ? 'stealth_http' : undefined),
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      html: '',
      blocked: true,
      reason: String(error?.message || error),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extrai candidatos específicos do HTML do Mediador.
 * Inclui âncoras, data-*, PDFs e registros mencionados.
 */
export function extractMediadorLinks(html: string, baseUrl: string): CandidateLink[] {
  const results: CandidateLink[] = [];
  const seen = new Set<string>();

  const push = (raw: string, title?: string, extra?: Partial<CandidateLink>) => {
    try {
      const abs = new URL(raw, baseUrl).toString();
      if (seen.has(abs)) return;
      seen.add(abs);
      const isPdf = /\.pdf(?:$|[?#])/i.test(abs) || /visualizarpdf|download|anexo/i.test(abs);
      results.push({
        url: abs,
        title: title?.replace(/\s+/g, ' ').trim() || undefined,
        contentType: isPdf ? 'application/pdf' : 'text/html',
        ...extra,
      });
    } catch {
      /* ignore */
    }
  };

  const anchorRe = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html))) {
    const href = m[1];
    const title = m[2].replace(/<[^>]+>/g, ' ');
    if (
      /consulta|instrumento|visualizar|pdf|solicitacao|nrreq|registro|mediador/i.test(
        `${href} ${title}`,
      ) ||
      /\.pdf(?:$|[?#])/i.test(href)
    ) {
      push(href, title);
    }
  }

  const dataRe = /data-(?:href|url|link)=["']([^"']+)["']/gi;
  while ((m = dataRe.exec(html))) {
    push(m[1]);
  }

  const iframeRe = /<iframe[^>]+src=["']([^"']+)["']/gi;
  while ((m = iframeRe.exec(html))) {
    push(m[1], 'iframe mediador');
  }

  const regRe =
    /(?:NRReq|N[ºo]\s*Registro|Registro\s*Mediador|N[ºo]\s*MR)[:\s]*([A-Z0-9.\-\/]{5,40})/gi;
  while ((m = regRe.exec(html))) {
    const code = m[1];
    const consultation = buildMediadorConsultationUrl({
      baseUrl: isMediadorUrl(baseUrl) ? baseUrl : undefined,
      registro: code,
    });
    push(consultation, `Registro Mediador ${code}`, { registration: code });
  }

  // Tabelas típicas: colunas com links de "Visualizar" / "Instrumento"
  const rowRe =
    /<(?:tr|div)[^>]*>[\s\S]*?(?:CCT|ACT|Conven[cç][aã]o|Acordo Coletivo)[\s\S]*?<\/(?:tr|div)>/gi;
  while ((m = rowRe.exec(html))) {
    const chunk = m[0];
    const href = chunk.match(/href=["']([^"']+)["']/i)?.[1];
    if (href) {
      const title = chunk
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);
      push(href, title);
    }
  }

  return results.slice(0, 300);
}

export function mergeCandidates(
  generic: CandidateLink[],
  mediador: CandidateLink[],
): CandidateLink[] {
  const map = new Map<string, CandidateLink>();
  for (const c of [...generic, ...mediador]) {
    if (!map.has(c.url)) map.set(c.url, c);
  }
  return Array.from(map.values()).slice(0, 300);
}

/**
 * Fluxo completo de descoberta Mediador a partir de uma URL de fonte.
 */
export async function discoverFromMediadorSource(sourceUrl: string): Promise<{
  fetch: MediadorFetchResult;
  links: CandidateLink[];
}> {
  const fetched = await fetchMediadorPage(sourceUrl);
  if (!fetched.ok) {
    return { fetch: fetched, links: [] };
  }
  const links = extractMediadorLinks(fetched.html, fetched.finalUrl || sourceUrl);
  return { fetch: fetched, links };
}
