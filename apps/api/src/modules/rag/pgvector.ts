import type { PrismaClient } from '@prisma/client';

let cached: boolean | null = null;

export async function hasPgvector(prisma: PrismaClient): Promise<boolean> {
  if (cached != null) return cached;
  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) AS "exists"
    `;
    cached = Boolean(rows[0]?.exists);
  } catch {
    cached = false;
  }
  return cached;
}

/** Formata vetor JS no literal pgvector: [0.1,0.2,...] */
export function toVectorLiteral(values: number[]): string {
  return `[${values.map((v) => Number(v).toFixed(6)).join(',')}]`;
}

export async function syncChunkEmbeddingVec(
  prisma: PrismaClient,
  chunkId: string,
  embedding: number[],
): Promise<boolean> {
  if (!(await hasPgvector(prisma))) return false;
  const lit = toVectorLiteral(embedding);
  await prisma.$executeRawUnsafe(
    `UPDATE "DocumentChunk" SET "embeddingVec" = $1::vector WHERE id = $2`,
    lit,
    chunkId,
  );
  return true;
}

/** Após indexar chunks JSON, espelha embedding → embeddingVec quando a extensão existe. */
export async function syncTenantChunkVecs(
  prisma: PrismaClient,
  where: { tenantId: string; discoveredDocumentId?: string; instrumentId?: string },
): Promise<number> {
  if (!(await hasPgvector(prisma))) return 0;
  const chunks = await prisma.documentChunk.findMany({
    where: {
      tenantId: where.tenantId,
      ...(where.discoveredDocumentId ? { discoveredDocumentId: where.discoveredDocumentId } : {}),
      ...(where.instrumentId ? { instrumentId: where.instrumentId } : {}),
    },
    select: { id: true, embedding: true },
    take: 5000,
  });
  let n = 0;
  for (const c of chunks) {
    if (!Array.isArray(c.embedding) || !c.embedding.length) continue;
    if (await syncChunkEmbeddingVec(prisma, c.id, c.embedding as number[])) n += 1;
  }
  return n;
}

export type PgvectorHit = { id: string; semantic: number };

/**
 * Busca semântica nativa (cosine distance <=> ).
 * Retorna score semântico em [0,1] aproximado: 1 - distance (clamp).
 */
export async function searchByPgvector(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    embedding: number[];
    limit?: number;
    documentId?: string;
    instrumentId?: string;
  },
): Promise<PgvectorHit[]> {
  if (!(await hasPgvector(prisma))) return [];
  const lit = toVectorLiteral(input.embedding);
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; dist: number }>>(
    `
    SELECT id, ("embeddingVec" <=> $1::vector) AS dist
    FROM "DocumentChunk"
    WHERE "tenantId" = $2
      AND "embeddingVec" IS NOT NULL
      AND ($3::text IS NULL OR "discoveredDocumentId" = $3)
      AND ($4::text IS NULL OR "instrumentId" = $4)
    ORDER BY "embeddingVec" <=> $1::vector
    LIMIT $5
    `,
    lit,
    input.tenantId,
    input.documentId ?? null,
    input.instrumentId ?? null,
    limit,
  );

  return rows.map((r) => ({
    id: r.id,
    semantic: Math.max(0, Math.min(1, 1 - Number(r.dist))),
  }));
}
