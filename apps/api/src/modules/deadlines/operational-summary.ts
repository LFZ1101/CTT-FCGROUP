/**
 * Resumo operacional estruturado de CCT/ACT a partir de cláusulas.
 */

export type SummaryClause = {
  id: string;
  number?: string | null;
  title?: string | null;
  text: string;
  page?: number | null;
  category?: string | null;
};

export type SummaryItem = {
  code: string;
  label: string;
  value: string | null;
  clauseId: string | null;
  page: number | null;
  evidence: string | null;
  confidence: number;
};

const FIELDS: Array<{ code: string; label: string; re: RegExp; valueRe?: RegExp }> = [
  {
    code: 'SALARY_ADJUSTMENT',
    label: 'Reajuste salarial',
    re: /reajuste\s+salarial|corre[cç][aã]o\s+salarial/i,
    valueRe: /(\d{1,2}([.,]\d{1,2})?\s*%)/,
  },
  {
    code: 'FLOOR',
    label: 'Piso salarial',
    re: /piso\s+salarial|sal[aá]rio\s+normativo/i,
    valueRe: /R\$\s*[\d.]+,\d{2}|\d{1,3}(\.\d{3})*,\d{2}/i,
  },
  {
    code: 'MEAL_VOUCHER',
    label: 'Vale-alimentação',
    re: /vale[\s-]*alimenta[cç][aã]o|VA\b|ticket\s+alimenta/i,
    valueRe: /R\$\s*[\d.]+,\d{2}|\d{1,3}([.,]\d{2})?\s*(\/\s*dia)?/i,
  },
  {
    code: 'MEAL',
    label: 'Refeição',
    re: /vale[\s-]*refei[cç][aã]o|aux[ií]lio[\s-]*refei/i,
  },
  {
    code: 'OVERTIME',
    label: 'Hora extra',
    re: /hora\s+extra|horas?\s+extraordin[aá]rias/i,
    valueRe: /(\d{2,3}\s*%)/,
  },
  {
    code: 'HOUR_BANK',
    label: 'Banco de horas',
    re: /banco\s+de\s+horas/i,
  },
  {
    code: 'WORKDAY',
    label: 'Jornada',
    re: /jornada\s+de\s+trabalho|carga\s+hor[aá]ria/i,
  },
  {
    code: 'ADDITIONALS',
    label: 'Adicionais',
    re: /adicional\s+(noturno|de\s+insalubridade|de\s+periculosidade)/i,
  },
  {
    code: 'CASH_BREAK',
    label: 'Quebra de caixa',
    re: /quebra\s+de\s+caixa/i,
  },
  {
    code: 'CONTRIBUTIONS',
    label: 'Contribuições',
    re: /contribui[cç][aã]o\s+(assistencial|sindical|confederativa)|taxa\s+negocial/i,
  },
  {
    code: 'OPPOSITION',
    label: 'Oposição sindical',
    re: /oposi[cç][aã]o\s+sindical/i,
    valueRe: /prazo\s+de\s+\d{1,3}\s+dias?/i,
  },
  {
    code: 'SUNDAYS_HOLIDAYS',
    label: 'Domingos e feriados',
    re: /domingo|feriado/i,
  },
  {
    code: 'BENEFITS',
    label: 'Benefícios',
    re: /benef[ií]cio|aux[ií]lio/i,
  },
  {
    code: 'STABILITY',
    label: 'Estabilidades',
    re: /estabilidade/i,
  },
  {
    code: 'HOMOLOGATION',
    label: 'Homologações',
    re: /homologa[cç]/i,
  },
  {
    code: 'RETROACTIVE',
    label: 'Retroativos',
    re: /retroativ/i,
  },
];

export function buildOperationalSummary(clauses: SummaryClause[]): {
  modelVersion: string;
  items: SummaryItem[];
} {
  const items: SummaryItem[] = [];
  for (const field of FIELDS) {
    let best: SummaryItem | null = null;
    for (const clause of clauses) {
      const blob = `${clause.title || ''}\n${clause.text}`;
      if (!field.re.test(blob)) continue;
      const valueMatch = field.valueRe ? blob.match(field.valueRe) : null;
      const evidence = blob.replace(/\s+/g, ' ').trim().slice(0, 220);
      const candidate: SummaryItem = {
        code: field.code,
        label: field.label,
        value: valueMatch ? valueMatch[0] : null,
        clauseId: clause.id,
        page: clause.page ?? null,
        evidence,
        confidence: valueMatch ? 0.8 : 0.55,
      };
      if (!best || candidate.confidence > best.confidence) best = candidate;
    }
    if (best) items.push(best);
  }
  return { modelVersion: 'operational-summary-v1', items };
}
