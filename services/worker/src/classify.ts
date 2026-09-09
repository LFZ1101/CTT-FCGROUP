import { DocumentClass } from '@prisma/client';

export type ClassificationResult = {
  documentClass: DocumentClass;
  confidence: number;
  method: string;
  evidence: string[];
};

export function classifyDocument(text: string, title?: string | null): ClassificationResult {
  const haystack = `${title || ''}\n${text}`.toLowerCase();
  const evidence: string[] = [];

  const rules: Array<{ cls: DocumentClass; patterns: RegExp[]; weight: number }> = [
    {
      cls: DocumentClass.ADDENDUM,
      weight: 0.95,
      patterns: [/termo\s+aditivo/, /\baditivo\b/, /aditamento/],
    },
    {
      cls: DocumentClass.EXTENSION,
      weight: 0.94,
      patterns: [/prorroga[cç][aã]o/, /prorrogado/, /extens[aã]o\s+de\s+vig[eê]ncia/],
    },
    {
      cls: DocumentClass.CCT,
      weight: 0.92,
      patterns: [/conven[cç][aã]o\s+coletiva/, /\bcct\b/, /instrumento\s+coletivo\s+de\s+trabalho/],
    },
    {
      cls: DocumentClass.ACT,
      weight: 0.9,
      patterns: [/acordo\s+coletivo/, /\bact\b/, /acordo\s+coletivo\s+de\s+trabalho/],
    },
    {
      cls: DocumentClass.NOTICE,
      weight: 0.7,
      patterns: [/comunicado/, /edital/, /aviso\s+pr[eé]vio\s+coletivo/],
    },
  ];

  let best: ClassificationResult = {
    documentClass: DocumentClass.UNKNOWN,
    confidence: 0.2,
    method: 'heuristic-v1',
    evidence: [],
  };

  for (const rule of rules) {
    const hits = rule.patterns.filter((p) => p.test(haystack));
    if (!hits.length) continue;
    const confidence = Math.min(0.99, rule.weight + hits.length * 0.02);
    if (confidence > best.confidence) {
      best = {
        documentClass: rule.cls,
        confidence,
        method: 'heuristic-v1',
        evidence: hits.map((h) => h.source),
      };
    }
  }

  if (best.documentClass === DocumentClass.UNKNOWN && haystack.length < 80) {
    return {
      documentClass: DocumentClass.IRRELEVANT,
      confidence: 0.55,
      method: 'heuristic-v1',
      evidence: ['texto curto sem marcadores coletivos'],
    };
  }

  return { ...best, evidence: best.evidence.length ? best.evidence : evidence };
}
