export type CompatibilityCompany = {
  id: string;
  state?: string | null;
  mainCnae?: string | null;
  secondaryCnaes?: string[];
  city?: string | null;
  companyUnions?: Array<{
    kind: string;
    confirmed: boolean;
    union: {
      id: string;
      name: string;
      states: string[];
      categories: string[];
      cities: string[];
    };
  }>;
};

export type CompatibilityInstrument = {
  id: string;
  territory: string[];
  categories: string[];
  parties?: Array<{ unionId: string; kind: string }>;
  summary?: string | null;
};

export type CompatibilityResult = {
  companyId: string;
  score: number;
  reasons: string[];
  factors: {
    territory: number;
    category: number;
    unionLink: number;
  };
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function overlapScore(left: string[], right: string[]) {
  if (!left.length || !right.length) return 0;
  const rightNorm = new Set(right.map(normalize));
  const hits = left.filter((x) => rightNorm.has(normalize(x))).length;
  return hits / Math.max(left.length, right.length);
}

/** Heurística v1: território (0.4) + categoria (0.35) + vínculo sindical (0.25). */
export function scoreCompanyInstrumentCompatibility(
  company: CompatibilityCompany,
  instrument: CompatibilityInstrument,
): CompatibilityResult {
  const reasons: string[] = [];
  const territoryTokens = [
    ...(instrument.territory || []),
    ...((instrument.summary || '').match(/\b[A-Z]{2}\b/g) || []),
  ];
  const companyTerritory = [company.state, company.city].filter(Boolean) as string[];

  let territory = 0;
  if (company.state && territoryTokens.some((t) => normalize(t) === normalize(company.state!))) {
    territory = 1;
    reasons.push(`UF da empresa (${company.state}) presente no território do instrumento`);
  } else if (companyTerritory.length && territoryTokens.length) {
    territory = overlapScore(companyTerritory, territoryTokens) * 0.6;
    if (territory > 0) reasons.push('Sobreposição parcial de território/cidade');
  } else if (!territoryTokens.length) {
    territory = 0.35;
    reasons.push('Instrumento sem território explícito (penalidade parcial)');
  }

  const unionCategories = (company.companyUnions || []).flatMap((cu) => cu.union.categories || []);
  const companyCats = [
    ...(company.mainCnae ? [company.mainCnae] : []),
    ...(company.secondaryCnaes || []),
    ...unionCategories,
  ];
  let category = overlapScore(companyCats, instrument.categories || []);
  if (category > 0) {
    reasons.push('Categoria/CNAE da empresa compatível com o instrumento');
  } else if ((instrument.categories || []).length === 0) {
    category = 0.3;
    reasons.push('Instrumento sem categoria explícita (penalidade parcial)');
  } else if (unionCategories.length === 0) {
    category = 0.15;
    reasons.push('Empresa sem categorias sindicais cadastradas');
  }

  const partyIds = new Set((instrument.parties || []).map((p) => p.unionId));
  const companyUnionIds = new Set((company.companyUnions || []).map((cu) => cu.union.id));
  let unionLink = 0;
  const shared = [...companyUnionIds].filter((id) => partyIds.has(id));
  if (shared.length) {
    unionLink = Math.min(1, shared.length / Math.max(1, partyIds.size || 1));
    reasons.push('Empresa vinculada a sindicato parte do instrumento');
  } else if ((company.companyUnions || []).length && territory >= 0.8) {
    // mesma UF dos sindicatos da empresa
    const unionStates = (company.companyUnions || []).flatMap((cu) => cu.union.states || []);
    if (company.state && unionStates.some((s) => normalize(s) === normalize(company.state!))) {
      unionLink = 0.35;
      reasons.push('Sindicatos da empresa atuam na mesma UF (vínculo indireto)');
    }
  }

  const score = Number(
    Math.min(1, territory * 0.4 + category * 0.35 + unionLink * 0.25).toFixed(4),
  );

  if (score >= 0.7) reasons.unshift('Alta compatibilidade sugerida');
  else if (score >= 0.4) reasons.unshift('Compatibilidade moderada — revisar');
  else reasons.unshift('Baixa compatibilidade — provável não enquadramento');

  return {
    companyId: company.id,
    score,
    reasons,
    factors: {
      territory: Number(territory.toFixed(4)),
      category: Number(category.toFixed(4)),
      unionLink: Number(unionLink.toFixed(4)),
    },
  };
}
