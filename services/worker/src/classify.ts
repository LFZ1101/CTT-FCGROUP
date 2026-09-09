import { DocumentClass } from '@prisma/client';

export type ClassificationEvidence = {
  page: number | null;
  snippet: string;
  pattern: string;
};

export type ClassificationResult = {
  documentClass: DocumentClass;
  confidence: number;
  method: string;
  evidence: ClassificationEvidence[];
};

function findSnippet(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  if (!match || match.index == null) return null;
  const start = Math.max(0, match.index - 40);
  const end = Math.min(text.length, match.index + match[0].length + 80);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function findPage(
  pages: Array<{ pageNumber: number; text: string }>,
  snippet: string,
): number | null {
  const needle = snippet.toLowerCase().slice(0, 60);
  for (const page of pages) {
    if (page.text.toLowerCase().includes(needle)) return page.pageNumber;
  }
  return pages[0]?.pageNumber ?? null;
}

export function classifyDocument(
  text: string,
  title?: string | null,
  pages: Array<{ pageNumber: number; text: string }> = [],
): ClassificationResult {
  const haystack = `${title || ''}\n${text}`;
  const lower = haystack.toLowerCase();

  const rules: Array<{ cls: DocumentClass; patterns: RegExp[]; weight: number }> = [
    {
      cls: DocumentClass.ADDENDUM,
      weight: 0.95,
      patterns: [/termo\s+aditivo/i, /\baditivo\b/i, /aditamento/i],
    },
    {
      cls: DocumentClass.EXTENSION,
      weight: 0.94,
      patterns: [/prorroga[cç][aã]o/i, /prorrogado/i, /extens[aã]o\s+de\s+vig[eê]ncia/i],
    },
    {
      cls: DocumentClass.CCT,
      weight: 0.92,
      patterns: [/conven[cç][aã]o\s+coletiva/i, /\bcct\b/i, /instrumento\s+coletivo\s+de\s+trabalho/i],
    },
    {
      cls: DocumentClass.ACT,
      weight: 0.9,
      patterns: [/acordo\s+coletivo/i, /\bact\b/i, /acordo\s+coletivo\s+de\s+trabalho/i],
    },
    {
      cls: DocumentClass.NOTICE,
      weight: 0.7,
      patterns: [/comunicado/i, /edital/i, /aviso\s+pr[eé]vio\s+coletivo/i],
    },
  ];

  let best: ClassificationResult = {
    documentClass: DocumentClass.UNKNOWN,
    confidence: 0.2,
    method: 'heuristic-v1',
    evidence: [],
  };

  for (const rule of rules) {
    const hits = rule.patterns
      .map((pattern) => {
        const snippet = findSnippet(haystack, pattern);
        if (!snippet) return null;
        return {
          page: pages.length ? findPage(pages, snippet) : null,
          snippet,
          pattern: pattern.source,
        } satisfies ClassificationEvidence;
      })
      .filter((x): x is ClassificationEvidence => Boolean(x));

    if (!hits.length) continue;
    const confidence = Math.min(0.99, rule.weight + hits.length * 0.02);
    if (confidence > best.confidence) {
      best = {
        documentClass: rule.cls,
        confidence,
        method: 'heuristic-v1',
        evidence: hits.slice(0, 5),
      };
    }
  }

  if (best.documentClass === DocumentClass.UNKNOWN && lower.length < 80) {
    return {
      documentClass: DocumentClass.IRRELEVANT,
      confidence: 0.55,
      method: 'heuristic-v1',
      evidence: [{ page: pages[0]?.pageNumber ?? null, snippet: text.slice(0, 120), pattern: 'short-text' }],
    };
  }

  return best;
}
