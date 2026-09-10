/**
 * Adaptador dedicado ao Mediador (MTE) — complementa o scraper HTML genérico.
 * Não substitui o extrator genérico: adiciona padrões típicos de listagens/relatórios
 * do portal (números de registro, solicitações e anexos PDF).
 */

export type CandidateLink = { url: string; title?: string; contentType?: string };

const MEDIADOR_HOST = /(mediador\.mte\.gov\.br|www\.mediador\.mte\.gov\.br)/i;

export function isMediadorUrl(url: string): boolean {
  try {
    return MEDIADOR_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Extrai candidatos específicos do HTML do Mediador além de âncoras genéricas.
 * Inclui links em atributos data-*, iframes e padrões /ConsultaInstrumentos / visualizarPDF.
 */
export function extractMediadorLinks(html: string, baseUrl: string): CandidateLink[] {
  const results: CandidateLink[] = [];
  const seen = new Set<string>();

  const push = (raw: string, title?: string) => {
    try {
      const abs = new URL(raw, baseUrl).toString();
      if (seen.has(abs)) return;
      seen.add(abs);
      const isPdf = /\.pdf(?:$|[?#])/i.test(abs) || /visualizarpdf|download|anexo/i.test(abs);
      results.push({
        url: abs,
        title: title?.replace(/\s+/g, ' ').trim() || undefined,
        contentType: isPdf ? 'application/pdf' : 'text/html',
      });
    } catch {
      /* ignore */
    }
  };

  // Âncoras padrão (já cobertas pelo genérico, mas reforça título de registro)
  const anchorRe = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html))) {
    const href = m[1];
    const title = m[2].replace(/<[^>]+>/g, ' ');
    if (
      /consulta|instrumento|visualizar|pdf|solicitacao|nrreq|registro/i.test(`${href} ${title}`) ||
      /\.pdf(?:$|[?#])/i.test(href)
    ) {
      push(href, title);
    }
  }

  // data-href / data-url comuns em grids JS do portal
  const dataRe = /data-(?:href|url|link)=["']([^"']+)["']/gi;
  while ((m = dataRe.exec(html))) {
    push(m[1]);
  }

  // Números de solicitação/registro mencionados próximos a URLs relativas
  const regRe =
    /(?:NRReq|N[ºo]\s*Registro|Registro\s*Mediador)[:\s]*([A-Z0-9.\-\/]{5,40})/gi;
  while ((m = regRe.exec(html))) {
    const code = m[1];
    // Placeholder relativo: o monitor ainda precisa de URL absoluta real da fonte;
    // se houver path de consulta na base, anexa query.
    try {
      const u = new URL(baseUrl);
      u.searchParams.set('registro', code);
      push(u.toString(), `Registro Mediador ${code}`);
    } catch {
      /* ignore */
    }
  }

  return results.slice(0, 300);
}

/** Une genérico + mediador sem duplicar URL. */
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
