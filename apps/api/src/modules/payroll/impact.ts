export type PayrollImpactFactor = {
  code:
    | 'FLOOR'
    | 'MEAL_VOUCHER'
    | 'OVERTIME'
    | 'WORKDAY'
    | 'BANK_OF_HOURS'
    | 'BENEFITS'
    | 'CONTRIBUTION'
    | 'HOLIDAY'
    | 'DEADLINE'
    | 'OTHER';
  label: string;
  direction: 'INCREASE' | 'DECREASE' | 'NEUTRAL' | 'UNKNOWN';
  confidence: number;
  changeType: string;
  evidence: {
    clauseNumber?: string | null;
    title?: string | null;
    previousSnippet?: string | null;
    currentSnippet?: string | null;
    previousClauseId?: string | null;
    currentClauseId?: string | null;
  };
  numericDelta?: {
    previousValue: number | null;
    currentValue: number | null;
    unit: 'BRL' | 'PERCENT' | 'HOURS' | 'UNKNOWN';
  };
  notes: string;
};

const PAYROLL_CATEGORIES: Record<string, PayrollImpactFactor['code']> = {
  FLOOR: 'FLOOR',
  WAGE: 'FLOOR',
  SALARY: 'FLOOR',
  MEAL_VOUCHER: 'MEAL_VOUCHER',
  MEAL: 'MEAL_VOUCHER',
  FOOD: 'MEAL_VOUCHER',
  OVERTIME: 'OVERTIME',
  WORKDAY: 'WORKDAY',
  JOURNEY: 'WORKDAY',
  BANK_OF_HOURS: 'BANK_OF_HOURS',
  HOUR_BANK: 'BANK_OF_HOURS',
  BENEFITS: 'BENEFITS',
  CONTRIBUTION: 'CONTRIBUTION',
  UNION_DUES: 'CONTRIBUTION',
  HOLIDAY: 'HOLIDAY',
  SUNDAY: 'HOLIDAY',
  DEADLINE: 'DEADLINE',
};

const LABELS: Record<PayrollImpactFactor['code'], string> = {
  FLOOR: 'Piso salarial',
  MEAL_VOUCHER: 'Vale-alimentação / refeição',
  OVERTIME: 'Hora extra',
  WORKDAY: 'Jornada',
  BANK_OF_HOURS: 'Banco de horas',
  BENEFITS: 'Benefícios',
  CONTRIBUTION: 'Contribuições',
  HOLIDAY: 'Domingos / feriados',
  DEADLINE: 'Prazos',
  OTHER: 'Outro impacto potencial',
};

export type ImpactClauseInput = {
  id: string | null;
  number?: string | null;
  title?: string | null;
  category?: string | null;
  text?: string | null;
  preview?: string | null;
};

export type ImpactDiffInput = {
  changeType: string;
  previous?: ImpactClauseInput | null;
  current?: ImpactClauseInput | null;
  previousCategory?: string | null;
  currentCategory?: string | null;
};

function mapCategory(raw?: string | null): PayrollImpactFactor['code'] | null {
  if (!raw) return null;
  const key = raw.toUpperCase().replace(/\s+/g, '_');
  return PAYROLL_CATEGORIES[key] || null;
}

function extractMoney(text: string): number | null {
  const m = text.match(/R\$\s*([\d.]+(?:,\d{2})?)/i) || text.match(/([\d.]+(?:,\d{2}))\s*reais/i);
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function extractPercent(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function directionFromNumbers(
  prev: number | null,
  curr: number | null,
): PayrollImpactFactor['direction'] {
  if (prev == null || curr == null) return 'UNKNOWN';
  if (curr > prev) return 'INCREASE';
  if (curr < prev) return 'DECREASE';
  return 'NEUTRAL';
}

/**
 * Motor heurístico de impacto em folha a partir de diffs de cláusulas.
 * Nunca inventa valor absoluto de folha — só fatores explicáveis com evidência.
 */
export function analyzePayrollImpact(diffs: ImpactDiffInput[]): {
  factors: PayrollImpactFactor[];
  summary: {
    totalFactors: number;
    increases: number;
    decreases: number;
    unknowns: number;
    payrollRelevantChanges: number;
  };
} {
  const factors: PayrollImpactFactor[] = [];

  for (const d of diffs) {
    if (d.changeType === 'UNCHANGED') continue;
    const cat =
      mapCategory(d.currentCategory) ||
      mapCategory(d.previousCategory) ||
      mapCategory(d.current?.category) ||
      mapCategory(d.previous?.category) ||
      'OTHER';

    // Ignora OTHER sem sinal lexical de folha
    const blob = `${d.previous?.title || ''} ${d.current?.title || ''} ${d.previous?.text || ''} ${d.current?.text || ''} ${d.previous?.preview || ''} ${d.current?.preview || ''}`;
    const looksPayroll =
      cat !== 'OTHER' ||
      /(piso|salar|vale|refei|aliment|hora\s*extra|jornada|banco\s*de\s*horas|adicional|contribu|feriado|domingo)/i.test(
        blob,
      );
    if (!looksPayroll) continue;

    const prevText = d.previous?.text || d.previous?.preview || '';
    const currText = d.current?.text || d.current?.preview || '';
    const prevMoney = extractMoney(prevText);
    const currMoney = extractMoney(currText);
    const prevPct = extractPercent(prevText);
    const currPct = extractPercent(currText);

    let numericDelta: PayrollImpactFactor['numericDelta'];
    let direction: PayrollImpactFactor['direction'] = 'UNKNOWN';
    let confidence = d.changeType === 'MODIFIED' ? 0.62 : 0.55;

    if (prevMoney != null || currMoney != null) {
      numericDelta = {
        previousValue: prevMoney,
        currentValue: currMoney,
        unit: 'BRL',
      };
      direction = directionFromNumbers(prevMoney, currMoney);
      confidence = Math.max(confidence, 0.78);
    } else if (prevPct != null || currPct != null) {
      numericDelta = {
        previousValue: prevPct,
        currentValue: currPct,
        unit: 'PERCENT',
      };
      direction = directionFromNumbers(prevPct, currPct);
      confidence = Math.max(confidence, 0.74);
    } else if (d.changeType === 'ADDED') {
      direction = 'INCREASE';
      confidence = 0.5;
    } else if (d.changeType === 'REMOVED') {
      direction = 'DECREASE';
      confidence = 0.5;
    }

    const code = cat;
    factors.push({
      code,
      label: LABELS[code],
      direction,
      confidence: Number(confidence.toFixed(2)),
      changeType: d.changeType,
      evidence: {
        clauseNumber: d.current?.number || d.previous?.number || null,
        title: d.current?.title || d.previous?.title || null,
        previousSnippet: prevText ? prevText.slice(0, 220) : null,
        currentSnippet: currText ? currText.slice(0, 220) : null,
        previousClauseId: d.previous?.id || null,
        currentClauseId: d.current?.id || null,
      },
      numericDelta,
      notes:
        direction === 'UNKNOWN'
          ? 'Alteração relevante detectada, mas sem valor numérico explícito suficiente para quantificar.'
          : 'Direção inferida a partir de evidência textual/numérica da cláusula.',
    });
  }

  return {
    factors,
    summary: {
      totalFactors: factors.length,
      increases: factors.filter((f) => f.direction === 'INCREASE').length,
      decreases: factors.filter((f) => f.direction === 'DECREASE').length,
      unknowns: factors.filter((f) => f.direction === 'UNKNOWN').length,
      payrollRelevantChanges: factors.length,
    },
  };
}
