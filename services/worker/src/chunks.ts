import type { PrismaClient } from '@prisma/client';

/** Indexa cláusulas do instrumento (e documento) como DocumentChunk para RAG 3I. */
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
        modelVersion: 'heuristic-v1',
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
        modelVersion: 'heuristic-v1',
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
      modelVersion: 'heuristic-v1',
    })),
  });

  return instrument.clauses.length;
}
