/** Extrai piso salarial (R$) de texto/cláusulas/resumo operacional. */

export function parseBrlToCents(raw: string): number | null {
  const cleaned = raw
    .replace(/\s/g, '')
    .replace(/R\$\s?/i, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function extractFloorCentsFromText(text: string): number | null {
  if (!text) return null;
  const patterns = [
    /piso[^\d]{0,40}(?:salarial)?[^\d]{0,20}R\$\s*([\d.]+,\d{2}|\d+)/i,
    /sal[aá]rio[^\d]{0,20}m[ií]nimo[^\d]{0,20}R\$\s*([\d.]+,\d{2}|\d+)/i,
    /R\$\s*([\d.]+,\d{2}|\d+)[^\n]{0,40}piso/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const cents = parseBrlToCents(m[1]);
      if (cents) return cents;
    }
  }
  return null;
}

export function estimateEmployeeFloorImpacts(input: {
  floorCents: number;
  employees: Array<{
    id: string;
    displayName: string;
    jobTitle?: string | null;
    baseSalaryCents?: number | null;
    companyId: string;
  }>;
}) {
  const impacted = [];
  for (const e of input.employees) {
    if (e.baseSalaryCents == null) continue;
    if (e.baseSalaryCents < input.floorCents) {
      const delta = input.floorCents - e.baseSalaryCents;
      impacted.push({
        employeeId: e.id,
        displayName: e.displayName,
        jobTitle: e.jobTitle || null,
        companyId: e.companyId,
        currentSalaryCents: e.baseSalaryCents,
        floorCents: input.floorCents,
        deltaCents: delta,
        deltaBrl: Number((delta / 100).toFixed(2)),
      });
    }
  }
  return {
    floorCents: input.floorCents,
    floorBrl: Number((input.floorCents / 100).toFixed(2)),
    employeesAnalyzed: input.employees.filter((e) => e.baseSalaryCents != null).length,
    employeesWithoutSalary: input.employees.filter((e) => e.baseSalaryCents == null).length,
    impactedCount: impacted.length,
    estimatedMonthlyIncreaseCents: impacted.reduce((s, i) => s + i.deltaCents, 0),
    impacted,
    disclaimer:
      'Estimativa. Não altera folha automaticamente. Exige revisão humana e critérios oficiais.',
  };
}
