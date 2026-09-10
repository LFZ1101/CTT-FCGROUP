export type FieldEvidence = {
  field: string;
  value: string;
  confidence: number;
  page: number | null;
  evidence: string;
};

export type ExtractedMetadata = {
  title?: string;
  startDate?: string;
  endDate?: string;
  baseDate?: string;
  registration?: string;
  requestNumber?: string;
  category?: string;
  territory?: string[];
  parties?: string[];
  cnpjs?: string[];
  fields: FieldEvidence[];
};

function findPage(
  pages: Array<{ pageNumber: number; text: string }>,
  snippet: string,
): number | null {
  const needle = snippet.toLowerCase().slice(0, 80);
  for (const page of pages) {
    if (page.text.toLowerCase().includes(needle)) return page.pageNumber;
  }
  return pages[0]?.pageNumber ?? null;
}

function normalizeDate(raw: string): string | null {
  const m = raw.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = m[2].padStart(2, '0');
  let year = m[3];
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month}-${day}`;
}

function pushField(
  fields: FieldEvidence[],
  pages: Array<{ pageNumber: number; text: string }>,
  field: string,
  value: string,
  confidence: number,
  evidence: string,
) {
  fields.push({
    field,
    value,
    confidence,
    page: findPage(pages, evidence),
    evidence: evidence.slice(0, 220),
  });
}

export function extractMetadata(
  pages: Array<{ pageNumber: number; text: string }>,
  title?: string | null,
): ExtractedMetadata {
  const fullText = pages.map((p) => p.text).join('\n\n');
  const fields: FieldEvidence[] = [];
  const result: ExtractedMetadata = { fields };

  if (title?.trim()) {
    result.title = title.trim();
    pushField(fields, pages, 'title', result.title, 0.7, title.trim());
  } else {
    const titleMatch = fullText.match(
      /(conven[cç][aã]o coletiva[^\n.]{0,120}|acordo coletivo[^\n.]{0,120}|termo aditivo[^\n.]{0,120})/i,
    );
    if (titleMatch) {
      result.title = titleMatch[1].replace(/\s+/g, ' ').trim();
      pushField(fields, pages, 'title', result.title, 0.8, titleMatch[0]);
    }
  }

  const validity =
    fullText.match(
      /vig[eê]ncia[:\s]+(?:de\s+)?(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\s*(?:a|at[eé]|até|-|–|—)\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
    ) ||
    fullText.match(
      /(?:de\s+)?(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\s*(?:a|at[eé]|até)\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}).{0,40}vig[eê]ncia/i,
    );

  if (validity) {
    const start = normalizeDate(validity[1]);
    const end = normalizeDate(validity[2]);
    if (start) {
      result.startDate = start;
      pushField(fields, pages, 'startDate', start, 0.9, validity[0]);
    }
    if (end) {
      result.endDate = end;
      pushField(fields, pages, 'endDate', end, 0.9, validity[0]);
    }
  }

  const baseDateMatch = fullText.match(
    /data[- ]base[:\s]+([A-Za-zÀ-ÿ]{3,12}(?:\s+de\s+\d{4})?|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
  );
  if (baseDateMatch) {
    result.baseDate = baseDateMatch[1].replace(/\s+/g, ' ').trim();
    pushField(fields, pages, 'baseDate', result.baseDate, 0.85, baseDateMatch[0]);
  }

  const registrationMatch =
    fullText.match(/registro\s*(?:no\s*)?mediador[:\s]+([A-Z0-9.\-\/]{5,40})/i) ||
    fullText.match(/(?:n[uú]mero\s+de\s+registro|registro)[:\s]+([A-Z0-9.\-\/]*\d[A-Z0-9.\-\/]*)/i) ||
    fullText.match(/\bMR\d{5,}\b/i);
  if (registrationMatch) {
    result.registration = (registrationMatch[1] || registrationMatch[0]).trim();
    pushField(fields, pages, 'registration', result.registration, 0.8, registrationMatch[0]);
  }

  const requestMatch = fullText.match(
    /(?:n[uú]mero\s+da?\s+solicita[cç][aã]o|solicita[cç][aã]o)[:\s]+([A-Z0-9.\-\/]{5,40})/i,
  );
  if (requestMatch) {
    result.requestNumber = requestMatch[1].trim();
    pushField(fields, pages, 'requestNumber', result.requestNumber, 0.75, requestMatch[0]);
  }

  const categoryMatch = fullText.match(
    /(?:categoria|abrang[eê]ncia\s+profissional)[:\s]+(.+?)(?=\s*(?:abrang[eê]ncia|vig[eê]ncia|data[- ]base|registro|sindicato|cl[aá]usula|cnpj|\n|$))/i,
  );
  if (categoryMatch) {
    result.category = categoryMatch[1].replace(/\s+/g, ' ').trim().replace(/[·•].*$/, '').trim();
    if (result.category.length >= 3) {
      pushField(fields, pages, 'category', result.category, 0.75, categoryMatch[0].slice(0, 220));
    } else {
      delete result.category;
    }
  }

  const territoryMatches = [
    ...fullText.matchAll(
      /\b(?:Estado\s+de\s+|UF[:\s]+)?(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/gi,
    ),
  ];
  if (territoryMatches.length) {
    result.territory = [...new Set(territoryMatches.map((m) => m[1].toUpperCase()))].slice(0, 10);
    pushField(
      fields,
      pages,
      'territory',
      result.territory.join(', '),
      0.7,
      `UFs identificadas: ${result.territory.join(', ')}`,
    );
  }

  const partyRegex = /sindicato[^\n·•|]{5,140}/gi;
  const parties = [...fullText.matchAll(partyRegex)]
    .map((m) => {
      let value = m[0].replace(/\s+/g, ' ').replace(/\s*CNPJ.*$/i, '').trim();
      const second = value.search(/\sSindicato\b/i);
      if (second > 0) value = value.slice(0, second).trim();
      return value;
    })
    .filter((p) => p.length >= 12)
    .filter((p, idx, arr) => arr.findIndex((x) => x.toLowerCase() === p.toLowerCase()) === idx)
    .slice(0, 8);
  if (parties.length) {
    result.parties = parties;
    for (const party of parties) {
      pushField(fields, pages, 'party', party, 0.72, party);
    }
  }

  const cnpjRegex = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
  const cnpjs = [...fullText.matchAll(cnpjRegex)]
    .map((m) => m[0])
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .slice(0, 10);
  if (cnpjs.length) {
    result.cnpjs = cnpjs;
    for (const cnpj of cnpjs) {
      pushField(fields, pages, 'cnpj', cnpj, 0.88, cnpj);
    }
  }

  return result;
}
