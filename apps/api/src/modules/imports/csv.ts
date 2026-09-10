/** Parser CSV leve (sem dependência): RFC 4180 básico + BOM. */

export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
  rawRowCount: number;
};

function normalizeHeader(h: string) {
  return h
    .replace(/^\uFEFF/, '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Mapeia aliases comuns de colunas para chaves canônicas. */
export const COMPANY_HEADER_ALIASES: Record<string, string> = {
  cnpj: 'cnpj',
  cnpj_empresa: 'cnpj',
  razao_social: 'legalName',
  razaosocial: 'legalName',
  legal_name: 'legalName',
  nome: 'legalName',
  empresa: 'legalName',
  nome_fantasia: 'tradeName',
  fantasia: 'tradeName',
  trade_name: 'tradeName',
  cnae: 'mainCnae',
  cnae_principal: 'mainCnae',
  main_cnae: 'mainCnae',
  cidade: 'city',
  city: 'city',
  municipio: 'city',
  uf: 'state',
  estado: 'state',
  state: 'state',
  funcionarios: 'employeeCount',
  employee_count: 'employeeCount',
  qtd_funcionarios: 'employeeCount',
};

export const LINK_HEADER_ALIASES: Record<string, string> = {
  cnpj: 'companyCnpj',
  cnpj_empresa: 'companyCnpj',
  company_cnpj: 'companyCnpj',
  empresa_cnpj: 'companyCnpj',
  cnpj_sindicato: 'unionCnpj',
  union_cnpj: 'unionCnpj',
  sindicato_cnpj: 'unionCnpj',
  sindicato: 'unionName',
  nome_sindicato: 'unionName',
  union_name: 'unionName',
  union: 'unionName',
  tipo: 'kind',
  kind: 'kind',
  tipo_sindicato: 'kind',
  status: 'status',
  confirmado: 'status',
};

export function parseCsv(text: string, maxRows = 1000): CsvParseResult {
  const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!cleaned.trim()) {
    return { headers: [], rows: [], rawRowCount: 0 };
  }

  const lines: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inQuotes) {
      if (ch === '"') {
        if (cleaned[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      field = '';
      if (row.some((c) => c.trim().length)) lines.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim().length)) lines.push(row);

  if (!lines.length) return { headers: [], rows: [], rawRowCount: 0 };

  const headers = lines[0].map((h) => normalizeHeader(h));
  const dataLines = lines.slice(1);
  const rawRowCount = dataLines.length;
  const limited = dataLines.slice(0, maxRows);
  const rows = limited.map((cols) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? '').trim();
    });
    return obj;
  });

  return { headers, rows, rawRowCount };
}

export function mapRow(
  row: Record<string, string>,
  aliases: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const canonical = aliases[key] || key;
    if (value !== undefined && value !== '') out[canonical] = value;
  }
  return out;
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function isValidCnpjDigits(cnpj: string) {
  const d = onlyDigits(cnpj);
  if (d.length !== 14) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  const calc = (base: string, factors: number[]) => {
    let sum = 0;
    for (let i = 0; i < factors.length; i++) sum += Number(base[i]) * factors[i];
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const n1 = calc(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const n2 = calc(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return n1 === Number(d[12]) && n2 === Number(d[13]);
}
