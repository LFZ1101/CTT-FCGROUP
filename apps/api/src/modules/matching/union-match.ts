/**
 * Score explicável empresa × sindicato (vínculo assistido).
 * Nunca afirma “este é o correto” — apenas candidatos com fatores.
 */

export type MatchCompany = {
  id: string;
  legalName: string;
  mainCnae?: string | null;
  secondaryCnaes?: string[];
  city?: string | null;
  state?: string | null;
};

export type MatchUnion = {
  id: string;
  name: string;
  acronym?: string | null;
  scope?: string | null;
  states: string[];
  cities: string[];
  categories: string[];
};

export type MatchFactor = {
  code: string;
  label: string;
  status: 'match' | 'partial' | 'missing' | 'warning';
  weight: number;
  contribution: number;
  detail: string;
};

export type UnionMatchSuggestion = {
  companyId: string;
  unionId: string;
  unionName: string;
  kind: 'LABOR' | 'EMPLOYER';
  score: number;
  label: string;
  factors: MatchFactor[];
};

function norm(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function inferKind(union: MatchUnion): 'LABOR' | 'EMPLOYER' {
  const blob = `${union.scope || ''} ${union.name} ${union.acronym || ''}`.toLowerCase();
  if (/patronal|empresarial|sind\.?\s*patron/i.test(blob)) return 'EMPLOYER';
  return 'LABOR';
}

export function scoreCompanyUnionMatch(company: MatchCompany, union: MatchUnion): UnionMatchSuggestion {
  const factors: MatchFactor[] = [];
  const kind = inferKind(union);

  // UF
  let ufContrib = 0;
  if (company.state && union.states?.length) {
    const hit = union.states.some((s) => norm(s) === norm(company.state!));
    ufContrib = hit ? 0.25 : 0;
    factors.push({
      code: 'UF',
      label: 'UF compatível',
      status: hit ? 'match' : 'missing',
      weight: 0.25,
      contribution: ufContrib,
      detail: hit
        ? `UF da empresa (${company.state}) coberta pelo sindicato`
        : `UF ${company.state} fora de ${union.states.join(', ')}`,
    });
  } else {
    factors.push({
      code: 'UF',
      label: 'UF compatível',
      status: 'partial',
      weight: 0.25,
      contribution: 0.08,
      detail: 'UF da empresa ou abrangência do sindicato incompleta',
    });
    ufContrib = 0.08;
  }

  // Município
  let cityContrib = 0;
  if (company.city && union.cities?.length) {
    const hit = union.cities.some((c) => norm(c) === norm(company.city!));
    cityContrib = hit ? 0.2 : 0.02;
    factors.push({
      code: 'CITY',
      label: 'Município compatível',
      status: hit ? 'match' : 'missing',
      weight: 0.2,
      contribution: cityContrib,
      detail: hit
        ? `Município ${company.city} na abrangência`
        : `Município ${company.city} não listado na abrangência`,
    });
  } else if (!union.cities?.length) {
    cityContrib = 0.06;
    factors.push({
      code: 'CITY',
      label: 'Município compatível',
      status: 'partial',
      weight: 0.2,
      contribution: cityContrib,
      detail: 'Sindicato sem municípios explícitos (abrangência ampla possível)',
    });
  } else {
    factors.push({
      code: 'CITY',
      label: 'Município compatível',
      status: 'partial',
      weight: 0.2,
      contribution: 0.04,
      detail: 'Empresa sem município cadastrado',
    });
    cityContrib = 0.04;
  }

  // CNAE / categoria
  const companyCats = [
    ...(company.mainCnae ? [company.mainCnae] : []),
    ...(company.secondaryCnaes || []),
  ];
  let catContrib = 0;
  if (companyCats.length && union.categories?.length) {
    const uSet = new Set(union.categories.map(norm));
    const hits = companyCats.filter((c) => uSet.has(norm(c)) || [...uSet].some((u) => norm(c).includes(u) || u.includes(norm(c))));
    const ratio = hits.length / Math.max(companyCats.length, 1);
    catContrib = Math.min(0.3, 0.3 * Math.max(ratio, hits.length ? 0.5 : 0));
    factors.push({
      code: 'CNAE',
      label: 'CNAE / categoria relacionada',
      status: hits.length ? 'match' : 'missing',
      weight: 0.3,
      contribution: catContrib,
      detail: hits.length
        ? `Categorias relacionadas: ${hits.slice(0, 3).join(', ')}`
        : 'Sem sobreposição explícita CNAE×categorias do sindicato',
    });
  } else {
    catContrib = 0.08;
    factors.push({
      code: 'CNAE',
      label: 'CNAE / categoria relacionada',
      status: 'partial',
      weight: 0.3,
      contribution: catContrib,
      detail: 'CNAE da empresa ou categorias do sindicato incompletos',
    });
  }

  // Categoria econômica / profissional (heurística por texto)
  let econContrib = 0.05;
  const econHit = /comercio|industria|servicos|saude|transporte|metalurg|quimic|aliment/i.test(
    `${union.name} ${(union.categories || []).join(' ')}`,
  );
  if (econHit) {
    econContrib = 0.1;
    factors.push({
      code: 'ECON',
      label: 'Categoria econômica provável',
      status: 'partial',
      weight: 0.1,
      contribution: econContrib,
      detail: 'Indícios de categoria econômica no nome/categorias do sindicato',
    });
  } else {
    factors.push({
      code: 'ECON',
      label: 'Categoria econômica provável',
      status: 'partial',
      weight: 0.1,
      contribution: econContrib,
      detail: 'Categoria econômica não inferida com alta confiança',
    });
  }

  // Tipo laboral/patronal — sempre warning para validação humana
  factors.push({
    code: 'KIND',
    label: kind === 'LABOR' ? 'Sindicato laboral' : 'Sindicato patronal',
    status: 'warning',
    weight: 0.15,
    contribution: 0.08,
    detail:
      kind === 'LABOR'
        ? 'Sindicato laboral requer validação humana'
        : 'Sindicato patronal requer validação humana',
  });

  const score = Math.min(
    0.99,
    Math.round((ufContrib + cityContrib + catContrib + econContrib + 0.08) * 1000) / 1000,
  );

  return {
    companyId: company.id,
    unionId: union.id,
    unionName: union.name,
    kind,
    score,
    label: 'Sindicato potencialmente aplicável',
    factors,
  };
}

export function rankUnionSuggestions(
  company: MatchCompany,
  unions: MatchUnion[],
  opts?: { minScore?: number; limit?: number },
): UnionMatchSuggestion[] {
  const min = opts?.minScore ?? 0.25;
  const limit = opts?.limit ?? 8;
  return unions
    .map((u) => scoreCompanyUnionMatch(company, u))
    .filter((s) => s.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
