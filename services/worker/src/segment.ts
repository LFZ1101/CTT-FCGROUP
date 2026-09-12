import { ClauseCategory } from '@prisma/client';

export type SegmentedClause = {
  number: string | null;
  title: string | null;
  text: string;
  category: ClauseCategory;
  startPage: number | null;
  endPage: number | null;
  confidence: number;
  evidence: { page: number | null; snippet: string };
};

const CATEGORY_RULES: Array<{ category: ClauseCategory; patterns: RegExp[] }> = [
  { category: ClauseCategory.FLOOR, patterns: [/piso\s+salarial/, /sal[aá]rio\s+normativo/, /piso/] },
  { category: ClauseCategory.ADJUSTMENT, patterns: [/reajuste/, /corre[cç][aã]o\s+salarial/, /data[- ]base/] },
  { category: ClauseCategory.SALARY, patterns: [/remunera[cç][aã]o/, /sal[aá]rio/] },
  { category: ClauseCategory.MEAL_VOUCHER, patterns: [/vale[- ]alimenta[cç][aã]o/, /\bva\b/, /ticket\s+alimenta/] },
  { category: ClauseCategory.MEAL, patterns: [/vale[- ]refei[cç][aã]o/, /aux[ií]lio[- ]refei[cç][aã]o/] },
  { category: ClauseCategory.WORKDAY, patterns: [/jornada/, /hor[aá]rio\s+de\s+trabalho/] },
  { category: ClauseCategory.HOUR_BANK, patterns: [/banco\s+de\s+horas/] },
  { category: ClauseCategory.OVERTIME, patterns: [/hora\s+extra/, /horas?\s+extraordin/] },
  { category: ClauseCategory.ALLOWANCE, patterns: [/adicional/, /periculosidade/, /insalubridade/] },
  { category: ClauseCategory.CASHIER_BREAK, patterns: [/quebra\s+de\s+caixa/] },
  { category: ClauseCategory.DAYCARE, patterns: [/creche/, /aux[ií]lio[- ]creche/] },
  { category: ClauseCategory.CONTRIBUTION, patterns: [/contribui[cç][aã]o\s+assistencial/, /contribui[cç][aã]o\s+sindical/] },
  { category: ClauseCategory.VACATION, patterns: [/f[eé]rias/] },
  { category: ClauseCategory.STABILITY, patterns: [/estabilidade/] },
  { category: ClauseCategory.HOMOLOGATION, patterns: [/homologa[cç][aã]o/] },
  { category: ClauseCategory.SUNDAY_HOLIDAY, patterns: [/domingo/, /feriado/] },
  { category: ClauseCategory.HEALTH_SAFETY, patterns: [/sa[uú]de\s+e\s+seguran[cç]a/, /\bepi\b/, /medicina\s+do\s+trabalho/] },
  { category: ClauseCategory.BENEFITS, patterns: [/benef[ií]cio/, /plano\s+de\s+sa[uú]de/, /seguro\s+de\s+vida/] },
];

function categorize(text: string): { category: ClauseCategory; confidence: number } {
  const lower = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((p) => p.test(lower))) {
      return { category: rule.category, confidence: 0.75 };
    }
  }
  return { category: ClauseCategory.OTHER, confidence: 0.4 };
}

function pageForOffset(pages: Array<{ pageNumber: number; text: string }>, offset: number) {
  let cursor = 0;
  for (const page of pages) {
    const next = cursor + page.text.length + 2;
    if (offset < next) return page.pageNumber;
    cursor = next;
  }
  return pages.at(-1)?.pageNumber ?? null;
}

export function segmentClauses(
  pages: Array<{ pageNumber: number; text: string }>,
): SegmentedClause[] {
  const fullText = pages.map((p) => p.text).join('\n\n');
  if (!fullText.trim()) return [];

  const regex =
    /(?:CL[ÁA]USULA|CLAUSULA)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9ªº°.\-]+)\s*[-–—:]?\s*([^\n.<]{0,120})/gi;
  const matches = [...fullText.matchAll(regex)];

  if (!matches.length) {
    // fallback: blocos por parágrafo longo
    return pages
      .filter((p) => p.text.length > 80)
      .slice(0, 20)
      .map((p, idx) => {
        const { category, confidence } = categorize(p.text);
        return {
          number: null,
          title: `Bloco ${idx + 1}`,
          text: p.text.slice(0, 4000),
          category,
          startPage: p.pageNumber,
          endPage: p.pageNumber,
          confidence: confidence * 0.7,
          evidence: { page: p.pageNumber, snippet: p.text.slice(0, 180) },
        };
      });
  }

  const clauses: SegmentedClause[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = match.index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? fullText.length) : fullText.length;
    const body = fullText.slice(start, end).trim();
    const number = match[1]?.trim() || null;
    const title = (match[2] || '').replace(/\s+/g, ' ').trim() || null;
    const startPage = pageForOffset(pages, start);
    const endPage = pageForOffset(pages, Math.max(start, end - 1));
    const { category, confidence } = categorize(body);
    clauses.push({
      number,
      title,
      text: body.slice(0, 8000),
      category,
      startPage,
      endPage,
      confidence,
      evidence: { page: startPage, snippet: body.slice(0, 180) },
    });
  }
  return clauses.slice(0, 300);
}
