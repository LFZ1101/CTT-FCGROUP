/**
 * Cobertura da carteira — vigilância sindical.
 */

export type CoverageCompany = {
  id: string;
  legalName: string;
  tradeName?: string | null;
  companyUnions: Array<{
    status: string;
    confirmed: boolean;
    unionId: string;
    union: { id: string; name: string; sources: Array<{ id: string; enabled: boolean; lastSuccessAt?: Date | null }> };
  }>;
};

export type CoverageSource = {
  id: string;
  name: string;
  type: string;
  unionId?: string | null;
  enabled: boolean;
  lastCheckedAt?: Date | null;
  lastSuccessAt?: Date | null;
  recentCheckStatus?: string | null;
};

export function isCompanyMonitored(company: CoverageCompany): boolean {
  const confirmed = company.companyUnions.filter(
    (l) => l.status === 'CONFIRMED' || l.confirmed === true,
  );
  if (!confirmed.length) return false;
  return confirmed.some((l) =>
    (l.union.sources || []).some((s) => s.enabled),
  );
}

export function computePortfolioCoverage(companies: CoverageCompany[]): {
  coveragePct: number;
  monitoredCompanies: number;
  totalCompanies: number;
  companiesWithoutUnion: number;
  companiesWithoutSource: number;
  explanation: string;
} {
  const total = companies.length;
  if (!total) {
    return {
      coveragePct: 0,
      monitoredCompanies: 0,
      totalCompanies: 0,
      companiesWithoutUnion: 0,
      companiesWithoutSource: 0,
      explanation: 'Nenhuma empresa ativa na carteira.',
    };
  }
  let withoutUnion = 0;
  let withoutSource = 0;
  let monitored = 0;
  for (const c of companies) {
    const confirmed = c.companyUnions.filter((l) => l.status === 'CONFIRMED' || l.confirmed);
    if (!confirmed.length) {
      withoutUnion++;
      continue;
    }
    const hasSource = confirmed.some((l) => (l.union.sources || []).some((s) => s.enabled));
    if (!hasSource) withoutSource++;
    else monitored++;
  }
  const coveragePct = Math.round((monitored / total) * 1000) / 10;
  return {
    coveragePct,
    monitoredCompanies: monitored,
    totalCompanies: total,
    companiesWithoutUnion: withoutUnion,
    companiesWithoutSource: withoutSource,
    explanation: `${monitored}/${total} empresas com vínculo confirmado e ao menos uma fonte sindical ativa.`,
  };
}

export function classifySourceHealth(
  source: CoverageSource,
  now = Date.now(),
  staleMs = 12 * 60 * 60 * 1000,
): 'OK' | 'STALE' | 'FAILURE' | 'DISABLED' {
  if (!source.enabled) return 'DISABLED';
  if (source.recentCheckStatus && /FAIL|ERROR|BLOCKED/i.test(source.recentCheckStatus)) {
    return 'FAILURE';
  }
  const last = source.lastSuccessAt || source.lastCheckedAt;
  if (!last) return 'STALE';
  if (now - new Date(last).getTime() > staleMs) return 'STALE';
  return 'OK';
}
