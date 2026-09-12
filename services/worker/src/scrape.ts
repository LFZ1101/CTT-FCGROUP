export function normalizeUrl(raw: string) {
  const url = new URL(raw);
  url.hash = '';
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((key) => {
    url.searchParams.delete(key);
  });
  return url.toString();
}

export function extractCandidateLinks(html: string, baseUrl: string) {
  const results: { url: string; title?: string; contentType?: string }[] = [];
  const regex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const keywords = /(cct|act|conven[cç][aã]o|acordo|coletiv|aditivo|prorroga|instrumento|mediador)/i;
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    try {
      const href = new URL(match[1], baseUrl).toString();
      const title = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const isPdf = /\.pdf(?:$|[?#])/i.test(href);
      if (!isPdf && !keywords.test(`${href} ${title}`)) continue;
      if (seen.has(href)) continue;
      seen.add(href);
      results.push({ url: href, title, contentType: isPdf ? 'application/pdf' : 'text/html' });
    } catch {
      // ignore invalid URLs
    }
  }
  return results.slice(0, 250);
}
