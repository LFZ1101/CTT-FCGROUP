import type { PrismaClient } from '@prisma/client';

const DIM = 256;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashToken(token: string): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function embedText(text: string): number[] {
  const vec = new Float64Array(DIM);
  const toks = normalize(text)
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
  if (!toks.length) return Array.from(vec);
  for (const t of toks) {
    const h = hashToken(t);
    vec[h % DIM] += h & 1 ? 1 : -1;
    const h2 = hashToken(t.slice(0, Math.min(4, t.length)));
    vec[h2 % DIM] += 0.5 * (h2 & 1 ? 1 : -1);
  }
  let norm = 0;
  for (let i = 0; i < DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec, (x) => Number((x / norm).toFixed(6)));
}

function payload(text: string, title?: string | null, clauseNumber?: string | null, category?: string | null) {
  const blob = [clauseNumber, title, category, text].filter(Boolean).join(' ');
  return { embedding: embedText(blob), modelVersion: 'hashing-v1' };
}

/** Indexa cláusulas do instrumento (e documento) como DocumentChunk para RAG 3J. */
export async function indexChunksForDocument(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    documentId: string;
    instrumentId?: string | null;
  },
) {
  const doc = await prisma.discoveredDocument.findFirst({
    where: { id: input.documentId, tenantId: input.tenantId },
    include: {
      clauses: { orderBy: { createdAt: 'asc' } },
      pages: { orderBy: { pageNumber: 'asc' } },
    },
  });
  if (!doc) return 0;

  await prisma.documentChunk.deleteMany({
    where: { tenantId: input.tenantId, discoveredDocumentId: input.documentId },
  });

  if (doc.clauses.length) {
    await prisma.documentChunk.createMany({
      data: doc.clauses.map((c) => ({
        tenantId: input.tenantId,
        discoveredDocumentId: input.documentId,
        instrumentId: input.instrumentId || doc.instrumentId,
        documentClauseId: c.id,
        pageStart: c.startPage,
        pageEnd: c.endPage,
        clauseNumber: c.number,
        title: c.title,
        category: String(c.category),
        text: c.text,
        metadata: { source: 'DocumentClause', evidence: c.evidence },
        ...payload(c.text, c.title, c.number, String(c.category)),
      })),
    });
    return doc.clauses.length;
  }

  if (doc.pages.length) {
    await prisma.documentChunk.createMany({
      data: doc.pages.map((p) => ({
        tenantId: input.tenantId,
        discoveredDocumentId: input.documentId,
        instrumentId: input.instrumentId || doc.instrumentId,
        pageStart: p.pageNumber,
        pageEnd: p.pageNumber,
        title: `Página ${p.pageNumber}`,
        text: p.text,
        metadata: { source: 'DocumentPage' },
        ...payload(p.text, `Página ${p.pageNumber}`),
      })),
    });
    return doc.pages.length;
  }

  return 0;
}

export async function indexChunksForInstrument(
  prisma: PrismaClient,
  input: { tenantId: string; instrumentId: string },
) {
  const instrument = await prisma.collectiveInstrument.findFirst({
    where: { id: input.instrumentId, tenantId: input.tenantId },
    include: {
      clauses: { orderBy: { createdAt: 'asc' } },
      discoveredDocuments: { select: { id: true } },
    },
  });
  if (!instrument) return 0;

  await prisma.documentChunk.deleteMany({
    where: { tenantId: input.tenantId, instrumentId: input.instrumentId },
  });

  if (!instrument.clauses.length) return 0;

  await prisma.documentChunk.createMany({
    data: instrument.clauses.map((c) => ({
      tenantId: input.tenantId,
      instrumentId: input.instrumentId,
      discoveredDocumentId: instrument.discoveredDocuments[0]?.id ?? null,
      instrumentClauseId: c.id,
      pageStart: c.page,
      pageEnd: c.page,
      clauseNumber: c.number,
      title: c.title,
      category: c.category,
      text: c.text,
      metadata: { source: 'InstrumentClause' },
      ...payload(c.text, c.title, c.number, c.category),
    })),
  });

  return instrument.clauses.length;
}
