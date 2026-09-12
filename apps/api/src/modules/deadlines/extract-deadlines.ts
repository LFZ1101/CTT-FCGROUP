/**
 * Extração heurística de prazos críticos a partir de cláusulas.
 */

export type DeadlineClause = {
  id: string;
  number?: string | null;
  title?: string | null;
  text: string;
  page?: number | null;
};

export type ExtractedDeadline = {
  deadlineType: string;
  description: string;
  dueDate?: Date | null;
  startDate?: Date | null;
  sourcePage?: number | null;
  sourceExcerpt: string;
  confidence: number;
  clauseId: string;
};

const TYPE_PATTERNS: Array<{ type: string; re: RegExp; conf: number }> = [
  {
    type: 'EMPLOYER_OPPOSITION',
    re: /oposi[cç][aã]o\s+(sindical\s+)?(dos?\s+)?(empregador|patronal)|oposi[cç][aã]o\s+patronal/i,
    conf: 0.85,
  },
  {
    type: 'EMPLOYEE_OPPOSITION',
    re: /oposi[cç][aã]o\s+sindical|oposi[cç][aã]o\s+(dos?\s+)?empregad/i,
    conf: 0.85,
  },
  {
    type: 'SALARY_ADJUSTMENT',
    re: /data[\s-]*base|reajuste\s+salarial|corre[cç][aã]o\s+salarial/i,
    conf: 0.7,
  },
  {
    type: 'RETROACTIVE_PAYMENT',
    re: /retroativ/i,
    conf: 0.75,
  },
  {
    type: 'UNION_CONTRIBUTION',
    re: /contribui[cç][aã]o\s+(assistencial|sindical|confederativa)|taxa\s+negocial/i,
    conf: 0.7,
  },
  {
    type: 'BENEFIT_UPDATE',
    re: /vale[\s-]*alimenta[cç][aã]o|aux[ií]lio[\s-]*creche|ticket|benefício/i,
    conf: 0.55,
  },
];

function parsePtDate(raw: string): Date | null {
  const m = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]) - 1;
  let y = Number(m[3]);
  if (y < 100) y += 2000;
  const dt = new Date(Date.UTC(y, mo, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function daysFromText(text: string): number | null {
  const m = text.match(/prazo\s+de\s+(\d{1,3})\s+dias?/i) || text.match(/em\s+at[eé]\s+(\d{1,3})\s+dias?/i);
  return m ? Number(m[1]) : null;
}

export function extractDeadlinesFromClauses(
  clauses: DeadlineClause[],
  opts?: { baseDate?: Date | null },
): ExtractedDeadline[] {
  const out: ExtractedDeadline[] = [];
  const base = opts?.baseDate || null;

  for (const clause of clauses) {
    const blob = `${clause.title || ''}\n${clause.text}`;
    for (const pat of TYPE_PATTERNS) {
      if (!pat.re.test(blob)) continue;
      const excerpt = blob.replace(/\s+/g, ' ').trim().slice(0, 280);
      const dateMatch = blob.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);
      let dueDate: Date | null = dateMatch ? parsePtDate(dateMatch[0]) : null;
      const days = daysFromText(blob);
      if (!dueDate && days != null && base) {
        dueDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
      }
      out.push({
        deadlineType: pat.type,
        description:
          clause.title ||
          (pat.type === 'EMPLOYEE_OPPOSITION'
            ? 'Prazo de oposição sindical dos empregados'
            : pat.type === 'EMPLOYER_OPPOSITION'
              ? 'Prazo de oposição patronal'
              : `Prazo detectado (${pat.type})`),
        dueDate,
        startDate: base,
        sourcePage: clause.page ?? null,
        sourceExcerpt: excerpt,
        confidence: dueDate ? pat.conf : pat.conf * 0.75,
        clauseId: clause.id,
      });
    }
  }

  // dedupe by type+clause
  const seen = new Set<string>();
  return out.filter((d) => {
    const k = `${d.deadlineType}:${d.clauseId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
