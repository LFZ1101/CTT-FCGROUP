import { extractCandidateLinks, normalizeUrl } from './scrape.js';

export type UnionAdapterId = 'generic-html' | 'pdf-listing' | 'wordpress-media' | 'custom';

export type UnionSourceConfig = {
  adapter?: UnionAdapterId;
  /** Palavras-chave extras para filtrar links (além do default). */
  linkKeywords?: string[];
  /** Regex (string) que a URL deve casar. */
  includePatterns?: string[];
  /** Regex (string) que exclui URL. */
  excludePatterns?: string[];
  /** Substring obrigatória no href (ex.: /wp-content/uploads/). */
  hrefContains?: string[];
  maxLinks?: number;
};

export type CandidateLink = { url: string; title?: string; contentType?: string };

const DEFAULT_KEYWORDS =
  /(cct|act|conven[cç][aã]o|acordo|coletiv|aditivo|prorroga|instrumento|mediador)/i;

function compilePatterns(patterns?: string[]) {
  if (!patterns?.length) return [];
  return patterns
    .map((p) => {
      try {
        return new RegExp(p, 'i');
      } catch {
        return null;
      }
    })
    .filter(Boolean) as RegExp[];
}

function applyFilters(links: CandidateLink[], config: UnionSourceConfig): CandidateLink[] {
  const include = compilePatterns(config.includePatterns);
  const exclude = compilePatterns(config.excludePatterns);
  const contains = (config.hrefContains || []).map((s) => s.toLowerCase());
  const extraKw = (config.linkKeywords || [])
    .map((k) => k.trim())
    .filter(Boolean)
    .join('|');
  const extraRe = extraKw ? new RegExp(extraKw, 'i') : null;

  return links.filter((l) => {
    const hay = `${l.url} ${l.title || ''}`;
    if (exclude.some((re) => re.test(l.url))) return false;
    if (contains.length && !contains.some((c) => l.url.toLowerCase().includes(c))) return false;
    if (include.length && !include.some((re) => re.test(l.url))) return false;
    if (extraRe && !extraRe.test(hay) && !DEFAULT_KEYWORDS.test(hay) && !/\.pdf(?:$|[?#])/i.test(l.url)) {
      return false;
    }
    return true;
  });
}

/** Extrai apenas PDFs e anexos típicos de listagens. */
export function extractPdfListingLinks(html: string, baseUrl: string): CandidateLink[] {
  const results: CandidateLink[] = [];
  const seen = new Set<string>();
  const regex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    try {
      const href = new URL(match[1], baseUrl).toString();
      if (!/\.pdf(?:$|[?#])/i.test(href)) continue;
      if (seen.has(href)) continue;
      seen.add(href);
      const title = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      results.push({ url: href, title, contentType: 'application/pdf' });
    } catch {
      /* ignore */
    }
  }
  // também data-href / iframe src
  const dataHref = /(?:data-href|data-url|data-file)=["']([^"']+\.pdf[^"']*)["']/gi;
  while ((match = dataHref.exec(html))) {
    try {
      const href = new URL(match[1], baseUrl).toString();
      if (seen.has(href)) continue;
      seen.add(href);
      results.push({ url: href, contentType: 'application/pdf' });
    } catch {
      /* ignore */
    }
  }
  return results.slice(0, 250);
}

/** Foco em uploads WordPress / mídia. */
export function extractWordpressMediaLinks(html: string, baseUrl: string): CandidateLink[] {
  const base = extractPdfListingLinks(html, baseUrl);
  const uploads = base.filter((l) => /\/wp-content\/uploads\//i.test(l.url));
  if (uploads.length) return uploads;
  // fallback: qualquer pdf se não houver uploads
  return base;
}

export function resolveUnionAdapter(config: unknown): UnionAdapterId {
  const c = (config || {}) as UnionSourceConfig;
  if (c.adapter && ['generic-html', 'pdf-listing', 'wordpress-media', 'custom'].includes(c.adapter)) {
    return c.adapter;
  }
  return 'generic-html';
}

/**
 * Extrai candidatos de um site sindical conforme adapter em Source.config.
 * Não substitui o adaptador Mediador.
 */
export function extractUnionCandidates(
  html: string,
  baseUrl: string,
  config: unknown,
): { adapter: UnionAdapterId; links: CandidateLink[] } {
  const cfg = (config || {}) as UnionSourceConfig;
  const adapter = resolveUnionAdapter(cfg);
  const max = Math.min(Math.max(cfg.maxLinks || 250, 1), 500);

  let raw: CandidateLink[] = [];
  if (adapter === 'pdf-listing' || adapter === 'custom') {
    raw = extractPdfListingLinks(html, baseUrl);
    if (adapter === 'custom' && !raw.length) {
      raw = extractCandidateLinks(html, baseUrl);
    }
  } else if (adapter === 'wordpress-media') {
    raw = extractWordpressMediaLinks(html, baseUrl);
  } else {
    raw = extractCandidateLinks(html, baseUrl);
  }

  const filtered = applyFilters(raw, cfg).slice(0, max);
  // normaliza URLs
  const links = filtered.map((l) => ({
    ...l,
    url: (() => {
      try {
        return normalizeUrl(l.url);
      } catch {
        return l.url;
      }
    })(),
  }));

  return { adapter, links };
}

export const UNION_ADAPTER_CATALOG = [
  {
    id: 'generic-html' as const,
    label: 'HTML genérico',
    description: 'Links com palavras-chave CCT/ACT/convenção e PDFs.',
  },
  {
    id: 'pdf-listing' as const,
    label: 'Listagem de PDFs',
    description: 'Prioriza hrefs .pdf e data-href de anexos.',
  },
  {
    id: 'wordpress-media' as const,
    label: 'WordPress / uploads',
    description: 'Foca em /wp-content/uploads/.',
  },
  {
    id: 'custom' as const,
    label: 'Customizado',
    description: 'PDF-first + filtros include/exclude/keywords em Source.config.',
  },
];
