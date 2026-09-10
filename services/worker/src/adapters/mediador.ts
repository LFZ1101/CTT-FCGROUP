import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Cliente/adaptador Mediador (MTE).
 *
 * Integração real = HTTP + parsing de HTML/consulta pública.
 * Limitações conhecidas (anti-bot/JS/CAPTCHA) são tratadas com status explícito,
 * sem inventar documentos.
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

const MEDIADOR_HOST = /(mediador\.mte\.gov\.br|www\.mediador\.mte\.gov\.br)/i;
const DEFAULT_UA =
  'CCT-Intelligence-Mediador/1.0 (+compliance; research; contact-admin@local)';

export function isMediadorUrl(url: string): boolean {
  try {
    return MEDIADOR_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
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

export function detectMediadorBlock(html: string, status: number): {
  blocked: boolean;
  reason?: string;
} {
  if (status === 403 || status === 429) {
    return { blocked: true, reason: `HTTP ${status}` };
  }
  if (/captcha|cloudflare|access denied|desafio|verifica(ç|c)ão/i.test(html)) {
    return { blocked: true, reason: 'challenge_or_captcha' };
  }
  if (/enable javascript|javascript.*?required/i.test(html) && html.length < 2500) {
    return { blocked: true, reason: 'javascript_shell' };
  }
  return { blocked: false };
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': init?.userAgent || process.env.MEDIADOR_UA || DEFAULT_UA,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
    });
    const html = await response.text();
    const block = detectMediadorBlock(html, response.status);
    return {
      ok: response.ok && !block.blocked,
      status: response.status,
      finalUrl: response.url || url,
      html,
      blocked: block.blocked,
      reason: block.reason,
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
